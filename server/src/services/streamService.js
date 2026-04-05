const ytdl = require('@distube/ytdl-core');

async function getVideoInfo(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const info = await ytdl.getInfo(url);
  return info;
}

function getStream(videoId, range) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const options = {
    quality: 'highest',
    filter: 'audioandvideo',
  };
  if (range) {
    options.range = range;
  }
  return ytdl(url, options);
}

module.exports = { getVideoInfo, getStream };
