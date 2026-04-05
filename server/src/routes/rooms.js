const express = require('express');
const { body } = require('express-validator');
const { createRoom, getRoomByInviteCode, updateRoom, deleteRoom } = require('../controllers/roomController');
const { authenticate } = require('../middleware/auth');
const playlistRouter = require('./playlist');

const router = express.Router();

router.post(
  '/',
  authenticate,
  [body('name').trim().notEmpty().withMessage('Room name is required').isLength({ max: 100 })],
  createRoom
);

router.get('/:inviteCode', getRoomByInviteCode);

router.patch(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Room name must be 1-100 characters'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
  ],
  updateRoom
);

router.delete('/:id', authenticate, deleteRoom);

// Mount playlist routes under /api/rooms/:roomId/playlist
router.use('/:roomId/playlist', playlistRouter);

module.exports = router;
