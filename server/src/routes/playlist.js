const express = require('express');
const { body } = require('express-validator');
const { getPlaylist, addSong, removeSong, reorderPlaylist } = require('../controllers/playlistController');

const router = express.Router({ mergeParams: true });

router.get('/', getPlaylist);

router.post(
  '/',
  [
    body('videoId').trim().notEmpty().withMessage('Video ID is required'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('thumbnail').optional().isString(),
    body('duration').optional().isInt({ min: 0 }),
    body('channelName').optional().trim().isLength({ max: 100 }),
    body('addedByName').optional().trim().isLength({ max: 50 }),
  ],
  addSong
);

router.delete('/:itemId', removeSong);

router.patch(
  '/reorder',
  [
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('newPosition').isInt({ min: 0 }).withMessage('New position must be a non-negative integer'),
  ],
  reorderPlaylist
);

module.exports = router;
