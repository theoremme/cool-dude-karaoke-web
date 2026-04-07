import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import YouTubeEmbed from './YouTubeEmbed';

const VideoPlayer = ({ isHost = false }) => {
  const { currentItem, isPlaying, playNext, setPlaying } = usePlaylist();
  const ytRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [poppedOut, setPoppedOut] = useState(false);

  // When currentItem changes, reset state
  useEffect(() => {
    if (!currentItem) return;
    setError(null);
    setLoading(true);
  }, [currentItem?.videoId]);

  // Sync play/pause with YouTube player
  useEffect(() => {
    if (poppedOut || !currentItem || !ytRef.current) return;
    if (isPlaying) ytRef.current.play();
    else ytRef.current.pause();
  }, [isPlaying, currentItem, poppedOut]);

  const handleReady = () => setLoading(false);
  const handleEnded = () => playNext();
  const handlePlay = () => { setPlaying(true); setLoading(false); };
  const handlePause = () => setPlaying(false);

  const handleEmbedBlocked = () => {
    setLoading(false);
    setError('This video can\'t be played in the app.');
  };

  const handleEmbedError = () => {
    setLoading(false);
    setError('YouTube player error.');
  };

  const handleWatchOnYouTube = () => {
    if (currentItem) {
      window.open(`https://www.youtube.com/watch?v=${currentItem.videoId}`, '_blank');
    }
  };

  const handlePopout = useCallback(() => {
    if (!currentItem) return;
    window.open(
      `https://www.youtube.com/watch?v=${currentItem.videoId}`,
      'karaoke-popout',
      'width=960,height=540,resizable=yes'
    );
    setPoppedOut(true);
  }, [currentItem]);

  const handlePopback = useCallback(() => {
    setPoppedOut(false);
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
            <div className="popout-label">Playing on YouTube</div>
            <div className="popout-title">{currentItem.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-neon btn-small" onClick={handlePopback}>
                Return to embed
              </button>
              <button className="btn-neon btn-small" onClick={() => playNext()}>
                Skip
              </button>
            </div>
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
          {currentItem.embeddable !== false ? (
            <YouTubeEmbed
              key={currentItem.videoId}
              ref={ytRef}
              videoId={currentItem.videoId}
              onReady={handleReady}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onEmbedBlocked={handleEmbedBlocked}
              onError={handleEmbedError}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#000',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{ color: '#F56F27', fontSize: 16, fontWeight: 600 }}>
                This video can't be embedded
              </div>
              <button className="btn-neon btn-small" onClick={handleWatchOnYouTube}>
                Watch on YouTube
              </button>
              <button className="btn-neon btn-small" onClick={() => playNext()}>
                Skip
              </button>
            </div>
          )}
          <button
            className="btn-popout-overlay"
            onClick={handlePopout}
            title="Open on YouTube"
          >
            ⧉
          </button>
          {loading && currentItem.embeddable !== false && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', gap: 14,
            }}>
              <div className="player-spinner"></div>
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
