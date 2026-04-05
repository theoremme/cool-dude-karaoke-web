import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import PlaylistQueue from './PlaylistQueue';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2.png';

const GuestView = () => {
  const { inviteCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { addItem, addItems, items, currentItem } = usePlaylist();
  const [guestName, setGuestName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomError, setRoomError] = useState(null);

  // Fetch room info
  useEffect(() => {
    api.getRoomByInviteCode(inviteCode)
      .then((data) => setRoom(data.room))
      .catch((err) => setRoomError(err.message));
  }, [inviteCode]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('playlist-updated', (playlist) => {
      // The playlist context handles its own state; this syncs from server
    });

    socket.on('room-updated', (data) => {
      if (data.room) setRoom(data.room);
    });

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
    };
  }, [socket]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!guestName.trim() || !socket || !room) return;

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
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" style={{ height: 400 }} />
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
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" style={{ height: 400 }} />
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

  return (
    <div className="app app-page">
      <div className="guest-view">
        <div className="guest-header">
          <img src={logo} alt="Cool Dude Karaoke" style={{ height: 180, marginBottom: 8 }} />
          <h2>{room?.name}</h2>
        </div>

        {currentItem && (
          <div className="guest-now-playing">
            <div className="now-playing-label">NOW PLAYING</div>
            <div className="now-playing-title">{currentItem.title}</div>
            <div className="now-playing-channel">{currentItem.channelName}</div>
          </div>
        )}

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

        <PlaylistQueue />
      </div>
    </div>
  );
};

export default GuestView;
