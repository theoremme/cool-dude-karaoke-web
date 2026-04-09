import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import YouTubeEmbed from './YouTubeEmbed';

function formatCountdown(seconds) {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const VideoPlayer = ({ isHost = false, playbackController, popoutManager, playbackMode, socket, roomId, ampedDisconnected, onSwitchToWeb }) => {
  const { currentItem, isPlaying, playNext, setPlaying } = usePlaylist();
  const ytRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    mode, timerSeconds, timerDisabled, popupBlocked, popupClosed,
    playSong, skip, disableTimer, resumePlaylist, reopenPopup, retryPopup, handleEmbedBlocked: onEmbedBlocked,
  } = playbackController || {};

  // Trigger playSong when currentItem changes (skip in amped mode — Electron handles it)
  useEffect(() => {
    if (!currentItem || !playSong || playbackMode === 'amped') return;
    // If current song isn't embeddable in unplugged mode, skip it
    if (playbackMode === 'unplugged' && !currentItem.embeddable) {
      playNext();
      return;
    }
    playSong(currentItem);
  }, [currentItem?.videoId, playbackMode]);

  // When currentItem changes, reset local state
  useEffect(() => {
    if (!currentItem) return;
    setError(null);
    setLoading(true);
  }, [currentItem?.videoId]);

  // Sync play/pause with YouTube player (iframe mode only)
  useEffect(() => {
    if (mode !== 'iframe' || !currentItem || !ytRef.current) return;
    if (isPlaying) ytRef.current.play();
    else ytRef.current.pause();
  }, [isPlaying, currentItem, mode]);

  const handleReady = () => setLoading(false);
  const handleEnded = () => playNext();
  const handlePlay = () => { setPlaying(true); setLoading(false); };
  const handlePause = () => setPlaying(false);

  const handleEmbedBlocked = () => {
    setLoading(false);
    // Switch to YouTube popup/popout mode via playback controller
    if (onEmbedBlocked) {
      onEmbedBlocked();
    } else {
      setError('This video can\'t be embedded.');
    }
  };

  const handleEmbedError = () => {
    setLoading(false);
    setError('YouTube player error.');
  };

  const handleTogglePopout = useCallback(() => {
    if (!popoutManager) return;
    if (popoutManager.isOpen()) {
      popoutManager.close();
      // Re-trigger playSong to switch back to iframe mode
      if (currentItem) playSong(currentItem);
    } else {
      popoutManager.open();
      // Re-trigger playSong to switch to popout mode
      if (currentItem) setTimeout(() => playSong(currentItem), 300);
    }
  }, [popoutManager, currentItem, playSong]);

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

  // Amped disconnected — desktop app dropped, countdown to fallback
  if (playbackMode === 'amped' && ampedDisconnected) {
    return (
      <div className="video-player">
        <div className="player-popout-placeholder" style={{
          background: 'radial-gradient(ellipse at center, rgba(255,68,102,0.1) 0%, rgba(0,0,0,0.95) 70%)',
        }}>
          <div className="popout-placeholder-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8, color: '#ff4466' }}>⚡</div>
            <div style={{
              color: '#ff4466', fontSize: 16, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 2, marginBottom: 8,
            }}>
              Amped Disconnected
            </div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Waiting for reconnection...
            </div>
            {ampedDisconnected.secondsLeft > 0 && (
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, color: '#ff4466',
                textShadow: '0 0 20px rgba(255,68,102,0.5)',
                marginBottom: 16,
              }}>
                {ampedDisconnected.secondsLeft}s
              </div>
            )}
            <button className="btn-neon btn-small" onClick={onSwitchToWeb} style={{ borderColor: '#ff4466', color: '#ff4466' }}>
              Switch to Web Player Now
            </button>
          </div>
        </div>
        {currentItem && (
          <div className="player-info">
            <div className="now-playing-label" style={{ color: '#ff4466' }}>PLAYBACK PAUSED</div>
            <div className="now-playing-title">{currentItem.title}</div>
            <div className="now-playing-channel">{currentItem.channelName}</div>
          </div>
        )}
      </div>
    );
  }

  // Amped mode — Electron desktop app owns playback
  if (playbackMode === 'amped') {
    const sendCommand = (command) => {
      if (socket && roomId) {
        socket.emit('playback-command', { roomId, command });
      }
    };

    return (
      <div className="video-player">
        <div className="player-popout-placeholder" style={{
          background: 'radial-gradient(ellipse at center, rgba(157,0,255,0.08) 0%, rgba(0,0,0,0.95) 70%)',
        }}>
          <div className="popout-placeholder-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8, color: '#ff40ff' }}>⚡</div>
            <div style={{
              color: '#ff40ff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 2, marginBottom: 8,
              textShadow: '0 0 10px rgba(255, 64, 255, 0.5)',
            }}>
              Amped Mode
            </div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Playing on the desktop app
            </div>
            {currentItem && (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
                  {currentItem.title}
                </div>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>{currentItem.channelName}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn-neon btn-small" onClick={() => sendCommand(isPlaying ? 'pause' : 'play')}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button className="btn-neon btn-small" onClick={() => sendCommand('skip')}>
                    ⏭ Skip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {currentItem && (
          <div className="player-info">
            <div className="now-playing-label">NOW PLAYING — AMPED</div>
            <div className="now-playing-title">{currentItem.title}</div>
            <div className="now-playing-channel">{currentItem.channelName}</div>
          </div>
        )}
      </div>
    );
  }

  // Popup blocked state
  if (mode === 'popup-blocked') {
    return (
      <div className="video-player">
        <div className="player-popout-placeholder">
          <div className="popout-placeholder-content">
            <div className="popout-icon" style={{ color: '#F56F27' }}>!</div>
            <div className="popout-label">Popup was blocked</div>
            <div className="popout-title" style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              Your browser blocked the video window. Allow popups and try again.
            </div>
            <button className="btn-neon btn-small" onClick={retryPopup}>
              Open Song in New Window
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

  // YouTube modes (popout-youtube or popup-youtube) — show countdown
  if (mode === 'popout-youtube' || mode === 'popup-youtube') {
    return (
      <div className="video-player">
        <div className="player-popout-placeholder" style={{ background: 'radial-gradient(ellipse at center, rgba(0,200,255,0.06) 0%, rgba(0,0,0,0.95) 70%)' }}>
          <div className="popout-placeholder-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>♪</div>
            <div className="popout-title" style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>
              {currentItem.title}
            </div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>{currentItem.channelName}</div>
            {timerDisabled ? (
              <>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                  Timer paused — hit <strong style={{ color: '#00c8ff' }}>Resume Playlist</strong> when you're ready to keep going
                </div>
                <button className="btn-neon btn-small" onClick={resumePlaylist}>Resume Playlist</button>
              </>
            ) : timerSeconds != null ? (
              <>
                <div style={{ color: '#00c8ff', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                  Next song in
                </div>
                <div style={{
                  fontFamily: 'Orbitron', fontSize: '3rem', fontWeight: 900, color: '#00c8ff',
                  textShadow: '0 0 20px rgba(0,200,255,0.5), 0 0 40px rgba(0,200,255,0.2)',
                  marginBottom: 16,
                }}>
                  {formatCountdown(timerSeconds)}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn-neon btn-small" onClick={disableTimer}>Disable Timer</button>
                  <button className="btn-neon btn-small" onClick={skip}>Skip Now</button>
                </div>
              </>
            ) : null}
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

  // Popout embed mode — video plays in popout, main app shows status
  if (mode === 'popout-embed') {
    return (
      <div className="video-player">
        <div className="player-popout-placeholder">
          <div className="popout-placeholder-content">
            <div className="popout-icon">⧉</div>
            <div className="popout-label">Playing in popout window</div>
            <div className="popout-title">{currentItem.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-neon btn-small" onClick={handleTogglePopout}>
                Return to inline
              </button>
              <button className="btn-neon btn-small" onClick={skip}>
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

  // In unplugged mode, if current song is non-embeddable, skip it
  if (playbackMode === 'unplugged' && currentItem && !currentItem.embeddable) {
    // Trigger skip on next tick to avoid render-during-render
    setTimeout(() => playNext(), 0);
    return (
      <div className="video-player">
        <div className="player-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">♪</div>
            <p>Skipping non-embeddable song...</p>
          </div>
        </div>
      </div>
    );
  }

  // Default: iframe mode — IFrame embed in main app
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
              <div style={{ color: '#00c8ff', fontSize: 16, fontWeight: 600 }}>
                This video opens in a separate window
              </div>
            </div>
          )}
          <button
            className="btn-popout-overlay"
            onClick={handleTogglePopout}
            title={popoutManager?.isOpen() ? 'Close popout' : 'Open in popout window'}
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
            <button className="btn-neon btn-small" onClick={skip}>
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
