import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import YouTubeEmbed from './YouTubeEmbed';

const MobilePlayer = ({ onExit }) => {
  const { currentItem, isPlaying, playNext, setPlaying, togglePlay, playIndex, items } = usePlaylist();
  const containerRef = useRef(null);
  const ytRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);

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

  // When currentItem changes, reset state
  useEffect(() => {
    if (!currentItem) return;
    setError(null);
    setLoading(true);
  }, [currentItem?.videoId]);

  // Sync play/pause
  useEffect(() => {
    if (!currentItem || !ytRef.current) return;
    if (isPlaying) ytRef.current.play();
    else ytRef.current.pause();
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

  const handleReady = () => setLoading(false);
  const handleEnded = () => playNext();
  const handlePlay = () => { setPlaying(true); setLoading(false); };
  const handlePause = () => setPlaying(false);

  const handleEmbedBlocked = () => {
    setLoading(false);
    setError('Can\'t play this one in-app');
  };

  const handleEmbedError = () => {
    setLoading(false);
    setError('YouTube player error');
  };

  const handleTogglePlay = () => {
    togglePlay();
    resetHideTimer();
  };

  const canEmbed = currentItem?.embeddable !== false;

  return (
    <div ref={containerRef} className="mobile-player" onClick={handleTap}>
      {canEmbed && currentItem && (
        <YouTubeEmbed
          key={currentItem.videoId}
          ref={ytRef}
          videoId={currentItem.videoId}
          controls={false}
          onReady={handleReady}
          onEnded={handleEnded}
          onPlay={handlePlay}
          onPause={handlePause}
          onEmbedBlocked={handleEmbedBlocked}
          onError={handleEmbedError}
        />
      )}

      {!canEmbed && currentItem && (
        <div className="mobile-player-loading">
          <div className="mobile-player-phrase" style={{ color: '#F56F27' }}>Can't play this one in-app</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-neon btn-small" onClick={(e) => {
              e.stopPropagation();
              window.open(`https://www.youtube.com/watch?v=${currentItem.videoId}`, '_blank');
            }}>
              Watch on YouTube
            </button>
            <button className="btn-neon btn-small" onClick={(e) => { e.stopPropagation(); playNext(); }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {loading && canEmbed && (
        <div className="mobile-player-loading">
          <div className="player-spinner"></div>
        </div>
      )}

      {error && canEmbed && (
        <div className="mobile-player-loading">
          <div className="mobile-player-phrase" style={{ color: '#F56F27' }}>{error}</div>
          <button className="btn-neon btn-small" onClick={(e) => { e.stopPropagation(); playNext(); }}>
            Skip
          </button>
        </div>
      )}

      {showControls && !loading && canEmbed && (
        <div className="mobile-player-controls" onClick={(e) => e.stopPropagation()}>
          <button className="mobile-player-btn mobile-player-exit" onClick={handleExit}>
            ✕
          </button>

          <div className="mobile-player-center">
            <button className="mobile-player-btn mobile-player-skip" onClick={() => { playNext(); resetHideTimer(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <button className="mobile-player-btn mobile-player-playpause" onClick={handleTogglePlay}>
              {isPlaying
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              }
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
