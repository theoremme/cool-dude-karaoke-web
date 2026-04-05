import React, { useEffect, useRef, useState } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const VideoPlayer = ({ isHost = false }) => {
  const { currentItem, isPlaying, playNext, setPlaying } = usePlaylist();
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load new video when currentItem changes
  useEffect(() => {
    if (!currentItem || !videoRef.current) return;

    setError(null);
    setLoading(true);

    const video = videoRef.current;
    video.src = `/api/stream/${currentItem.videoId}`;
    video.load();
  }, [currentItem?.videoId]);

  // Sync play/pause
  useEffect(() => {
    if (!videoRef.current || !currentItem) return;
    const video = videoRef.current;

    if (isPlaying && video.paused && video.readyState >= 2) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, currentItem]);

  const handleCanPlay = () => {
    setLoading(false);
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleEnded = () => {
    playNext();
  };

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
