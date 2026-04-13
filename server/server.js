require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');
const youtubeRoutes = require('./src/routes/youtube');
const vibeRoutes = require('./src/routes/vibe');
const syncRoutes = require('./src/routes/sync');
const adminRoutes = require('./src/routes/admin');
const { setupSocketHandlers } = require('./src/services/socketService');

const app = express();
const httpServer = createServer(app);

// CORS — needed for Electron (cross-origin) and local dev
const cors = require('cors');
app.use(cors());

// Socket.io — allow cross-origin connections from Electron
const io = new Server(httpServer, {
  transports: ['websocket', 'polling'],
  cors: { origin: '*' },
});

// Middleware
app.set('trust proxy', 1); // Railway runs behind a reverse proxy
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/vibe', vibeRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket handlers
setupSocketHandlers(io);

// Production: serve React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown — clean up on Railway SIGTERM or local Ctrl+C
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  const prisma = require('./src/lib/prisma');
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
