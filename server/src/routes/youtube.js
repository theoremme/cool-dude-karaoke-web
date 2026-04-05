const express = require('express');
const rateLimit = require('express-rate-limit');
const { search } = require('../controllers/youtubeController');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { error: 'Too many searches, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/search', searchLimiter, search);

module.exports = router;
