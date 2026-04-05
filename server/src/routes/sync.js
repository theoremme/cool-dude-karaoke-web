const express = require('express');
const {
  parsePlaylistId,
  getPlaylistItems,
  getPlaylistInfo,
  createSession,
  destroySession,
} = require('../services/playlistSyncService');

const router = express.Router();

router.post('/connect', async (req, res) => {
  const { playlistId: rawInput } = req.body;

  if (!rawInput || !rawInput.trim()) {
    return res.status(400).json({ error: 'Playlist ID or URL is required' });
  }

  const playlistId = parsePlaylistId(rawInput);

  if (playlistId.startsWith('RD')) {
    return res.status(400).json({
      error: 'YouTube Mix/Radio playlists are not supported — they are dynamically generated. Use a regular playlist.',
    });
  }

  try {
    const items = await getPlaylistItems(playlistId);
    const info = await getPlaylistInfo(playlistId);

    const session = createSession(playlistId);
    items.forEach((item) => session.knownVideoIds.add(item.videoId));
    session.lastSyncTime = Date.now();

    res.json({
      playlistId,
      playlistName: info?.title || null,
      items,
    });
  } catch (err) {
    console.error('Sync connect error:', err.message);
    if (err.code === 404) {
      return res.status(404).json({ error: 'Playlist not found. Make sure it is public or unlisted.' });
    }
    if (err.code === 403) {
      return res.status(429).json({ error: 'YouTube API quota exceeded.' });
    }
    res.status(500).json({ error: 'Failed to connect to playlist' });
  }
});

router.post('/disconnect', (req, res) => {
  const { playlistId } = req.body || {};
  if (playlistId) {
    destroySession(playlistId);
  }
  res.json({ success: true });
});

module.exports = router;
