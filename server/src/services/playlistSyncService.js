const https = require('https');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const POLLING_INTERVAL_ACTIVE = 5000;   // 5s when playing
const POLLING_INTERVAL_PAUSED = 30000;  // 30s when idle
const IDLE_TIMEOUT = 5 * 60 * 1000;     // 5 min

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            const err = new Error(parsed.error.message);
            err.code = parsed.error.code;
            reject(err);
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function parsePlaylistId(input) {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/[?&]list=([^&]+)/);
  if (urlMatch) return urlMatch[1];
  return trimmed;
}

async function getPlaylistItems(playlistId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube API key not configured');

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: '50',
    key: apiKey,
  });

  const data = await fetchJSON(`${YOUTUBE_API_BASE}/playlistItems?${params}`);
  if (!data.items) return [];

  return data.items
    .filter((item) => item.snippet.resourceId?.videoId)
    .map((item) => ({
      videoId: item.snippet.resourceId.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelName: decodeHtmlEntities(item.snippet.videoOwnerChannelTitle || ''),
    }));
}

async function getPlaylistInfo(playlistId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube API key not configured');

  const params = new URLSearchParams({
    part: 'snippet',
    id: playlistId,
    key: apiKey,
  });

  const data = await fetchJSON(`${YOUTUBE_API_BASE}/playlists?${params}`);
  if (!data.items || data.items.length === 0) return null;

  return {
    title: decodeHtmlEntities(data.items[0].snippet.title),
    channelTitle: decodeHtmlEntities(data.items[0].snippet.channelTitle),
  };
}

// Active sync sessions keyed by a session token
const syncSessions = new Map();

function createSession(playlistId) {
  const session = {
    playlistId,
    knownVideoIds: new Set(),
    pollingTimer: null,
    lastSyncTime: null,
    lastActivityTime: Date.now(),
    onNewItems: null,
    onStatus: null,
  };
  syncSessions.set(playlistId, session);
  return session;
}

function getSession(playlistId) {
  return syncSessions.get(playlistId);
}

function destroySession(playlistId) {
  const session = syncSessions.get(playlistId);
  if (session) {
    if (session.pollingTimer) clearInterval(session.pollingTimer);
    syncSessions.delete(playlistId);
  }
}

module.exports = {
  parsePlaylistId,
  getPlaylistItems,
  getPlaylistInfo,
  createSession,
  getSession,
  destroySession,
};
