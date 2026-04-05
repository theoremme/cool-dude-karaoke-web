import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import VibeSuggestions from './VibeSuggestions';
import VideoPlayer from './VideoPlayer';
import PlaylistQueue from './PlaylistQueue';
import PlaylistSync from './PlaylistSync';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import logo from '../assets/cool-dude-karaoke-logo-v2.png';

const HostDashboard = () => {
  const { inviteCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { addItem } = usePlaylist();
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [vibeSuggestions, setVibeSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [vibeTheme, setVibeTheme] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch room and join via socket
  useEffect(() => {
    api.getRoomByInviteCode(inviteCode)
      .then((data) => setRoom(data.room))
      .catch((err) => setError(err.message));
  }, [inviteCode]);

  useEffect(() => {
    if (!socket || !room || !isConnected) return;
    socket.emit('join-room', {
      roomId: room.id,
      userId: user?.id,
      guestName: user?.name || 'Host',
    });
  }, [socket, room, isConnected, user]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('playlist-updated', (playlist) => {
      // Server pushes playlist state
    });

    socket.on('room-updated', (data) => {
      if (data.room) setRoom(data.room);
    });

    return () => {
      socket.off('playlist-updated');
      socket.off('room-updated');
    };
  }, [socket]);

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

  return (
    <div className="app host-dashboard">
      <header className="app-header">
        <img src={logo} alt="Cool Dude Karaoke" className="app-logo host-logo" style={{ height: 240 }} />
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
          <div className="invite-section">
            <div className="invite-label">Invite Code</div>
            <div className="invite-code-display">{inviteCode}</div>
            <div className="invite-link">
              {window.location.origin}/room/{inviteCode}
            </div>
            <button className="btn-copy" onClick={handleCopyLink}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          <PlaylistQueue />
          <PlaylistSync socket={socket} roomId={room?.id} />
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
