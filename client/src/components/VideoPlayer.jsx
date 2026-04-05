import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const POPOUT_HTML = (videoSrc, title) => `<!DOCTYPE html>
<html><head>
<title>${title.replace(/"/g, '&quot;')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; overflow: hidden; }
  video { width: 100vw; height: 100vh; object-fit: contain; }
</style>
</head><body>
<video id="v" src="${videoSrc}" autoplay controls></video>
<script>
  const video = document.getElementById('v');
  video.onended = () => window.opener?.postMessage({ type: 'popout-ended' }, '*');
  video.onplay = () => window.opener?.postMessage({ type: 'popout-play' }, '*');
  video.onpause = () => window.opener?.postMessage({ type: 'popout-pause' }, '*');
  video.onerror = () => window.opener?.postMessage({ type: 'popout-error' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data.type === 'popout-load') {
      video.src = e.data.src;
      document.title = e.data.title;
      video.load();
      if (e.data.startTime) {
        video.addEventListener('canplay', function seek() {
          video.currentTime = e.data.startTime;
          video.removeEventListener('canplay', seek);
        });
      }
    }
    if (e.data.type === 'popout-play-cmd') video.play();
    if (e.data.type === 'popout-pause-cmd') video.pause();
    if (e.data.type === 'popout-get-time') {
      window.opener?.postMessage({ type: 'popout-time', currentTime: video.currentTime }, '*');
    }
  });
  window.onbeforeunload = () => {
    window.opener?.postMessage({ type: 'popout-closed', currentTime: video.currentTime }, '*');
  };
</script>
</body></html>`;

const VideoPlayer = ({ isHost = false }) => {
  const { currentItem, isPlaying, playNext, setPlaying } = usePlaylist();
  const videoRef = useRef(null);
  const popoutRef = useRef(null);
  const popoutTimeRef = useRef(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [poppedOut, setPoppedOut] = useState(false);

  // Listen for messages from popout window
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data?.type?.startsWith('popout-')) return;
      switch (e.data.type) {
        case 'popout-ended':
          playNext();
          break;
        case 'popout-play':
          setPlaying(true);
          break;
        case 'popout-pause':
          setPlaying(false);
          break;
        case 'popout-error':
          setError('Playback error in popout window.');
          break;
        case 'popout-time':
          popoutTimeRef.current = e.data.currentTime || 0;
          break;
        case 'popout-closed':
          popoutTimeRef.current = e.data.currentTime || 0;
          setPoppedOut(false);
          popoutRef.current = null;
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playNext, setPlaying]);

  // When currentItem changes, update either inline video or popout
  useEffect(() => {
    if (!currentItem) return;

    setError(null);
    setLoading(true);

    if (poppedOut && popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.postMessage({
        type: 'popout-load',
        src: `/api/stream/${currentItem.videoId}`,
        title: currentItem.title,
      }, '*');
      setLoading(false);
    } else if (videoRef.current) {
      const video = videoRef.current;
      video.src = `/api/stream/${currentItem.videoId}`;
      video.load();
    }
  }, [currentItem?.videoId, poppedOut]);

  // Sync play/pause for inline player
  useEffect(() => {
    if (poppedOut) {
      if (popoutRef.current && !popoutRef.current.closed) {
        popoutRef.current.postMessage({
          type: isPlaying ? 'popout-play-cmd' : 'popout-pause-cmd',
        }, '*');
      }
      return;
    }
    if (!videoRef.current || !currentItem) return;
    const video = videoRef.current;

    if (isPlaying && video.paused && video.readyState >= 2) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, currentItem, poppedOut]);

  // Check if popout was closed externally
  useEffect(() => {
    if (!poppedOut) return;
    const check = setInterval(() => {
      if (!popoutRef.current || popoutRef.current.closed) {
        setPoppedOut(false);
        popoutRef.current = null;
      }
    }, 500);
    return () => clearInterval(check);
  }, [poppedOut]);

  const handleCanPlay = () => {
    setLoading(false);
    if (videoRef.current && popoutTimeRef.current > 0) {
      videoRef.current.currentTime = popoutTimeRef.current;
      popoutTimeRef.current = 0;
    }
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleEnded = () => playNext();
  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);

  const handleError = () => {
    setLoading(false);
    setError('Failed to load video.');
  };

  const handleWatchOnYouTube = () => {
    if (currentItem) {
      window.open(`https://www.youtube.com/watch?v=${currentItem.videoId}`, '_blank');
    }
  };

  const handlePopout = useCallback(() => {
    if (!currentItem) return;

    // Capture current time from inline player before popping out
    const startTime = videoRef.current?.currentTime || 0;

    const videoSrc = `/api/stream/${currentItem.videoId}`;
    const html = POPOUT_HTML(videoSrc, currentItem.title);

    const popup = window.open('', 'karaoke-popout', 'width=960,height=540,resizable=yes');
    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
      return;
    }

    popup.document.write(html);
    popup.document.close();
    popoutRef.current = popup;
    setPoppedOut(true);

    // Send the start time to the popout once it's ready
    setTimeout(() => {
      popup.postMessage({
        type: 'popout-load',
        src: videoSrc,
        title: currentItem.title,
        startTime,
      }, '*');
    }, 500);

    // Pause inline video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  }, [currentItem]);

  const handlePopback = useCallback(() => {
    // Request final time from popout before closing
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.postMessage({ type: 'popout-get-time' }, '*');
      // Small delay to receive the time response before closing
      setTimeout(() => {
        if (popoutRef.current && !popoutRef.current.closed) {
          popoutRef.current.close();
        }
        popoutRef.current = null;
        setPoppedOut(false);
      }, 100);
    } else {
      popoutRef.current = null;
      setPoppedOut(false);
    }
  }, []);

  if (!currentItem) {
    return (
      <div className="video-player">
        <div className="player-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">♪</div>
            <p>Add songs and hit play to start the party!</p>
          </div>
        </div>
      </div>
    );
  }

  if (poppedOut) {
    return (
      <div className="video-player">
        <div className="player-popout-placeholder">
          <div className="popout-placeholder-content">
            <div className="popout-icon">⧉</div>
            <div className="popout-label">Playing in popout window</div>
            <div className="popout-title">{currentItem.title}</div>
            <button className="btn-neon btn-small" onClick={handlePopback}>
              ← Return to main window
            </button>
          </div>
        </div>
        <div className="player-info">
          <div className="now-playing-label">NOW PLAYING</div>
          <div className="now-playing-title">{currentItem.title}</div>
          <div className="now-playing-channel">{currentItem.channelName}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="player-wrapper">
        <div className="player-container">
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', background: '#000' }}
            onCanPlay={handleCanPlay}
            onEnded={handleEnded}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleError}
            controls
          />
          <button
            className="btn-popout-overlay"
            onClick={handlePopout}
            title="Pop out player"
          >
            ⧉
          </button>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)', color: '#00c8ff', fontSize: 16,
            }}>
              Loading video...
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="error-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>{error}</span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn-neon btn-small" onClick={handleWatchOnYouTube}>
              Watch on YouTube
            </button>
            <button className="btn-neon btn-small" onClick={() => playNext()}>
              Skip
            </button>
          </div>
        </div>
      )}
      <div className="player-info">
        <div className="now-playing-label">NOW PLAYING</div>
        <div className="now-playing-title">{currentItem.title}</div>
        <div className="now-playing-channel">{currentItem.channelName}</div>
      </div>
    </div>
  );
};

export default VideoPlayer;
