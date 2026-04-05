const https = require('https');
const querystring = require('querystring');

// Temporary token storage (in-memory, keyed by random ID)
const tokenStore = new Map();

function generateTokenKey() {
  return require('crypto').randomBytes(16).toString('hex');
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/api/youtube/oauth/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

// Redirect user to Google OAuth consent screen
const oauthRedirect = (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return res.status(500).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }

  // Store the return URL in the state param
  const returnTo = req.query.returnTo || '/';
  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// Handle OAuth callback from Google
const oauthCallback = async (req, res) => {
  const { code, state, error } = req.query;

  let returnTo = '/';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    returnTo = decoded.returnTo || '/';
  } catch {}

  if (error || !code) {
    return res.redirect(`${returnTo}?youtube_error=${error || 'no_code'}`);
  }

  const config = getOAuthConfig();
  if (!config) {
    return res.redirect(`${returnTo}?youtube_error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCode(code, config);
    const tokenKey = generateTokenKey();
    tokenStore.set(tokenKey, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    });

    // Clean up after 30 minutes
    setTimeout(() => tokenStore.delete(tokenKey), 30 * 60 * 1000);

    res.redirect(`${returnTo}?youtube_token=${tokenKey}`);
  } catch (err) {
    console.error('OAuth token exchange error:', err);
    res.redirect(`${returnTo}?youtube_error=token_exchange_failed`);
  }
};

// Create a YouTube playlist and add videos
const createPlaylist = async (req, res) => {
  const { tokenKey, playlistName, description, songs } = req.body;

  if (!tokenKey || !tokenStore.has(tokenKey)) {
    return res.status(401).json({ error: 'YouTube not authenticated. Please connect your account.' });
  }

  if (!playlistName || !songs || !Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'Playlist name and songs are required.' });
  }

  const { accessToken } = tokenStore.get(tokenKey);

  try {
    // Create the playlist
    const playlist = await youtubeApiPost(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
      {
        snippet: {
          title: playlistName,
          description: description || 'Created with Cool Dude Karaoke',
        },
        status: {
          privacyStatus: 'unlisted',
        },
      },
      accessToken
    );

    const playlistId = playlist.id;
    const added = [];
    const failed = [];

    // Add each song to the playlist
    for (const song of songs) {
      try {
        await youtubeApiPost(
          'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
          {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: song.videoId,
              },
            },
          },
          accessToken
        );
        added.push(song.videoId);
      } catch (err) {
        console.error(`Failed to add ${song.videoId}:`, err.message);
        failed.push({ videoId: song.videoId, error: err.message });
      }
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    res.json({
      success: true,
      playlistId,
      playlistUrl,
      added: added.length,
      failed: failed.length,
      failures: failed,
    });
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Failed to create YouTube playlist.' });
  }
};

// Check if OAuth is configured
const oauthStatus = (req, res) => {
  const config = getOAuthConfig();
  res.json({ configured: !!config });
};

// --- Helpers ---

function exchangeCode(code, config) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error_description || parsed.error));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function youtubeApiPost(url, body, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const errMsg = parsed.error?.message || `HTTP ${res.statusCode}`;
            reject(new Error(errMsg));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = { oauthRedirect, oauthCallback, createPlaylist, oauthStatus };
