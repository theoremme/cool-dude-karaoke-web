import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app app-page">
      <div className="auth-page">
        <div className="auth-card">
          <div className="logo-wrap">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <span className="logo-subtitle logo-unplugged">UNPLUGGED</span>
          </div>
          <h2>Reset Password</h2>

          {success ? (
            <div className="reset-success">
              <p className="success-message">Password reset successfully!</p>
              <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '16px' }}>
                Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Please wait...' : 'Reset Password'}
                </button>
              </form>
              <div className="auth-switch">
                <Link to="/login">Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
