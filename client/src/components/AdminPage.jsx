import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

const AdminPage = () => {
  const { user } = useAuth();
  const [whitelist, setWhitelist] = useState([]);
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.isAdmin;

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const loadData = async () => {
    try {
      const [wl, u] = await Promise.all([api.getWhitelist(), api.getUsers()]);
      setWhitelist(wl.whitelist);
      setUsers(u.users);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.addToWhitelist(newEmail);
      setNewEmail('');
      setSuccess(`${newEmail} added to whitelist`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (id, email) => {
    setError(null);
    setSuccess(null);
    try {
      await api.removeFromWhitelist(id);
      setSuccess(`${email} removed from whitelist`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app app-page">
      <div className="admin-page">
        <div className="admin-card">
          <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
          <h2>Backstage Pass</h2>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {loading ? (
            <p className="admin-loading">Loading...</p>
          ) : (
            <>
              {/* Whitelist Section */}
              <div className="admin-section">
                <h3>Beta Whitelist</h3>
                <form onSubmit={handleAdd} className="admin-add-form">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                  <button type="submit" className="btn-admin-add">Add</button>
                </form>
                <div className="admin-list">
                  {whitelist.length === 0 ? (
                    <p className="admin-empty">No emails whitelisted yet</p>
                  ) : (
                    whitelist.map((entry) => (
                      <div key={entry.id} className="admin-list-item">
                        <span className="admin-list-email">{entry.email}</span>
                        <button
                          className="btn-admin-remove"
                          onClick={() => handleRemove(entry.id, entry.email)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Users Section */}
              <div className="admin-section">
                <h3>Registered Users ({users.length})</h3>
                <div className="admin-list">
                  {users.map((u) => (
                    <div key={u.id} className="admin-list-item">
                      <div className="admin-user-info">
                        <span className="admin-list-email">{u.email}</span>
                        <span className="admin-user-meta">
                          {u.name || 'No name'} · Joined {new Date(u.createdAt).toLocaleDateString()}
                          {u.isAdmin && ' · Admin'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="admin-back">
            <a href="/">Back to Lobby</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
