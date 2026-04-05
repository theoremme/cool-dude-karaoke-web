require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');
const youtubeRoutes = require('./src/routes/youtube');
const vibeRoutes = require('./src/routes/vibe');
const streamRoutes = require('./src/routes/stream');
const syncRoutes = require('./src/routes/sync');
const { setupSocketHandlers } = require('./src/services/socketService');

const app = express();
const httpServer = createServer(app);

// Socket.io - no CORS needed (same origin on Railway)
const io = new Server(httpServer, {
  transports: ['websocket', 'polling'],
});

// Middleware
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
app.use('/api/stream', streamRoutes);
app.use('/api/sync', syncRoutes);

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
