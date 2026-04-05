const { generateSuggestions } = require('../services/vibeService');

const generate = async (req, res) => {
  const { theme } = req.body;

  if (!theme || theme.trim().length === 0) {
    return res.status(400).json({ error: 'Theme is required' });
  }

  try {
    const suggestions = await generateSuggestions(theme.trim());
    res.json({ suggestions });
  } catch (err) {
    console.error('Vibe generation error:', err);

    if (err.message.includes('API key')) {
      return res.status(503).json({ error: 'Vibe generation is not available. Anthropic API key not configured.' });
    }

    res.status(500).json({ error: 'Failed to generate vibe suggestions' });
  }
};

module.exports = { generate };
