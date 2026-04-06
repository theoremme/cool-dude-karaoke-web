const { execFile } = require('child_process');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';
const COOKIES_PATH = path.join(__dirname, '../../cookies.txt');

// Cache extracted URLs (they last 4-6 hours)
const urlCache = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

// Write cookies from env var on startup
if (process.env.YT_COOKIES_BASE64) {
  try {
    fs.writeFileSync(COOKIES_PATH, Buffer.from(process.env.YT_COOKIES_BASE64, 'base64').toString('utf-8'));
    console.log('[yt-dlp] Cookies loaded from YT_COOKIES_BASE64 env var');
  } catch (e) {
    console.error('[yt-dlp] Failed to write cookies from env:', e.message);
  }
}

function hasCookies() {
  return fs.existsSync(COOKIES_PATH);
}

function getStreamUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return Promise.resolve(cached.url);
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'best[ext=mp4]/best',
      '--get-url',
      '--no-warnings',
    ];

    if (hasCookies()) {
      args.push('--cookies', COOKIES_PATH);
    }

    args.push(`https://www.youtube.com/watch?v=${videoId}`);

    execFile(
      YT_DLP_PATH,
      args,
      { timeout: 15000 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message));
        }
        const url = stdout.trim();
        if (!url) {
          return reject(new Error('No URL returned'));
        }
        urlCache.set(videoId, { url, time: Date.now() });
        resolve(url);
      }
    );
  });
}

function proxyVideo(targetUrl, rangeHeaders, res, req) {
  const p = new URL(targetUrl);
  const g = p.protocol === 'https:' ? https : http;

  const proxyReq = g.get(targetUrl, { headers: rangeHeaders }, (proxyRes) => {
    // Follow redirects
    if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      proxyRes.resume();
      proxyVideo(proxyRes.headers.location, rangeHeaders, res, req);
      return;
    }

    const fwdHeaders = {
      'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    if (proxyRes.headers['content-length']) {
      fwdHeaders['Content-Length'] = proxyRes.headers['content-length'];
    }
    if (proxyRes.headers['content-range']) {
      fwdHeaders['Content-Range'] = proxyRes.headers['content-range'];
    }

    res.writeHead(proxyRes.statusCode, fwdHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy video stream' });
    }
  });

  req.on('close', () => {
    proxyReq.destroy();
  });
}

const stream = async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    const videoUrl = await getStreamUrl(videoId);

    const headers = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    proxyVideo(videoUrl, headers, res, req);
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream video', detail: err.message });
    }
  }
};

// Upload cookies via API
const uploadCookies = async (req, res) => {
  const { cookies } = req.body;
  if (!cookies || typeof cookies !== 'string') {
    return res.status(400).json({ error: 'Cookies text is required' });
  }

  try {
    fs.writeFileSync(COOKIES_PATH, cookies);
    urlCache.clear();
    console.log('[yt-dlp] Cookies updated via API');
    res.json({ success: true, message: 'Cookies updated' });
  } catch (err) {
    console.error('[yt-dlp] Cookie write error:', err.message);
    res.status(500).json({ error: 'Failed to save cookies' });
  }
};

const cookieStatus = (req, res) => {
  res.json({
    hasCookies: hasCookies(),
    lastModified: hasCookies() ? fs.statSync(COOKIES_PATH).mtime.toISOString() : null,
  });
};

module.exports = { stream, uploadCookies, cookieStatus };
