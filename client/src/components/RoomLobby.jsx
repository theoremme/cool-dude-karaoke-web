import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

const GREETINGS = [
  { text: "What's good,", end: "?" },
  { text: "'Sup,", end: "?" },
  { text: "What's poppin',", end: "?" },
  { text: "Yo, what up", end: "?" },
  { text: "Oh snap, it's", end: "!" },
];

const RoomLobby = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [activeRooms, setActiveRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [showMobileWarning, setShowMobileWarning] = useState(() =>
    window.innerWidth <= 768 && !sessionStorage.getItem('mobileDismissed')
  );
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  useEffect(() => {
    api.getMyRooms()
      .then((data) => setActiveRooms(data.rooms || []))
      .finally(() => setRoomsLoading(false));

    // Auto-refresh room list every 10 seconds
    const interval = setInterval(() => {
      api.getMyRooms()
        .then((data) => setActiveRooms(data.rooms || []))
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const data = await api.createRoom(roomName.trim());
      navigate(`/host/${data.inviteCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="app app-page">
      <a href="https://github.com/theoremme/cool-dude-karaoke/releases/latest" target="_blank" rel="noopener noreferrer" className="amped-banner amped-banner-top">
        <span className="amped-banner-title">⚡ Dude, Where's My Song?</span>
        <span className="amped-banner-text">Grab the Amped app for the full set.</span>
        <span className="amped-banner-cta">Download</span>
      </a>
      {showMobileWarning && (
        <div className="mobile-warning-overlay">
          <div className="mobile-warning-card">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <h2>Yo, dude. This hits different on desktop.</h2>
            <p>The host dashboard is designed for a big screen. You can still use it here, but it's way better on a laptop or desktop.</p>
            <button className="btn-neon" onClick={() => { sessionStorage.setItem('mobileDismissed', '1'); setShowMobileWarning(false); }}>
              I'll rough it
            </button>
          </div>
        </div>
      )}
      {user?.isAdmin && (
        <button
          onClick={() => navigate('/admin')}
          className="btn-backstage"
        >
          Backstage
        </button>
      )}
      <div className="room-lobby">
        <div className="lobby-card">
          <div className="logo-wrap">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <span className="logo-subtitle logo-unplugged">UNPLUGGED</span>
          </div>
          <div className="lobby-greeting">
            {greeting.text} {user?.name || user?.email}{greeting.end}
          </div>

          {roomsLoading ? (
            <div className="active-rooms">
              <h2>Your Active Rooms</h2>
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <div className="player-spinner" />
              </div>
            </div>
          ) : activeRooms.length > 0 ? (
            <div className="active-rooms">
              <h2>Your Active Rooms</h2>
              <div className="active-rooms-list">
                {activeRooms.map((room) => (
                  <div key={room.id} className="active-room-item" onClick={() => navigate(`/host/${room.inviteCode}`)}>
                    <div className="active-room-info">
                      <span className="active-room-name">{room.name}</span>
                      <span className="active-room-meta">
                        {room._count.playlist} song{room._count.playlist !== 1 ? 's' : ''}
                        {' · '}{room._count.members} guest{room._count.members !== 1 ? 's' : ''}
                        {' · '}{room.inviteCode}
                      </span>
                    </div>
                    <span className="active-room-rejoin">Rejoin</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error && <div className="error-message">{error}</div>}

          <h2>Create a Room</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room name (e.g., Friday Night Karaoke)"
                maxLength={100}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={!roomName.trim() || creating}>
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </form>

          <div style={{
            borderTop: '1px solid rgba(0,200,255,0.1)',
            marginTop: 24,
            paddingTop: 24,
          }}>
            <h2>Join a Room</h2>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter invite code (e.g., ABC123)"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={!joinCode.trim()}>
                Join Room
              </button>
            </form>
          </div>

          <div className="lobby-footer">
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoomLobby;
