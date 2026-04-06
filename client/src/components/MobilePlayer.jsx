import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const LOADING_PHRASES = [
  "Wheezin' the juice!",
  'Hold on to your butts.',
  'Party on, Wayne.',
  'Bueller? Bueller?',
  "I'll be back.",
  'Be excellent to each other.',
  "Rollin' with the homies.",
];

const MobilePlayer = ({ onExit }) => {
  const { currentItem, isPlaying, playNext, setPlaying, togglePlay, playIndex, items } = usePlaylist();
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);
  const [loadingPhrase] = useState(() => LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

  // Enter fullscreen + lock landscape on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const goFullscreen = async () => {
      try {
        await el.requestFullscreen();
        await screen.orientation?.lock?.('landscape').catch(() => {});
      } catch (e) {
        // Fullscreen may be blocked — still show the player
      }
    };
    goFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        screen.orientation?.unlock?.();
        onExit();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [onExit]);

  // Start playback if nothing is playing
  useEffect(() => {
    if (!currentItem && items.length > 0) {
      playIndex(0);
    }
  }, []);

  // Load video when currentItem changes
  useEffect(() => {
    if (!currentItem || !videoRef.current) return;
    setError(null);
    setLoading(true);
    videoRef.current.src = `/api/stream/${currentItem.videoId}`;
    videoRef.current.load();
  }, [currentItem?.videoId]);

  // Sync play/pause
  useEffect(() => {
    if (!videoRef.current || !currentItem) return;
    if (isPlaying && videoRef.current.paused && videoRef.current.readyState >= 2) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying, currentItem]);

  // Auto-hide controls after 3s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  const handleTap = () => {
    if (showControls) {
      setShowControls(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  };

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      onExit();
    }
  };

  const handleCanPlay = () => {
    setLoading(false);
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleEnded = () => playNext();
  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleError = () => {
    setLoading(false);
    setError('Failed to load video');
  };

  return (
    <div ref={containerRef} className="mobile-player" onClick={handleTap}>
      <video
        ref={videoRef}
        className="mobile-player-video"
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        playsInline
      />

      {loading && (
        <div className="mobile-player-loading">
          <div className="player-spinner"></div>
          <div className="mobile-player-phrase">{loadingPhrase}</div>
        </div>
      )}

      {error && (
        <div className="mobile-player-loading">
          <div className="mobile-player-phrase" style={{ color: '#F56F27' }}>{error}</div>
          <button className="btn-neon btn-small" onClick={(e) => { e.stopPropagation(); playNext(); }}>
            Skip
          </button>
        </div>
      )}

      {showControls && !loading && (
        <div className="mobile-player-controls" onClick={(e) => e.stopPropagation()}>
          <button className="mobile-player-btn mobile-player-exit" onClick={handleExit}>
            ✕
          </button>

          <div className="mobile-player-center">
            <button className="mobile-player-btn mobile-player-skip" onClick={() => { playNext(); resetHideTimer(); }}>
              ⏭
            </button>
            <button className="mobile-player-btn mobile-player-playpause" onClick={() => { togglePlay(); resetHideTimer(); }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>

          {currentItem && (
            <div className="mobile-player-info">
              <div className="mobile-player-title">{currentItem.title}</div>
              <div className="mobile-player-channel">{currentItem.channelName}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobilePlayer;
