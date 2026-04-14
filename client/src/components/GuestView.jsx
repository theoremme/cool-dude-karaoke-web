import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import VibeSuggestions from './VibeSuggestions';
import PlaylistQueue from './PlaylistQueue';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';


function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

function loadGuestState(inviteCode) {
  try {
    const saved = sessionStorage.getItem(`karaoke-guest-${inviteCode}`);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

const GuestView = () => {
  const { inviteCode } = useParams();
  const { socket, isConnected } = useSocket({ guest: true });
  const navigate = useNavigate();
  const { addItem, addItems, items, currentItem, connectSocket, setPlaylist, setPlaybackState, clearLocal, setPlaybackMode: setContextPlaybackMode } = usePlaylist();
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const isMobile = useIsMobile();

  const savedState = loadGuestState(inviteCode);
  const [guestName, setGuestName] = useState(savedState?.guestName || '');
  const [hasJoined, setHasJoined] = useState(savedState?.hasJoined || false);
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState(savedState?.results || []);
  const [vibeSuggestions, setVibeSuggestions] = useState(savedState?.vibeSuggestions || []);
  const [vibeTheme, setVibeTheme] = useState(savedState?.vibeTheme || null);
  const [loading, setLoading] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [playbackMode, _setPlaybackMode] = useState(null);
  const setPlaybackMode = (mode) => {
    _setPlaybackMode(mode);
    setContextPlaybackMode(mode);
  };

  // Fetch room info
  // Clear stale playlist on mount
  useEffect(() => {
    clearLocal();
    setPlaylistLoading(true);
  }, [inviteCode]);

  useEffect(() => {
    api.getRoomByInviteCode(inviteCode)
      .then((data) => {
        if (data.room && !data.room.isActive) {
          // Room was closed — redirect to closeout
          sessionStorage.setItem(`karaoke-closeout-${inviteCode}`, JSON.stringify({
            roomName: data.room.name,
            playlist: items,
            isGuest: true,
            guestName,
          }));
          navigate(`/closeout/${inviteCode}`);
          return;
        }
        setRoom(data.room);
      })
      .catch((err) => setRoomError(err.message));
  }, [inviteCode]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('playlist-updated', (playlist) => {
      setPlaylist(playlist);
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
    });

    socket.on('playback-sync', ({ currentIndex, isPlaying, mode }) => {
      setPlaybackState(currentIndex, isPlaying);
      if (mode) setPlaybackMode(mode);
    });

    socket.on('mode-changed', ({ mode }) => {
      setPlaybackMode(mode);
    });

    socket.on('room-closed', (data) => {
      // Save playlist for the closeout page
      sessionStorage.setItem(`karaoke-closeout-${inviteCode}`, JSON.stringify({
        roomName: data?.room?.name || room?.name || 'Karaoke Session',
        playlist: data?.playlist || items,
        isGuest: true,
        guestName,
      }));
      navigate(`/closeout/${inviteCode}`);
    });

    // Handle room-inactive on reconnect (mobile wakes up after auto-close)
    socket.on('error', (data) => {
      if (data?.message?.includes('inactive') || data?.message?.includes('not found')) {
        navigate(`/closeout/${inviteCode}`);
      }
    });

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
      socket.off('playback-sync');
      socket.off('mode-changed');
      socket.off('room-closed');
      socket.off('error');
    };
  }, [socket, setPlaylist]);

  // Persist guest state
  useEffect(() => {
    try {
      sessionStorage.setItem(`karaoke-guest-${inviteCode}`, JSON.stringify({
        results,
        vibeSuggestions,
        vibeTheme,
        guestName,
        hasJoined,
      }));
    } catch {}
  }, [results, vibeSuggestions, vibeTheme, guestName, hasJoined, inviteCode]);

  // Connect socket to playlist context and re-join room (once per connection)
  const joinedSocketRef = useRef(false);
  useEffect(() => {
    if (!isConnected) {
      joinedSocketRef.current = false;
      return;
    }
    if (!hasJoined || !socket || !room || joinedSocketRef.current) return;

    connectSocket(socket, room.id, guestName.trim());

    socket.emit('join-room', {
      roomId: room.id,
      guestName: guestName.trim(),
    });
    joinedSocketRef.current = true;
  }, [hasJoined, socket, room, isConnected, guestName, connectSocket]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!guestName.trim() || !socket || !room) return;

    connectSocket(socket, room.id, guestName.trim());

    socket.emit('join-room', {
      roomId: room.id,
      guestName: guestName.trim(),
    });
    joinedSocketRef.current = true;
    setHasJoined(true);
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
      setError(err.message);
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
      const existingTitles = vibeSuggestions.map((s) => `${s.title} by ${s.artist}`);
      const moreTheme = `${vibeTheme}\n\nDo NOT include any of these songs (already suggested):\n${existingTitles.join('\n')}`;
      const data = await api.generateVibe(moreTheme);
      const newSuggestions = data.suggestions || data.data || data;
      const existing = new Set(vibeSuggestions.map((s) => `${s.title}|||${s.artist}`.toLowerCase()));
      const unique = newSuggestions.filter((s) => !existing.has(`${s.title}|||${s.artist}`.toLowerCase()));
      setVibeSuggestions((prev) => [...prev, ...unique]);
    } catch (err) {
      setError('Failed to generate more suggestions.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (roomError) {
    return (
      <div className="app app-page">
        <div className="guest-join">
          <div className="join-card">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <div className="error-message">{roomError}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="app app-page">
        <div className="guest-join">
          <div className="join-card">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <h2>Join {room?.name || 'Karaoke Room'}</h2>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="What should we call you?"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={!guestName.trim() || !isConnected}
              >
                {isConnected ? 'Join Room' : 'Connecting...'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="app app-page">
        <div className="guest-view">
          <div className="guest-header">
            <img src={logo} alt="Cool Dude Karaoke" style={{ height: 180, marginBottom: 8 }} />
          </div>

          <div className="guest-welcome-bar">
            <span className="guest-welcome-room">{room?.name}</span>
            <span className="guest-welcome-name">{guestName}</span>
          </div>

          {currentItem && (
            <div className="guest-now-playing">
              <div className="now-playing-label">
                {playbackMode === 'popout-youtube' || playbackMode === 'popup-youtube'
                  ? 'PLAYING ON YOUTUBE' : 'NOW PLAYING'}
              </div>
              <div className="now-playing-title">{currentItem.title}</div>
              <div className="now-playing-channel">{currentItem.channelName}</div>
            </div>
          )}

          <PlaylistQueue guestMode loading={playlistLoading} playbackMode={playbackMode} />

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

  // Desktop: two-panel layout like host (minus player and QR)
  return (
    <div className="app guest-dashboard">
      <header className="app-header">
        <img src={logo} alt="Cool Dude Karaoke" className="app-logo host-logo" style={{ height: 240 }} />
      </header>

      <div className="guest-welcome-bar">
        <span className="guest-welcome-room">{room?.name}</span>
        <span className="guest-welcome-name">{guestName}</span>
      </div>

      <div className="app-body">
        <div className="panel-left">
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
          {currentItem && (
            <div className="guest-now-playing">
              <div className="now-playing-label">
                {playbackMode === 'popout-youtube' || playbackMode === 'popup-youtube'
                  ? 'PLAYING ON YOUTUBE' : 'NOW PLAYING'}
              </div>
              <div className="now-playing-title">{currentItem.title}</div>
              <div className="now-playing-channel">{currentItem.channelName}</div>
            </div>
          )}
          <PlaylistQueue guestMode loading={playlistLoading} playbackMode={playbackMode} />
        </div>
      </div>
    </div>
  );
};

export default GuestView;
