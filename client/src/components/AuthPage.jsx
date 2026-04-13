import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';

const AuthPage = ({ startForgot = false }) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(!startForgot);
  const [isForgot, setIsForgot] = useState(startForgot);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [whitelisted, setWhitelisted] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isForgot) {
        const result = await api.forgotPassword(email);
        setSuccess(result.message);
      } else if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      if (!isLogin && err.message.includes('Bowie')) {
        setWhitelisted(false);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (login) => {
    setIsLogin(login);
    setIsForgot(false);
    setError(null);
    setSuccess(null);
    setWhitelisted(true);
  };

  return (
    <div className="app app-page">
      <div className="auth-page">
        <div className="auth-card">
          <div className="logo-wrap">
            <img src={logo} alt="Cool Dude Karaoke" className="auth-logo" />
            <span className="logo-subtitle logo-unplugged">UNPLUGGED</span>
          </div>
          {!whitelisted ? (
            <>
              <h2>Even Bowie waited backstage...</h2>
              <p className="whitelist-message">
                Email <a href="mailto:cooldudekaraoke@gmail.com">cooldudekaraoke@gmail.com</a> to request access while we're in Beta.
              </p>
              <button className="btn-primary" onClick={() => switchMode(true)}>
                Return to Login
              </button>
            </>
          ) : (
            <>
              <h2>
                {isForgot ? 'Forgot Password' : isLogin ? 'You had me at hello.' : 'Create Account'}
              </h2>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              {!success && (
                <form onSubmit={handleSubmit}>
                  {!isLogin && !isForgot && (
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  {!isForgot && (
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                  )}
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading
                      ? 'Please wait...'
                      : isForgot
                      ? 'Send Reset Link'
                      : isLogin
                      ? 'Sign In'
                      : 'Create Account'}
                  </button>
                </form>
              )}

              {isLogin && !isForgot && (
                <div className="auth-forgot">
                  <button onClick={() => { setIsForgot(true); setError(null); setSuccess(null); }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              <div className="auth-switch">
                {isForgot ? (
                  <button onClick={() => switchMode(true)}>Back to Sign In</button>
                ) : isLogin ? (
                  <>
                    {"Don't have an account? "}
                    <button onClick={() => switchMode(false)}>Sign Up</button>
                  </>
                ) : (
                  <>
                    {'Already have an account? '}
                    <button onClick={() => switchMode(true)}>Sign In</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
