const https = require('https');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// --- Search Cache ---
// Map<normalizedQuery, { results, expiresAt }>
const searchCache = new Map();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_CACHE_SIZE = 500;

// --- Quota Tracking ---
// YouTube Data API v3 costs: search=100, videos=1, playlists.insert=50, playlistItems.insert=50
const quotaTracker = {
  dailyUsage: 0,
  dailyLimit: 10000,
  lastReset: new Date().toDateString(),
  breakdown: { search: 0, videoDetails: 0, other: 0 },
  cacheHits: 0,
  cacheMisses: 0,
};

function resetQuotaIfNewDay() {
  const today = new Date().toDateString();
  if (quotaTracker.lastReset !== today) {
    quotaTracker.dailyUsage = 0;
    quotaTracker.breakdown = { search: 0, videoDetails: 0, other: 0 };
    quotaTracker.cacheHits = 0;
    quotaTracker.cacheMisses = 0;
    quotaTracker.lastReset = today;
  }
}

function trackQuota(operation, units) {
  resetQuotaIfNewDay();
  quotaTracker.dailyUsage += units;
  if (quotaTracker.breakdown[operation] !== undefined) {
    quotaTracker.breakdown[operation] += units;
  } else {
    quotaTracker.breakdown.other += units;
  }
}

function getQuotaStatus() {
  resetQuotaIfNewDay();
  return {
    dailyUsage: quotaTracker.dailyUsage,
    dailyLimit: quotaTracker.dailyLimit,
    remaining: Math.max(0, quotaTracker.dailyLimit - quotaTracker.dailyUsage),
    percentUsed: Math.round((quotaTracker.dailyUsage / quotaTracker.dailyLimit) * 100),
    breakdown: { ...quotaTracker.breakdown },
    cache: {
      hits: quotaTracker.cacheHits,
      misses: quotaTracker.cacheMisses,
      size: searchCache.size,
      hitRate: quotaTracker.cacheHits + quotaTracker.cacheMisses > 0
        ? Math.round((quotaTracker.cacheHits / (quotaTracker.cacheHits + quotaTracker.cacheMisses)) * 100)
        : 0,
    },
    lastReset: quotaTracker.lastReset,
  };
}

function setDailyLimit(limit) {
  quotaTracker.dailyLimit = limit;
}

// --- Cache Helpers ---

function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCached(query) {
  const key = normalizeQuery(query);
  const entry = searchCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.results;
  }
  if (entry) {
    searchCache.delete(key); // Expired
  }
  return null;
}

function setCache(query, results) {
  const key = normalizeQuery(query);

  // Evict oldest entries if cache is full
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }

  searchCache.set(key, {
    results,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// --- Core Functions ---

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
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function parseDuration(iso8601) {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

async function searchVideos(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  resetQuotaIfNewDay();

  // Check quota before making the call
  if (quotaTracker.dailyUsage >= quotaTracker.dailyLimit) {
    const err = new Error('YouTube API daily quota reached. Try again tomorrow or use cached results.');
    err.code = 429;
    throw err;
  }

  // Check cache first
  const cached = getCached(query);
  if (cached) {
    quotaTracker.cacheHits++;
    console.log(`[YouTube] Cache HIT for "${query}" (${searchCache.size} cached, ${getQuotaStatus().remaining} quota remaining)`);
    return cached;
  }
  quotaTracker.cacheMisses++;

  // API call: search (100 units)
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    key: apiKey,
  });

  const searchData = await fetchJSON(`${YOUTUBE_API_BASE}/search?${params}`);
  trackQuota('search', 100);

  if (!searchData.items || searchData.items.length === 0) {
    setCache(query, []);
    return [];
  }

  // API call: video details + embed status (1 unit)
  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
  const detailParams = new URLSearchParams({
    part: 'contentDetails,status',
    id: videoIds,
    key: apiKey,
  });

  const detailData = await fetchJSON(`${YOUTUBE_API_BASE}/videos?${detailParams}`);
  trackQuota('videoDetails', 1);

  const detailMap = {};
  if (detailData.items) {
    for (const item of detailData.items) {
      detailMap[item.id] = {
        duration: parseDuration(item.contentDetails.duration),
        embeddable: item.status?.embeddable ?? false,
      };
    }
  }

  const results = searchData.items.map((item) => ({
    videoId: item.id.videoId,
    title: decodeHtmlEntities(item.snippet.title),
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: detailMap[item.id.videoId]?.duration || 0,
    embeddable: detailMap[item.id.videoId]?.embeddable ?? false,
    channelName: decodeHtmlEntities(item.snippet.channelTitle),
  }));

  // Cache the results
  setCache(query, results);
  console.log(`[YouTube] Cache MISS for "${query}" — ${getQuotaStatus().remaining} quota remaining`);

  return results;
}

module.exports = { searchVideos, getQuotaStatus, setDailyLimit };
