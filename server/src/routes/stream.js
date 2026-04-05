const express = require('express');
const { stream } = require('../controllers/streamController');

const router = express.Router();

router.get('/:videoId', stream);

module.exports = router;
