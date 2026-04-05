const https = require('https');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

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

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    key: apiKey,
  });

  const searchData = await fetchJSON(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!searchData.items || searchData.items.length === 0) {
    return [];
  }

  // Get video durations
  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
  const detailParams = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds,
    key: apiKey,
  });

  const detailData = await fetchJSON(`${YOUTUBE_API_BASE}/videos?${detailParams}`);
  const durationMap = {};
  if (detailData.items) {
    for (const item of detailData.items) {
      durationMap[item.id] = parseDuration(item.contentDetails.duration);
    }
  }

  return searchData.items.map((item) => ({
    videoId: item.id.videoId,
    title: decodeHtmlEntities(item.snippet.title),
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: durationMap[item.id.videoId] || 0,
    channelName: decodeHtmlEntities(item.snippet.channelTitle),
  }));
}

module.exports = { searchVideos };
