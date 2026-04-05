const express = require('express');
const rateLimit = require('express-rate-limit');
const { search, quotaStatus } = require('../controllers/youtubeController');
const { oauthRedirect, oauthCallback, createPlaylist, oauthStatus } = require('../controllers/youtubePlaylistController');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { error: 'Too many searches, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/search', searchLimiter, search);
router.get('/quota', quotaStatus);

// YouTube OAuth + playlist publishing
router.get('/oauth/status', oauthStatus);
router.get('/oauth/redirect', oauthRedirect);
router.get('/oauth/callback', oauthCallback);
router.post('/playlist/create', createPlaylist);

module.exports = router;
