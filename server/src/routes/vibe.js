const express = require('express');
const rateLimit = require('express-rate-limit');
const { generate } = require('../controllers/vibeController');

const router = express.Router();

const vibeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 vibe generations per minute per IP
  message: { error: 'Too many vibe requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/generate', vibeLimiter, generate);

module.exports = router;
