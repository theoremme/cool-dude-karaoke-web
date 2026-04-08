import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import YouTubeEmbed from './YouTubeEmbed';

const PopoutPlayer = () => {
  const [searchParams] = useSearchParams();
  const [videoId, setVideoId] = useState(searchParams.get('v'));
  const [loading, setLoading] = useState(true);
  const ytRef = useRef(null);

  // Listen for postMessage commands from parent window
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;
      const { type, videoId: newVideoId } = event.data || {};

      switch (type) {
        case 'LOAD_VIDEO':
          if (newVideoId) {
            setVideoId(newVideoId);
            setLoading(true);
          }
          break;
        case 'PLAY':
          ytRef.current?.play();
          break;
        case 'PAUSE':
          ytRef.current?.pause();
          break;
        case 'SKIP':
          // Parent handles skip logic — just notify
          sendToParent({ type: 'VIDEO_ENDED' });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function sendToParent(msg) {
    try {
      window.opener?.postMessage(msg, window.location.origin);
    } catch {
      // Parent may be closed or cross-origin
    }
  }

  const handleReady = () => {
    setLoading(false);
    sendToParent({ type: 'PLAYER_READY' });
  };

  const handleEnded = () => {
    sendToParent({ type: 'VIDEO_ENDED' });
  };

  const handlePlay = () => {
    sendToParent({ type: 'PLAYBACK_STATE', state: 'playing' });
  };

  const handlePause = () => {
    sendToParent({ type: 'PLAYBACK_STATE', state: 'paused' });
  };

  const handleEmbedBlocked = () => {
    setLoading(false);
    sendToParent({ type: 'EMBED_BLOCKED', videoId });
  };

  const handleError = () => {
    setLoading(false);
    sendToParent({ type: 'PLAYER_ERROR', videoId });
  };

  if (!videoId) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#00c8ff', fontFamily: 'system-ui',
      }}>
        Waiting for video...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <YouTubeEmbed
        key={videoId}
        ref={ytRef}
        videoId={videoId}
        controls={true}
        onReady={handleReady}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onEmbedBlocked={handleEmbedBlocked}
        onError={handleError}
      />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)', gap: 12,
          color: '#00c8ff', fontFamily: 'system-ui',
        }}>
          <div className="player-spinner" style={{
            width: 32, height: 32,
            border: '3px solid rgba(0,200,255,0.2)',
            borderTopColor: '#00c8ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Loading next song...
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .youtube-embed-container, .youtube-embed-container iframe {
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
    </div>
  );
};

export default PopoutPlayer;
