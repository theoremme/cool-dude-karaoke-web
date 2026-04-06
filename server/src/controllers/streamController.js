const { execFile } = require('child_process');
const ytdl = require('@distube/ytdl-core');
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
    console.log('[cookies] Loaded from YT_COOKIES_BASE64 env var');
  } catch (e) {
    console.error('[cookies] Failed to write from env:', e.message);
  }
}

function hasCookies() {
  return fs.existsSync(COOKIES_PATH);
}

// Parse Netscape cookies.txt into array for @distube/ytdl-core
function parseCookiesForYtdl() {
  if (!hasCookies()) return null;
  try {
    const text = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          path: parts[2],
          secure: parts[3] === 'TRUE',
          expirationDate: parseInt(parts[4]) || 0,
          name: parts[5],
          value: parts[6],
        });
      }
    }
    return cookies.length > 0 ? cookies : null;
  } catch (e) {
    console.error('[cookies] Failed to parse for ytdl-core:', e.message);
    return null;
  }
}

// Build ytdl-core agent with cookies if available
function getYtdlAgent() {
  const cookies = parseCookiesForYtdl();
  if (cookies) {
    try {
      return ytdl.createAgent(cookies);
    } catch (e) {
      console.warn('[cookies] Failed to create ytdl agent:', e.message);
    }
  }
  return undefined;
}

// Primary: use @distube/ytdl-core (pure Node.js)
async function getStreamUrlYtdl(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const agent = getYtdlAgent();
  const opts = agent ? { agent } : {};
  const info = await ytdl.getInfo(url, opts);

  // Prefer muxed mp4 format (video+audio in one stream)
  const format = ytdl.chooseFormat(info.formats, {
    quality: 'highest',
    filter: (f) => f.container === 'mp4' && f.hasVideo && f.hasAudio,
  });
  if (format && format.url) return format.url;

  // Fallback: any muxed format
  const fallback = ytdl.chooseFormat(info.formats, {
    quality: 'highest',
    filter: 'audioandvideo',
  });
  if (fallback && fallback.url) return fallback.url;

  throw new Error('No suitable format found');
}

// Fallback: use yt-dlp (Python)
function getStreamUrlYtDlp(videoId) {
  return new Promise((resolve, reject) => {
    // With cookies, specific muxed itags (22=720p, 18=360p) are more reliable
    const formatStr = hasCookies() ? '22/18/best[ext=mp4]/best' : 'best[ext=mp4]/best';
    const args = [
      '-f', formatStr,
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
        const url = stdout.trim().split('\n')[0]; // Take first URL only
        if (!url) {
          return reject(new Error('No URL returned'));
        }
        resolve(url);
      }
    );
  });
}

async function getStreamUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.url;
  }

  // Try ytdl-core first, fall back to yt-dlp
  let url;
  let source;
  try {
    url = await getStreamUrlYtdl(videoId);
    source = 'ytdl-core';
  } catch (ytdlErr) {
    console.warn(`[stream] ytdl-core failed for ${videoId}: ${ytdlErr.message}`);
    try {
      url = await getStreamUrlYtDlp(videoId);
      source = 'yt-dlp';
    } catch (dlpErr) {
      console.error(`[stream] yt-dlp also failed for ${videoId}: ${dlpErr.message}`);
      throw new Error(`Both extractors failed. ytdl-core: ${ytdlErr.message} | yt-dlp: ${dlpErr.message}`);
    }
  }

  console.log(`[stream] Got URL for ${videoId} via ${source}${hasCookies() ? ' (with cookies)' : ''}`);
  urlCache.set(videoId, { url, time: Date.now() });
  return url;
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

    // Default: proxy video through server
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

// Upload cookies via API (Netscape cookies.txt format)
const uploadCookies = async (req, res) => {
  const { cookies } = req.body;
  if (!cookies || typeof cookies !== 'string') {
    return res.status(400).json({ error: 'Cookies text is required' });
  }

  try {
    fs.writeFileSync(COOKIES_PATH, cookies);
    urlCache.clear();
    console.log('[cookies] Updated via API');
    res.json({ success: true, message: 'Cookies updated' });
  } catch (err) {
    console.error('[cookies] Write error:', err.message);
    res.status(500).json({ error: 'Failed to save cookies' });
  }
};

const cookieStatus = (req, res) => {
  const has = hasCookies();
  const parsed = has ? parseCookiesForYtdl() : null;
  res.json({
    hasCookies: has,
    cookieCount: parsed ? parsed.length : 0,
    lastModified: has ? fs.statSync(COOKIES_PATH).mtime.toISOString() : null,
  });
};

module.exports = { stream, uploadCookies, cookieStatus };
