const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_VIBE_PROMPT = `You are a deeply knowledgeable music historian and genre expert curating a karaoke playlist. Generate exactly 50 songs that genuinely belong to this theme, genre, or vibe:

"{{THEME}}"

CRITICAL RULES:
- Be GENRE-ACCURATE. If the theme specifies a genre (e.g. "New Wave", "R&B", "Grunge"), every song MUST actually be classified in that genre. Do not include songs from adjacent or loosely related genres.
- If the theme specifies a decade, songs must have been released in that decade.
- If the theme is a mood or vibe (e.g. "Torchlight & Crooners"), interpret it thoughtfully and stay true to that aesthetic.
- Prefer songs that are definitively associated with the theme, not just vaguely related.
- All songs should be well-known enough to have karaoke versions on YouTube.
- Order from most iconic to lesser known within the theme.

Return ONLY a valid JSON array, no other text or markdown. Each item must have "title" and "artist" fields.
Example: [{"title": "Never Gonna Give You Up", "artist": "Rick Astley"}]`;

async function generateSuggestions(theme) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured on the server.');
  }

  const client = new Anthropic({ apiKey, maxRetries: 3, timeout: 60000 });
  const prompt = DEFAULT_VIBE_PROMPT.replace('{{THEME}}', theme);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text.trim();
  let songs;
  try {
    songs = JSON.parse(responseText);
  } catch (e) {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) {
      songs = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse song suggestions from Claude.');
    }
  }

  if (!Array.isArray(songs) || songs.length === 0) {
    throw new Error('No song suggestions returned.');
  }

  return songs;
}

module.exports = { generateSuggestions };
