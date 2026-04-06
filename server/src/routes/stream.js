const express = require('express');
const { stream, uploadCookies, cookieStatus, debugFormats } = require('../controllers/streamController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/cookies/status', authenticate, cookieStatus);
router.post('/cookies/upload', authenticate, uploadCookies);
router.get('/debug/:videoId', debugFormats);
router.get('/:videoId', stream);

module.exports = router;
