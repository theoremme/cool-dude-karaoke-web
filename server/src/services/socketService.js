const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Track disconnected users for reconnection grace period
// Map<memberId, { roomId, guestName, userId, timeoutId }>
const disconnectedUsers = new Map();
const RECONNECT_GRACE_MS = 30000; // 30 seconds to reconnect

// Track Amped host sockets per room for disconnect detection
// Map<roomId, { socketId, userId, timeoutId? }>
const ampedHosts = new Map();
const AMPED_FALLBACK_MS = 30000; // 30 seconds before fallback to unplugged

// Auto-close inactive rooms to free WebSocket connections and save costs
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 2 * 60 * 1000;      // warn 2 minutes before close
const CHECK_INTERVAL = 30 * 1000;          // check every 30 seconds
const roomActivity = new Map(); // roomId → { lastActivity: timestamp, warned: boolean }

function setupSocketHandlers(io) {
  // Track room activity and emit clear if warning was active
  function touchRoom(roomId, source) {
    const prev = roomActivity.get(roomId);
    const wasWarned = prev?.warned || false;
    const idleSeconds = prev ? Math.round((Date.now() - prev.lastActivity) / 1000) : 0;
    console.log(`[Activity] Room ${roomId} touched by "${source}" (was idle ${idleSeconds}s${wasWarned ? ', warning cleared' : ''})`);
    roomActivity.set(roomId, { lastActivity: Date.now(), warned: false });
    if (wasWarned) {
      io.to(roomId).emit('inactivity-cleared');
    }
  }

  // Check if socket user is the host of the given room
  async function isRoomHost(socket, roomId) {
    if (!socket.data.isAuthenticated || !socket.data.userId) return false;
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } });
      return room && room.hostId === socket.data.userId;
    } catch {
      return false;
    }
  }

  // Periodic check for inactive rooms
  setInterval(async () => {
    const now = Date.now();
    for (const [roomId, state] of roomActivity.entries()) {
      const idle = now - state.lastActivity;

      if (idle >= INACTIVITY_TIMEOUT) {
        // Auto-close the room
        try {
          const room = await prisma.room.findUnique({ where: { id: roomId } });
          if (!room || !room.isActive) {
            roomActivity.delete(roomId);
            continue;
          }

          const playlist = await prisma.playlistItem.findMany({
            where: { roomId },
            orderBy: { position: 'asc' },
          });

          await prisma.room.update({
            where: { id: roomId },
            data: { isActive: false },
          });

          io.to(roomId).emit('room-closed', {
            room,
            playlist,
            message: 'Room closed due to inactivity',
            inactivity: true,
          });

          roomActivity.delete(roomId);
          ampedHosts.delete(roomId);
          console.log(`[Auto-close] Room ${roomId} closed due to inactivity`);
        } catch (err) {
          console.error('[Auto-close] Error:', err);
          roomActivity.delete(roomId);
        }
      } else if (idle >= INACTIVITY_TIMEOUT - WARNING_BEFORE && !state.warned) {
        state.warned = true;
        const remainingSeconds = Math.ceil((INACTIVITY_TIMEOUT - idle) / 1000);
        io.to(roomId).emit('inactivity-warning', { remainingSeconds });
        console.log(`[Auto-close] Warning sent for room ${roomId}, ${remainingSeconds}s remaining`);
      }
    }
  }, CHECK_INTERVAL);

  // --- Socket authentication middleware ---
  // Validates JWT if provided. Guests connect without a token.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.userId;
        socket.data.isAuthenticated = true;
      } catch (err) {
        console.warn('[Socket Auth] Invalid token from', socket.id);
        return next(new Error('Authentication failed: invalid token'));
      }
    } else {
      socket.data.isAuthenticated = false;
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, socket.data.isAuthenticated ? `(auth: ${socket.data.userId})` : '(guest)');

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
        // Use authenticated userId if available, fall back to provided userId
        if (!socket.data.isAuthenticated) {
          socket.data.userId = userId;
        }

        // Add to room members
        const member = await prisma.roomMember.create({
          data: {
            roomId,
            userId: socket.data.userId || null,
            guestName: guestName || null,
          },
        });
        socket.data.memberId = member.id;

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          id: member.id,
          guestName,
          userId: socket.data.userId,
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
        touchRoom(roomId, 'join-room');
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
        if (!socket.data.isAuthenticated) {
          socket.data.userId = userId;
        }

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
              userId: socket.data.userId || null,
              guestName: guestName || null,
            },
          });
          socket.data.memberId = member.id;

          socket.to(roomId).emit('user-joined', {
            id: member.id,
            guestName,
            userId: socket.data.userId,
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

        // If this is the Amped host reconnecting, cancel fallback and restore
        const ampedEntry = ampedHosts.get(roomId);
        if (ampedEntry && ampedEntry.userId === socket.data.userId) {
          if (ampedEntry.timeoutId) {
            clearTimeout(ampedEntry.timeoutId);
          }
          ampedHosts.set(roomId, { socketId: socket.id, userId: socket.data.userId });
          io.to(roomId).emit('amped-reconnected', {});
          console.log(`[Amped] Host reconnected to room ${roomId}, fallback cancelled`);
        }

        touchRoom(roomId, 'rejoin-room');
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
    socket.on('add-song', async ({ roomId, videoId, title, thumbnail, duration, embeddable, channelName, addedByName }) => {
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
            embeddable: embeddable !== false,
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
        touchRoom(roomId, 'add-song');
      } catch (err) {
        console.error('add-song error:', err);
        socket.emit('error', { message: 'Failed to add song' });
      }
    });

    // Remove song (host only)
    socket.on('remove-song', async ({ roomId, itemId }) => {
      try {
        if (socket.data.isAuthenticated && !(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can remove songs' });
          return;
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

        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });

        io.to(roomId).emit('playlist-updated', playlist);
        touchRoom(roomId, 'remove-song');
      } catch (err) {
        console.error('remove-song error:', err);
        socket.emit('error', { message: 'Failed to remove song' });
      }
    });

    // Reorder song (host only)
    socket.on('reorder-song', async ({ roomId, itemId, newPosition }) => {
      try {
        if (socket.data.isAuthenticated && !(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can reorder songs' });
          return;
        }

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
        touchRoom(roomId, 'reorder-song');
      } catch (err) {
        console.error('reorder-song error:', err);
        socket.emit('error', { message: 'Failed to reorder song' });
      }
    });

    // Clear playlist (host only)
    socket.on('clear-playlist', async ({ roomId }) => {
      try {
        if (!(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can clear the playlist' });
          return;
        }

        await prisma.playlistItem.deleteMany({ where: { roomId } });
        io.to(roomId).emit('playlist-updated', []);
      } catch (err) {
        console.error('clear-playlist error:', err);
        socket.emit('error', { message: 'Failed to clear playlist' });
      }
    });

    // Close room (host only)
    socket.on('close-room', async ({ roomId }) => {
      try {
        if (!(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can close the room' });
          return;
        }

        roomActivity.delete(roomId);
        ampedHosts.delete(roomId);

        // Get the final playlist before closing
        const playlist = await prisma.playlistItem.findMany({
          where: { roomId },
          orderBy: { position: 'asc' },
        });

        const room = await prisma.room.findUnique({ where: { id: roomId } });

        // Mark room as inactive
        await prisma.room.update({
          where: { id: roomId },
          data: { isActive: false },
        });

        // Broadcast to all clients including the sender
        io.to(roomId).emit('room-closed', {
          room,
          playlist,
          message: 'The host has ended the session',
        });
      } catch (err) {
        console.error('close-room error:', err);
        socket.emit('error', { message: 'Failed to close room' });
      }
    });

    // Playback sync — host broadcasts current playback state to all guests
    socket.on('playback-sync', ({ roomId, currentIndex, isPlaying, mode }) => {
      socket.to(roomId).emit('playback-sync', { currentIndex, isPlaying, mode });
      touchRoom(roomId, 'playback-sync');
    });

    // Host confirms they're still active (from inactivity warning modal)
    socket.on('activity-ping', ({ roomId }) => {
      if (roomId) touchRoom(roomId, 'activity-ping');
    });

    // =============================================
    // Amped mode events
    // =============================================

    // Electron host signals Amped mode (host only)
    socket.on('amped-connect', async ({ roomId }) => {
      try {
        if (!(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can activate Amped mode' });
          return;
        }

        // Cancel any pending Amped fallback timer
        const existing = ampedHosts.get(roomId);
        if (existing?.timeoutId) {
          clearTimeout(existing.timeoutId);
        }

        // Track this socket as the Amped host
        ampedHosts.set(roomId, { socketId: socket.id, userId: socket.data.userId });

        // Update room in database
        await prisma.room.update({
          where: { id: roomId },
          data: { playbackMode: 'amped' },
        });

        // Broadcast mode change to all clients in the room
        io.to(roomId).emit('mode-changed', {
          mode: 'amped',
          triggeredBy: socket.data.userId,
        });

        touchRoom(roomId, 'amped-connect');
        console.log(`[Amped] Room ${roomId} switched to Amped mode by ${socket.data.userId}`);
      } catch (err) {
        console.error('amped-connect error:', err);
        socket.emit('error', { message: 'Failed to activate Amped mode' });
      }
    });

    // Electron host explicitly leaves Amped mode (host only)
    socket.on('amped-disconnect', async ({ roomId }) => {
      try {
        if (!(await isRoomHost(socket, roomId))) {
          socket.emit('error', { message: 'Only the host can deactivate Amped mode' });
          return;
        }

        // Clear Amped tracking
        const existing = ampedHosts.get(roomId);
        if (existing?.timeoutId) {
          clearTimeout(existing.timeoutId);
        }
        ampedHosts.delete(roomId);

        // Update room in database
        await prisma.room.update({
          where: { id: roomId },
          data: { playbackMode: 'unplugged' },
        });

        // Broadcast mode change
        io.to(roomId).emit('mode-changed', {
          mode: 'unplugged',
          triggeredBy: socket.data.userId,
        });

        touchRoom(roomId, 'amped-disconnect');
        console.log(`[Amped] Room ${roomId} switched to Unplugged mode by ${socket.data.userId}`);
      } catch (err) {
        console.error('amped-disconnect error:', err);
        socket.emit('error', { message: 'Failed to deactivate Amped mode' });
      }
    });

    // Web remote sends play/pause/skip command to Amped host
    socket.on('playback-command', ({ roomId, command, videoId, currentTime, index }) => {
      const amped = ampedHosts.get(roomId);
      if (!amped) {
        socket.emit('error', { message: 'No Amped host connected to this room' });
        return;
      }

      // Forward the command to the Amped host socket
      io.to(amped.socketId).emit('playback-command', {
        command,
        videoId,
        currentTime,
        index,
        fromUserId: socket.data.userId,
      });
      touchRoom(roomId, 'playback-command');
    });

    // Web player hands off playback to incoming Amped client
    socket.on('amped-handoff', ({ roomId, videoId, currentTime }) => {
      const amped = ampedHosts.get(roomId);
      if (!amped) {
        socket.emit('error', { message: 'No Amped host connected to this room' });
        return;
      }

      // Forward handoff data to the Amped host socket
      io.to(amped.socketId).emit('amped-handoff', {
        videoId,
        currentTime,
        fromUserId: socket.data.userId,
      });
      touchRoom(roomId, 'amped-handoff');
    });

    // =============================================
    // Disconnect handling (with Amped awareness)
    // =============================================

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      const { roomId, memberId, guestName, userId } = socket.data;

      // Check if this was the Amped host
      if (roomId) {
        const amped = ampedHosts.get(roomId);
        if (amped && amped.socketId === socket.id) {
          console.log(`[Amped] Amped host disconnected from room ${roomId}, starting ${AMPED_FALLBACK_MS / 1000}s countdown`);

          // Notify all clients that Amped host disconnected
          io.to(roomId).emit('amped-disconnected', {
            secondsUntilFallback: AMPED_FALLBACK_MS / 1000,
          });

          // Start fallback timer
          const timeoutId = setTimeout(async () => {
            // Amped host didn't reconnect — fall back to unplugged
            ampedHosts.delete(roomId);
            try {
              await prisma.room.update({
                where: { id: roomId },
                data: { playbackMode: 'unplugged' },
              });

              io.to(roomId).emit('mode-changed', {
                mode: 'unplugged',
                triggeredBy: 'timeout',
              });

              console.log(`[Amped] Room ${roomId} fell back to Unplugged after timeout`);
            } catch (err) {
              console.error('[Amped] Fallback error:', err);
            }
          }, AMPED_FALLBACK_MS);

          // Keep the amped entry but add the timeout so reconnect can cancel it
          ampedHosts.set(roomId, { ...amped, timeoutId });
        }
      }

      // Standard disconnect grace period for member cleanup
      if (roomId && memberId) {
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
