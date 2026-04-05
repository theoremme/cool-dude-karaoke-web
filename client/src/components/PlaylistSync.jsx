import React, { useState, useEffect, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const PlaylistSync = ({ socket, roomId }) => {
  const { addItems } = usePlaylist();
  const [playlistInput, setPlaylistInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [playlistName, setPlaylistName] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleNewItems = (items) => {
      addItems(items);
    };

    const handleSyncStatus = (status) => {
      setSyncStatus(status);
    };

    const handleSyncError = (err) => {
      setError(typeof err === 'string' ? err : err.message || 'Sync error');
    };

    socket.on('sync-new-items', handleNewItems);
    socket.on('sync-status', handleSyncStatus);
    socket.on('sync-error', handleSyncError);

    return () => {
      socket.off('sync-new-items', handleNewItems);
      socket.off('sync-status', handleSyncStatus);
      socket.off('sync-error', handleSyncError);
    };
  }, [socket, addItems]);

  const handleConnect = useCallback(async () => {
    if (!playlistInput.trim()) return;
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/sync/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playlistId: playlistInput.trim() }),
      });
      const result = await res.json();
      if (res.ok) {
        setConnected(true);
        if (result.items && result.items.length > 0) {
          addItems(result.items);
        }
        if (result.playlistName) {
          setPlaylistName(result.playlistName);
        }
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError('Failed to connect to playlist');
    } finally {
      setConnecting(false);
    }
  }, [playlistInput, roomId, addItems]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('/api/sync/disconnect', { method: 'POST' });
    } catch (e) {}
    setConnected(false);
    setPlaylistName(null);
    setSyncStatus(null);
  }, []);

  const formatSyncTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const quota = syncStatus?.quota;

  return (
    <div className="playlist-sync">
      <h3 className="sync-title">YouTube Playlist Sync</h3>

      {!connected ? (
        <div className="sync-connect">
          <input
            type="text"
            className="sync-input"
            placeholder="Paste YouTube playlist URL or ID..."
            value={playlistInput}
            onChange={(e) => setPlaylistInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            disabled={connecting}
          />
          <button
            className="btn-neon btn-small"
            onClick={handleConnect}
            disabled={connecting || !playlistInput.trim()}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      ) : (
        <div className="sync-connected">
          {playlistName && (
            <p className="sync-playlist-name" title={playlistName}>{playlistName}</p>
          )}
          <div className="sync-status-row">
            <span className="sync-dot sync-dot-active" />
            <span className="sync-label">Connected</span>
            <button
              className="btn-neon btn-small btn-danger"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>

          {syncStatus && (
            <div className="sync-details">
              <span>
                Last sync:{' '}
                {formatSyncTime(syncStatus.secondsSinceSync)}
              </span>
              <span>
                Polling: {syncStatus.isPolling
                  ? `every ${syncStatus.pollingInterval / 1000}s`
                  : 'paused'}
              </span>
            </div>
          )}
        </div>
      )}

      {quota && (
        <div className="quota-meter">
          <div className="quota-bar">
            <div
              className={`quota-fill ${quota.isWarning ? 'quota-warning' : ''} ${quota.isCritical ? 'quota-critical' : ''}`}
              style={{ width: `${Math.min(quota.percentage * 100, 100)}%` }}
            />
          </div>
          <span className="quota-text">
            API: {quota.used} / {quota.limit} ({Math.round(quota.percentage * 100)}%)
          </span>
        </div>
      )}

      {error && <div className="sync-error">{error}</div>}
    </div>
  );
};

export default PlaylistSync;
