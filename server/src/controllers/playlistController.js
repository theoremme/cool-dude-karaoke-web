const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const getPlaylist = async (req, res) => {
  try {
    const { roomId } = req.params;

    const items = await prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
    });

    res.json({ items });
  } catch (err) {
    console.error('GetPlaylist error:', err);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
};

const addSong = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { roomId } = req.params;
    const { videoId, title, thumbnail, duration, channelName, addedByName } = req.body;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!room.isActive) {
      return res.status(410).json({ error: 'Room is no longer active' });
    }

    // Get the next position
    const lastItem = await prisma.playlistItem.findFirst({
      where: { roomId },
      orderBy: { position: 'desc' },
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    const item = await prisma.playlistItem.create({
      data: {
        roomId,
        videoId,
        title,
        thumbnailUrl: thumbnail,
        duration,
        channelName,
        addedByName,
        position,
      },
    });

    res.status(201).json({ playlistItem: item });
  } catch (err) {
    console.error('AddSong error:', err);
    res.status(500).json({ error: 'Failed to add song' });
  }
};

const removeSong = async (req, res) => {
  try {
    const { roomId, itemId } = req.params;

    const item = await prisma.playlistItem.findFirst({
      where: { id: itemId, roomId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Playlist item not found' });
    }

    await prisma.playlistItem.delete({ where: { id: itemId } });

    // Re-order remaining items
    const remaining = await prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await prisma.playlistItem.update({
          where: { id: remaining[i].id },
          data: { position: i },
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('RemoveSong error:', err);
    res.status(500).json({ error: 'Failed to remove song' });
  }
};

const reorderPlaylist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { roomId } = req.params;
    const { itemId, newPosition } = req.body;

    const item = await prisma.playlistItem.findFirst({
      where: { id: itemId, roomId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Playlist item not found' });
    }

    const allItems = await prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
    });

    // Remove the item from its current position
    const filtered = allItems.filter((i) => i.id !== itemId);
    // Insert at new position
    const clampedPos = Math.max(0, Math.min(newPosition, filtered.length));
    filtered.splice(clampedPos, 0, item);

    // Update all positions
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].position !== i) {
        await prisma.playlistItem.update({
          where: { id: filtered[i].id },
          data: { position: i },
        });
      }
    }

    const playlist = await prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
    });

    res.json({ playlist });
  } catch (err) {
    console.error('ReorderPlaylist error:', err);
    res.status(500).json({ error: 'Failed to reorder playlist' });
  }
};

module.exports = { getPlaylist, addSong, removeSong, reorderPlaylist };
