import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

const RoomLobby = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

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
      <div className="room-lobby">
        <div className="lobby-card">
          <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: '#888', fontSize: 13 }}>
              Welcome, {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              style={{
                marginLeft: 12,
                background: 'none',
                border: 'none',
                color: '#ff4466',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Logout
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
