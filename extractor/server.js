const express = require('express');
const ytdl = require('@distube/ytdl-core');

const app = express();
const API_KEY = process.env.API_KEY;

// Simple API key auth
app.use((req, res, next) => {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/extract/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

    // Prefer muxed mp4 (video+audio in one stream)
    let format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: (f) => f.container === 'mp4' && f.hasVideo && f.hasAudio,
    });

    // Fallback: any muxed format
    if (!format || !format.url) {
      format = ytdl.chooseFormat(info.formats, {
        quality: 'highest',
        filter: 'audioandvideo',
      });
    }

    if (!format || !format.url) {
      return res.status(404).json({ error: 'No playable format found' });
    }

    res.json({
      url: format.url,
      quality: format.qualityLabel || format.quality,
      container: format.container,
    });
  } catch (err) {
    console.error(`Extract error for ${videoId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Extractor running on port ${PORT}`));
