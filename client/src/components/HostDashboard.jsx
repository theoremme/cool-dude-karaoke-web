import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import PlaylistQueue from './PlaylistQueue';
import PlaylistSync from './PlaylistSync';
import QRCodeDisplay from './QRCodeDisplay';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

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
  const { connectSocket, setPlaylist, clearLocal, items, currentItem } = usePlaylist();
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const isMobile = useIsMobile();
  const [showMobileWarning, setShowMobileWarning] = useState(true);

  const savedState = loadHostState(inviteCode);
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState(savedState?.results || []);
  const [vibeSuggestions, setVibeSuggestions] = useState(savedState?.vibeSuggestions || []);
  const [loading, setLoading] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [vibeTheme, setVibeTheme] = useState(savedState?.vibeTheme || null);
  const [copied, setCopied] = useState(false);

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
    });

    socket.on('room-updated', (data) => {
      if (data.room) setRoom(data.room);
      if (data.playlist) {
        setPlaylist(data.playlist);
        setPlaylistLoading(false);
      }
    });

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
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
        if (seconds <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return;
        }
        setInactivityWarning({ remainingSeconds: seconds });
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
        {showMobileWarning && (
          <div className="mobile-warning-overlay">
            <div className="mobile-warning-card">
              <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
              <h2>Yo, dude. This hits different on desktop.</h2>
              <p>The host dashboard is designed for a big screen. You can still use it here, but it's way better on a laptop or desktop.</p>
              <button className="btn-neon" onClick={() => setShowMobileWarning(false)}>
                I'll rough it
              </button>
            </div>
          </div>
        )}
        <div className="guest-view">
          <div className="guest-header">
            <img src={logo} alt="Cool Dude Karaoke" style={{ height: 180, marginBottom: 8 }} />
            <h2>{room?.name}</h2>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-lobby" style={{ position: 'static' }} onClick={() => navigate('/')}>Lobby</button>
              <button className="btn-leave-room" style={{ position: 'static' }} onClick={() => setShowLeaveModal(true)}>
                Leave Room
              </button>
            </div>
          </div>

          {currentItem && (
            <div className="guest-now-playing">
              <div className="now-playing-label">NOW PLAYING</div>
              <div className="now-playing-title">{currentItem.title}</div>
              <div className="now-playing-channel">{currentItem.channelName}</div>
            </div>
          )}

          <PlaylistQueue loading={playlistLoading} />

          <QRCodeDisplay inviteCode={inviteCode} roomName={room?.name} />

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
        <img src={logo} alt="Cool Dude Karaoke" className="app-logo host-logo" style={{ height: 240 }} />
        <button className="btn-leave-room" onClick={() => setShowLeaveModal(true)}>
          Leave Room
        </button>
      </header>

      <div className="app-body">
        <div className="panel-left">
          <VideoPlayer isHost={true} />
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
          <QRCodeDisplay inviteCode={inviteCode} roomName={room?.name} />
          <PlaylistQueue loading={playlistLoading} />
          <PlaylistSync socket={socket} roomId={room?.id} />
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
