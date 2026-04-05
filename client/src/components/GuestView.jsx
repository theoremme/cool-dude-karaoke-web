import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import PlaylistQueue from './PlaylistQueue';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2.png';
import logoNoBg from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

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
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const { addItem, addItems, items, currentItem, connectSocket, setPlaylist } = usePlaylist();
  const isMobile = useIsMobile();
  const prevItemsLength = useRef(items.length);

  const savedState = loadGuestState(inviteCode);
  const [guestName, setGuestName] = useState(savedState?.guestName || '');
  const [hasJoined, setHasJoined] = useState(savedState?.hasJoined || false);
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState(savedState?.results || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomError, setRoomError] = useState(null);

  // Fetch room info
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
      if (data.room) setRoom(data.room);
      if (data.playlist) setPlaylist(data.playlist);
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

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
      socket.off('room-closed');
    };
  }, [socket, setPlaylist]);

  // Persist guest state
  useEffect(() => {
    try {
      sessionStorage.setItem(`karaoke-guest-${inviteCode}`, JSON.stringify({
        results,
        guestName,
        hasJoined,
      }));
    } catch {}
  }, [results, guestName, hasJoined, inviteCode]);

  // On mobile, clear search results when a song is added so playlist shows at top
  useEffect(() => {
    if (isMobile && items.length > prevItemsLength.current) {
      setResults([]);
    }
    prevItemsLength.current = items.length;
  }, [items.length, isMobile]);

  // Connect socket to playlist context and re-join room on reload
  useEffect(() => {
    if (!hasJoined || !socket || !room || !isConnected) return;

    connectSocket(socket, room.id, guestName.trim());

    socket.emit('join-room', {
      roomId: room.id,
      guestName: guestName.trim(),
    });
  }, [hasJoined, socket, room, isConnected, guestName, connectSocket]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!guestName.trim() || !socket || !room) return;

    connectSocket(socket, room.id, guestName.trim());

    socket.emit('join-room', {
      roomId: room.id,
      guestName: guestName.trim(),
    });
    setHasJoined(true);
  };

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const data = await api.searchYouTube(query);
      setResults(data.items || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (roomError) {
    return (
      <div className="app app-page">
        <div className="guest-join">
          <div className="join-card">
            <img src={logoNoBg} alt="Cool Dude Karaoke" className="auth-logo" />
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
            <img src={logoNoBg} alt="Cool Dude Karaoke" className="auth-logo" />
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
              <div className="now-playing-label">NOW PLAYING</div>
              <div className="now-playing-title">{currentItem.title}</div>
              <div className="now-playing-channel">{currentItem.channelName}</div>
            </div>
          )}

          <PlaylistQueue guestMode />

          <div className="search-section">
            <SearchBar
              onSearch={handleSearch}
              onVibe={() => {}}
              loading={loading}
              vibeLoading={false}
            />
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Searching...</div>}
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
              onVibe={() => {}}
              loading={loading}
              vibeLoading={false}
            />
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Searching...</div>}
            <SearchResults results={results} />
          </div>
        </div>

        <div className="panel-right">
          <PlaylistQueue guestMode />
        </div>
      </div>
    </div>
  );
};

export default GuestView;
