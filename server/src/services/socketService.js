const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Track disconnected users for reconnection grace period
// Map<memberId, { roomId, guestName, userId, timeoutId }>
const disconnectedUsers = new Map();
const RECONNECT_GRACE_MS = 30000; // 30 seconds to reconnect

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room (first time)
    socket.on('join-room', async ({ roomId, guestName, userId }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.guestName = guestName;
        socket.data.userId = userId;

        // Add to room members
        const member = await prisma.roomMember.create({
          data: {
            roomId,
            userId: userId || null,
            guestName: guestName || null,
          },
        });
        socket.data.memberId = member.id;

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          id: member.id,
          guestName,
          userId,
          joinedAt: member.joinedAt,
        });

        // Send current room state to the joining user
        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });
        const members = await prisma.roomMember.findMany({
          where: { roomId },
          select: { id: true, guestName: true, userId: true, joinedAt: true },
        });

        socket.emit('room-updated', { room, playlist, members });
      } catch (err) {
        console.error('join-room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Rejoin room after reconnection
    socket.on('rejoin-room', async ({ roomId, memberId, guestName, userId }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }

        // Cancel the cleanup timeout if still pending
        const pending = disconnectedUsers.get(memberId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          disconnectedUsers.delete(memberId);
        }

        // Check if member record still exists
        const existingMember = memberId
          ? await prisma.roomMember.findUnique({ where: { id: memberId } })
          : null;

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.guestName = guestName;
        socket.data.userId = userId;

        if (existingMember) {
          // Reuse existing member record, update last_seen
          socket.data.memberId = existingMember.id;
          await prisma.roomMember.update({
            where: { id: existingMember.id },
            data: { lastSeen: new Date() },
          });
        } else {
          // Member was cleaned up, create a new one
          const member = await prisma.roomMember.create({
            data: {
              roomId,
              userId: userId || null,
              guestName: guestName || null,
            },
          });
          socket.data.memberId = member.id;

          socket.to(roomId).emit('user-joined', {
            id: member.id,
            guestName,
            userId,
            joinedAt: member.joinedAt,
          });
        }

        // Send fresh room state
        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });
        const members = await prisma.roomMember.findMany({
          where: { roomId },
          select: { id: true, guestName: true, userId: true, joinedAt: true },
        });

        socket.emit('room-updated', { room, playlist, members });
        socket.emit('rejoined', { memberId: socket.data.memberId });
      } catch (err) {
        console.error('rejoin-room error:', err);
        socket.emit('error', { message: 'Failed to rejoin room' });
      }
    });

    // Leave room (intentional)
    socket.on('leave-room', async ({ roomId }) => {
      try {
        socket.leave(roomId);

        if (socket.data.memberId) {
          await prisma.roomMember.delete({
            where: { id: socket.data.memberId },
          }).catch(() => {});
        }

        socket.to(roomId).emit('user-left', {
          id: socket.data.memberId,
          guestName: socket.data.guestName,
        });

        socket.data.roomId = null;
        socket.data.memberId = null;
      } catch (err) {
        console.error('leave-room error:', err);
      }
    });

    // Add song
    socket.on('add-song', async ({ roomId, videoId, title, thumbnail, duration, channelName, addedByName }) => {
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }

        const lastItem = await prisma.playlistItem.findFirst({
          where: { roomId },
          orderBy: { position: 'desc' },
        });
        const position = lastItem ? lastItem.position + 1 : 0;

        await prisma.playlistItem.create({
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

        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });

        io.to(roomId).emit('playlist-updated', playlist);
      } catch (err) {
        console.error('add-song error:', err);
        socket.emit('error', { message: 'Failed to add song' });
      }
    });

    // Remove song
    socket.on('remove-song', async ({ roomId, itemId }) => {
      try {
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

        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });

        io.to(roomId).emit('playlist-updated', playlist);
      } catch (err) {
        console.error('remove-song error:', err);
        socket.emit('error', { message: 'Failed to remove song' });
      }
    });

    // Reorder song
    socket.on('reorder-song', async ({ roomId, itemId, newPosition }) => {
      try {
        const item = await prisma.playlistItem.findFirst({
          where: { id: itemId, roomId },
        });
        if (!item) return;

        const allItems = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });

        const filtered = allItems.filter((i) => i.id !== itemId);
        const clampedPos = Math.max(0, Math.min(newPosition, filtered.length));
        filtered.splice(clampedPos, 0, item);

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

        io.to(roomId).emit('playlist-updated', playlist);
      } catch (err) {
        console.error('reorder-song error:', err);
        socket.emit('error', { message: 'Failed to reorder song' });
      }
    });

    // Clear playlist
    socket.on('clear-playlist', async ({ roomId }) => {
      try {
        await prisma.playlistItem.deleteMany({ where: { roomId } });
        io.to(roomId).emit('playlist-updated', []);
      } catch (err) {
        console.error('clear-playlist error:', err);
        socket.emit('error', { message: 'Failed to clear playlist' });
      }
    });

    // Playback controls
    socket.on('play', ({ roomId }) => {
      socket.to(roomId).emit('playback-state', { isPlaying: true });
    });

    socket.on('pause', ({ roomId }) => {
      socket.to(roomId).emit('playback-state', { isPlaying: false });
    });

    socket.on('skip', async ({ roomId }) => {
      socket.to(roomId).emit('playback-state', { skip: true });
    });

    // Disconnect — grace period before cleanup
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      const { roomId, memberId, guestName, userId } = socket.data;

      if (roomId && memberId) {
        // Give the user time to reconnect before removing them
        const timeoutId = setTimeout(async () => {
          disconnectedUsers.delete(memberId);
          try {
            await prisma.roomMember.delete({
              where: { id: memberId },
            }).catch(() => {});

            io.to(roomId).emit('user-left', {
              id: memberId,
              guestName,
            });
          } catch (err) {
            console.error('disconnect cleanup error:', err);
          }
        }, RECONNECT_GRACE_MS);

        disconnectedUsers.set(memberId, {
          roomId,
          guestName,
          userId,
          timeoutId,
        });
      }
    });
  });
}

module.exports = { setupSocketHandlers };
