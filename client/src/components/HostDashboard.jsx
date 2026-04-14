import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import VibeSuggestions from './VibeSuggestions';
import VideoPlayer from './VideoPlayer';
import MobilePlayer from './MobilePlayer';
import PlaylistQueue from './PlaylistQueue';
import PlaylistSync from './PlaylistSync';
import QRCodeDisplay from './QRCodeDisplay';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { usePlaybackController } from '../hooks/usePlaybackController';
import { PopoutManager } from '../services/popoutManager';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function loadHostState(inviteCode) {
  try {
    const saved = sessionStorage.getItem(`karaoke-host-${inviteCode}`);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

const HostDashboard = () => {
  const { inviteCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connectSocket, setPlaylist, setPlaybackState, setPlaybackMode: setContextPlaybackMode, clearLocal, items, currentItem } = usePlaylist();
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const isMobile = useIsMobile();

  const savedState = loadHostState(inviteCode);
  const [room, setRoom] = useState(null);
  const [playbackMode, setPlaybackModeState] = useState('unplugged');
  const setPlaybackMode = useCallback((mode) => {
    setPlaybackModeState(mode);
    setContextPlaybackMode(mode);
  }, [setContextPlaybackMode]);
  const [ampedDisconnected, setAmpedDisconnected] = useState(null); // { secondsLeft } or null
  const ampedCountdownRef = useRef(null);
  const [results, setResults] = useState(savedState?.results || [])
  const [vibeSuggestions, setVibeSuggestions] = useState(savedState?.vibeSuggestions || []);
  const [loading, setLoading] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [vibeTheme, setVibeTheme] = useState(savedState?.vibeTheme || null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);
  const [guestsExpanded, setGuestsExpanded] = useState(false);
  const [mobilePlayerOpen, setMobilePlayerOpen] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(
    () => !sessionStorage.getItem('karaoke-popup-banner-dismissed')
  );
  const [showPopupHelp, setShowPopupHelp] = useState(false);

  // Playback controller — manages popout window and YouTube timer
  const popoutManagerRef = useRef(null);
  if (!popoutManagerRef.current) popoutManagerRef.current = new PopoutManager();
  const popoutManager = popoutManagerRef.current;

  const { playNext } = usePlaylist();
  const playbackController = usePlaybackController({
    currentItem,
    onAdvance: playNext,
    popoutManager,
  });

  // Clean up popout on unmount
  useEffect(() => {
    return () => popoutManager.close();
  }, [popoutManager]);

  // Broadcast playback mode to other clients (guests see "Playing on YouTube" etc.)
  useEffect(() => {
    if (!socket || !room || !playbackController.mode) return;
    socket.emit('playback-sync', {
      roomId: room.id,
      currentIndex: items.indexOf(currentItem),
      isPlaying: true,
      mode: playbackController.mode,
    });
  }, [playbackController.mode]);

  // Persist search/vibe state
  useEffect(() => {
    try {
      sessionStorage.setItem(`karaoke-host-${inviteCode}`, JSON.stringify({
        results,
        vibeSuggestions,
        vibeTheme,
      }));
    } catch {}
  }, [results, vibeSuggestions, vibeTheme, inviteCode]);

  // Clear stale playlist from previous room on mount
  useEffect(() => {
    clearLocal();
    setPlaylistLoading(true);
  }, [inviteCode]);

  // Fetch room and join via socket
  useEffect(() => {
    api.getRoomByInviteCode(inviteCode)
      .then((data) => {
        if (data.room && !data.room.isActive) {
          navigate(`/closeout/${inviteCode}`);
          return;
        }
        setRoom(data.room);
      })
      .catch((err) => setError(err.message));
  }, [inviteCode]);

  // Connect socket to playlist context and join room (once per connection)
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!isConnected) {
      joinedRef.current = false;
      return;
    }
    if (!socket || !room || joinedRef.current) return;

    connectSocket(socket, room.id, user?.name || 'Host');

    socket.emit('join-room', {
      roomId: room.id,
      userId: user?.id,
      guestName: user?.name || 'Host',
    });
    joinedRef.current = true;
  }, [socket, room, isConnected, user, connectSocket]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('playlist-updated', (playlist) => {
      setPlaylist(playlist);
      setPlaylistLoading(false);
    });

    socket.on('room-updated', (data) => {
      if (data.room) {
        setRoom(data.room);
        if (data.room.playbackMode) setPlaybackMode(data.room.playbackMode);
      }
      if (data.playlist) {
        setPlaylist(data.playlist);
        setPlaylistLoading(false);
      }
      if (data.members) {
        setMembers(data.members.map((m) => ({ ...m, active: true })));
      }
      // Restore last known playback state (e.g. after page refresh)
      if (data.playback) {
        setPlaybackState(data.playback.currentIndex, data.playback.isPlaying);
      }
    });

    socket.on('mode-changed', ({ mode }) => {
      const wasAmped = playbackMode === 'amped';
      setPlaybackMode(mode);
      // Clear disconnect state when mode resolves
      setAmpedDisconnected(null);
      if (ampedCountdownRef.current) {
        clearInterval(ampedCountdownRef.current);
        ampedCountdownRef.current = null;
      }
      // When switching from amped to unplugged, pause and show playlist updating
      if (wasAmped && mode === 'unplugged') {
        setPlaybackState(items.indexOf(currentItem), false);
        setPlaylistLoading(true);
      }
    });

    socket.on('amped-disconnected', ({ secondsUntilFallback }) => {
      setAmpedDisconnected({ secondsLeft: secondsUntilFallback });
      if (ampedCountdownRef.current) clearInterval(ampedCountdownRef.current);
      let seconds = secondsUntilFallback;
      ampedCountdownRef.current = setInterval(() => {
        seconds--;
        setAmpedDisconnected({ secondsLeft: Math.max(0, seconds) });
        if (seconds <= 0) {
          clearInterval(ampedCountdownRef.current);
          ampedCountdownRef.current = null;
        }
      }, 1000);
    });

    socket.on('amped-reconnected', () => {
      setAmpedDisconnected(null);
      if (ampedCountdownRef.current) {
        clearInterval(ampedCountdownRef.current);
        ampedCountdownRef.current = null;
      }
    });

    socket.on('user-joined', (member) => {
      setMembers((prev) => {
        const existing = prev.find((m) => m.id === member.id);
        if (existing) return prev.map((m) => m.id === member.id ? { ...m, active: true, leftAt: null } : m);
        return [...prev, { ...member, active: true }];
      });
    });

    socket.on('user-left', ({ id, guestName }) => {
      setMembers((prev) =>
        prev.map((m) => m.id === id ? { ...m, active: false, leftAt: new Date().toISOString() } : m)
      );
    });

    // Sync playback state from other host sessions (e.g. desktop ↔ mobile)
    socket.on('playback-sync', ({ currentIndex, isPlaying, mode }) => {
      setPlaybackState(currentIndex, isPlaying);
      // mode is used for guest sync; host manages its own mode via playbackController
    });

    // Handle room-inactive on reconnect (mobile wakes up after auto-close)
    socket.on('error', (data) => {
      if (data?.message?.includes('inactive') || data?.message?.includes('not found')) {
        sessionStorage.setItem(`karaoke-closeout-${inviteCode}`, JSON.stringify({
          roomName: room?.name || 'Karaoke Session',
          playlist: items,
          isGuest: false,
        }));
        navigate(`/closeout/${inviteCode}`);
      }
    });

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('playback-sync');
      socket.off('mode-changed');
      socket.off('amped-disconnected');
      socket.off('amped-reconnected');
      socket.off('error');
      if (ampedCountdownRef.current) clearInterval(ampedCountdownRef.current);
    };
  }, [socket, setPlaylist]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(null);
  const countdownRef = useRef(null);

  // Inactivity warning + auto-close listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('inactivity-warning', ({ remainingSeconds }) => {
      setInactivityWarning({ remainingSeconds });
      if (countdownRef.current) clearInterval(countdownRef.current);
      let seconds = remainingSeconds;
      countdownRef.current = setInterval(() => {
        seconds--;
        setInactivityWarning({ remainingSeconds: Math.max(0, seconds) });
        if (seconds <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      }, 1000);
    });

    socket.on('inactivity-cleared', () => {
      setInactivityWarning(null);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    });

    socket.on('room-closed', (data) => {
      sessionStorage.setItem(`karaoke-closeout-${inviteCode}`, JSON.stringify({
        roomName: data?.room?.name || room?.name,
        playlist: data?.playlist || items,
        isGuest: false,
        inactivity: data?.inactivity || false,
      }));
      navigate(`/closeout/${inviteCode}`);
    });

    return () => {
      socket.off('inactivity-warning');
      socket.off('inactivity-cleared');
      socket.off('room-closed');
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [socket, inviteCode, room, items, navigate]);

  const handleStillHere = () => {
    if (socket && room) {
      socket.emit('activity-ping', { roomId: room.id });
    }
    setInactivityWarning(null);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleLeaveRoom = () => {
    if (!socket || !room) return;
    sessionStorage.setItem(`karaoke-closeout-${inviteCode}`, JSON.stringify({
      roomName: room.name,
      playlist: items,
      isGuest: false,
    }));
    socket.emit('close-room', { roomId: room.id });
    navigate(`/closeout/${inviteCode}`);
  };

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setVibeSuggestions([]);
    setVibeTheme(null);

    try {
      const data = await api.searchYouTube(query);
      setResults(data.items || data);
    } catch (err) {
      setError('Failed to search YouTube.');
    } finally {
      setLoading(false);
    }
  };

  const handleVibe = async (theme) => {
    setVibeLoading(true);
    setError(null);
    setResults([]);
    setVibeSuggestions([]);
    setVibeTheme(theme);

    try {
      const data = await api.generateVibe(theme);
      setVibeSuggestions(data.suggestions || data.data || data);
    } catch (err) {
      setError('Failed to generate playlist. Vibe endpoint may not be configured yet.');
    } finally {
      setVibeLoading(false);
    }
  };

  const handleRequestMore = async () => {
    if (!vibeTheme) return;
    setLoadingMore(true);
    setError(null);

    try {
      const existingTitles = vibeSuggestions.map(
        (s) => `${s.title} by ${s.artist}`
      );
      const moreTheme = `${vibeTheme}\n\nDo NOT include any of these songs (already suggested):\n${existingTitles.join('\n')}`;
      const data = await api.generateVibe(moreTheme);
      const newSuggestions = data.suggestions || data.data || data;

      const existing = new Set(
        vibeSuggestions.map((s) => `${s.title}|||${s.artist}`.toLowerCase())
      );
      const unique = newSuggestions.filter(
        (s) => !existing.has(`${s.title}|||${s.artist}`.toLowerCase())
      );
      setVibeSuggestions((prev) => [...prev, ...unique]);
    } catch (err) {
      setError('Failed to generate more suggestions.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Consolidate members by userId or name (handles page refreshes and dual Amped+Unplugged logins)
  const consolidatedMembers = useMemo(() => {
    const byName = new Map();
    for (const m of members) {
      const key = (m.userId && m.userId !== 'null') ? m.userId : (m.guestName || m.id);
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { ...m });
      } else {
        if (m.joinedAt && (!existing.joinedAt || m.joinedAt < existing.joinedAt)) {
          existing.joinedAt = m.joinedAt;
        }
        if (m.active) {
          existing.active = true;
          existing.leftAt = null;
        }
        if (m.leftAt && (!existing.leftAt || m.leftAt > existing.leftAt)) {
          existing.leftAt = m.leftAt;
        }
        if (m.active) existing.id = m.id;
      }
    }
    return Array.from(byName.values());
  }, [members]);

  const handleDismissPopupBanner = () => {
    setShowPopupBanner(false);
    sessionStorage.setItem('karaoke-popup-banner-dismissed', '1');
  };

  const popupBanner = false && (
    <div style={{
      background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.25)',
      borderRadius: 8, padding: '10px 14px', margin: '8px 0', display: 'flex',
      alignItems: 'center', gap: 10, fontSize: 13, color: '#ccc',
    }}>
      <span style={{ flex: 1 }}>
        For the smoothest experience, allow popups from this site — some karaoke videos open in a separate window.
      </span>
      <button
        onClick={() => setShowPopupHelp(true)}
        style={{ background: 'none', border: 'none', color: '#00c8ff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
      >
        How?
      </button>
      <button
        onClick={handleDismissPopupBanner}
        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );

  const popupHelpModal = false && (
    <div className="mobile-warning-overlay">
      <div className="auth-card" style={{ maxWidth: 400, textAlign: 'left' }}>
        <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', marginBottom: 14 }}>Allow Popups</h2>
        <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 10 }}><strong style={{ color: '#00c8ff' }}>Chrome:</strong> Click the lock/tune icon in the address bar → Site settings → Pop-ups → Allow</p>
          <p style={{ marginBottom: 10 }}><strong style={{ color: '#00c8ff' }}>Firefox:</strong> Click the shield icon in the address bar → Turn off blocking for this site</p>
          <p style={{ marginBottom: 10 }}><strong style={{ color: '#00c8ff' }}>Safari:</strong> Safari → Settings → Websites → Pop-up Windows → Allow for this site</p>
        </div>
        <button className="btn-neon btn-small" style={{ marginTop: 10 }} onClick={() => setShowPopupHelp(false)}>Got it</button>
      </div>
    </div>
  );

  const inactivityModal = inactivityWarning && (
    <div className="mobile-warning-overlay">
      <div className="auth-card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.3rem', marginBottom: 16 }}>Hey dude - you there?</h2>
        <p style={{ color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
          No one's playing music or adding songs. This room will automatically close in
        </p>
        <div style={{ color: '#F56F27', fontFamily: 'Orbitron', fontWeight: 700, fontSize: '2rem', marginBottom: 20 }}>
          {Math.floor(inactivityWarning.remainingSeconds / 60)}:{String(inactivityWarning.remainingSeconds % 60).padStart(2, '0')}
        </div>
        <button className="btn-neon" onClick={handleStillHere}>I'm still here!</button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="app app-page">
        {inactivityModal}
        {popupHelpModal}
        {showLeaveModal && (
          <div className="mobile-warning-overlay">
            <div className="mobile-warning-card">
              <h2>Callin' it quits?</h2>
              <p>This will end the room for everyone. Guests will be kicked out and the session will close.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-neon" onClick={handleLeaveRoom}>End Session</button>
                <button className="btn-neon" style={{ borderColor: '#555', color: '#888' }} onClick={() => setShowLeaveModal(false)}>Keep Going</button>
              </div>
              <button
                style={{ marginTop: 16, background: 'none', border: 'none', color: '#00c8ff', cursor: 'pointer', fontSize: 12 }}
                onClick={() => navigate('/')}
              >
                Just go to the Lobby (keep room open)
              </button>
            </div>
          </div>
        )}
        {mobilePlayerOpen && (
          <MobilePlayer onExit={() => setMobilePlayerOpen(false)} playbackController={playbackController} />
        )}
        <div className="guest-view">
          <div className="guest-header">
            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
              <button className="btn-lobby" style={{ position: 'static' }} onClick={() => navigate('/')}>Lobby</button>
              <button className="btn-leave-room" style={{ position: 'static' }} onClick={() => setShowLeaveModal(true)}>
                Bail
              </button>
            </div>
            <div className="logo-wrap">
              <img src={logo} alt="Cool Dude Karaoke" className="app-logo host-logo" style={{ height: 180, marginBottom: 0 }} />
              <span className={`logo-subtitle ${playbackMode === 'amped' ? 'logo-amped' : 'logo-unplugged'}`}>{playbackMode === 'amped' ? 'AMPED' : 'UNPLUGGED'}</span>
            </div>
            <div className="mobile-header-line"></div>
          </div>

          {ampedDisconnected && (
            <div className="mode-badge mode-badge-disconnected">
              Amped disconnected — switching in {ampedDisconnected.secondsLeft}s
            </div>
          )}

          {currentItem ? (
            <div className="guest-now-playing">
              <div className="now-playing-label">NOW PLAYING</div>
              <div className="now-playing-title">{currentItem.title}</div>
              <div className="now-playing-channel">{currentItem.channelName}</div>
            </div>
          ) : null}

          <PlaylistQueue loading={playlistLoading} playbackMode={playbackMode} />

          <QRCodeDisplay
            inviteCode={inviteCode}
            roomName={room?.name}
            members={consolidatedMembers}
            guestsExpanded={guestsExpanded}
            onToggleGuests={() => setGuestsExpanded((v) => !v)}
            formatTime={formatTime}
            currentUserId={user?.id}
          />

          {popupBanner}

          <div className="search-section">
            <SearchBar
              onSearch={handleSearch}
              onVibe={handleVibe}
              loading={loading}
              vibeLoading={vibeLoading}
            />
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Searching...</div>}
            {vibeLoading && (
              <div className="loading">
                ✦ Generating "{vibeTheme}" playlist...
              </div>
            )}
            {vibeSuggestions.length > 0 && (
              <VibeSuggestions
                theme={vibeTheme}
                suggestions={vibeSuggestions}
                onRequestMore={handleRequestMore}
                loadingMore={loadingMore}
              />
            )}
            <SearchResults results={results} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app host-dashboard">
      {inactivityModal}
      {popupHelpModal}
      {showLeaveModal && (
        <div className="mobile-warning-overlay">
          <div className="auth-card" style={{ maxWidth: 380 }}>
            <h2>Callin' it quits?</h2>
            <p style={{ color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>This will end the room for everyone. Guests will be kicked out and the session will close.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-neon" onClick={handleLeaveRoom}>End Session</button>
              <button className="btn-neon" style={{ borderColor: '#555', color: '#888' }} onClick={() => setShowLeaveModal(false)}>Keep Going</button>
            </div>
          </div>
        </div>
      )}
      <header className="app-header">
        <button className="btn-lobby" onClick={() => navigate('/')}>Lobby</button>
        <div className="logo-wrap">
          <img src={logo} alt="Cool Dude Karaoke" className="app-logo host-logo" style={{ height: 240 }} />
          <span className={`logo-subtitle ${playbackMode === 'amped' ? 'logo-amped' : 'logo-unplugged'}`}>{playbackMode === 'amped' ? 'AMPED' : 'UNPLUGGED'}</span>
        </div>
        <button className="btn-leave-room" onClick={() => setShowLeaveModal(true)}>
          Bail
        </button>
      </header>

      {playbackMode !== 'amped' && (
        <a href="https://github.com/theoremme/cool-dude-karaoke/releases/latest" target="_blank" rel="noopener noreferrer" className="amped-banner">
          <span className="amped-banner-title">⚡ Dude, Where's My Song?</span>
          <span className="amped-banner-text">Grab the Amped app for the full set.</span>
          <span className="amped-banner-cta">Download</span>
        </a>
      )}

      <div className="app-body">
        <div className="panel-left">
          {ampedDisconnected && (
            <div className="mode-badge mode-badge-large mode-badge-disconnected">
              Amped disconnected — switching in {ampedDisconnected.secondsLeft}s
            </div>
          )}
          <VideoPlayer isHost={true} playbackController={playbackController} popoutManager={popoutManager} playbackMode={playbackMode} socket={socket} roomId={room?.id} ampedDisconnected={ampedDisconnected} onSwitchToWeb={() => {
            if (socket && room) {
              socket.emit('amped-disconnect', { roomId: room.id });
            }
          }} />
          <div className="search-section">
            <SearchBar
              onSearch={handleSearch}
              onVibe={handleVibe}
              loading={loading}
              vibeLoading={vibeLoading}
            />
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Searching...</div>}
            {vibeLoading && (
              <div className="loading">
                ✦ Generating "{vibeTheme}" playlist...
              </div>
            )}
            {vibeSuggestions.length > 0 && (
              <VibeSuggestions
                theme={vibeTheme}
                suggestions={vibeSuggestions}
                onRequestMore={handleRequestMore}
                loadingMore={loadingMore}
              />
            )}
            <SearchResults results={results} />
          </div>
        </div>

        <div className="panel-right">
          <QRCodeDisplay
            inviteCode={inviteCode}
            roomName={room?.name}
            members={consolidatedMembers}
            guestsExpanded={guestsExpanded}
            onToggleGuests={() => setGuestsExpanded((v) => !v)}
            formatTime={formatTime}
            currentUserId={user?.id}
          />
          {popupBanner}
          <PlaylistQueue loading={playlistLoading} playbackMode={playbackMode} />
          <PlaylistSync socket={socket} roomId={room?.id} />
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
