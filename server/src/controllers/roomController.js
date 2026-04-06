const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');
const { generateInviteCode } = require('../utils/inviteCode');

const createRoom = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { name } = req.body;

    // Generate unique invite code with retry
    let inviteCode;
    let attempts = 0;
    while (attempts < 10) {
      inviteCode = generateInviteCode();
      const existing = await prisma.room.findUnique({ where: { inviteCode } });
      if (!existing) break;
      attempts++;
    }
    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate invite code' });
    }

    const room = await prisma.room.create({
      data: {
        name,
        inviteCode,
        hostId: req.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ room, inviteCode: room.inviteCode });
  } catch (err) {
    console.error('CreateRoom error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const getRoomByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const room = await prisma.room.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        host: { select: { id: true, name: true } },
        playlist: { orderBy: { position: 'asc' } },
        members: {
          select: { id: true, guestName: true, userId: true, joinedAt: true },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: 'Room is no longer active' });
    }

    res.json({ room, playlist: room.playlist, members: room.members });
  } catch (err) {
    console.error('GetRoom error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
};

const updateRoom = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { id } = req.params;
    const { name, settings } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.hostId !== req.userId) {
      return res.status(403).json({ error: 'Only the host can update this room' });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (settings !== undefined) data.settings = settings;

    const updated = await prisma.room.update({
      where: { id },
      data,
      include: {
        host: { select: { id: true, name: true } },
      },
    });

    res.json({ room: updated });
  } catch (err) {
    console.error('UpdateRoom error:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.hostId !== req.userId) {
      return res.status(403).json({ error: 'Only the host can delete this room' });
    }

    await prisma.room.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error('DeleteRoom error:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

const getMyRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        hostId: req.userId,
        isActive: true,
      },
      include: {
        _count: { select: { playlist: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rooms });
  } catch (err) {
    console.error('GetMyRooms error:', err);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
};

module.exports = { createRoom, getRoomByInviteCode, updateRoom, deleteRoom, getMyRooms };
