const { searchVideos } = require('../services/youtubeService');

const search = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const query = q.trim().toLowerCase().includes('karaoke') ? q.trim() : `${q.trim()} karaoke`;
    const items = await searchVideos(query);
    res.json({ items });
  } catch (err) {
    console.error('YouTube search error:', err);

    if (err.code === 403) {
      return res.status(429).json({ error: 'YouTube API quota exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'YouTube search failed' });
  }
};

module.exports = { search };
