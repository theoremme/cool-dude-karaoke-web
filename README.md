# Karaoke Room App

Collaborative karaoke platform for in-person parties. Host creates a room, friends join via invite code from their phones, everyone adds songs, one main display shows the videos.

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, Prisma, PostgreSQL
- **Frontend:** React, Tailwind CSS, Vite (Phase 3)
- **Auth:** JWT + bcrypt
- **Real-time:** Socket.io WebSockets
- **Deployment:** Railway (single platform)

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or via Docker)
- YouTube Data API v3 key

### Installation

```bash
# Install server dependencies
npm run install:server

# Copy environment file and fill in your values
cp .env.example server/.env

# Run database migrations
cd server && npx prisma migrate dev --name init

# Start development server
cd .. && npm run dev:server
```

### Docker PostgreSQL (optional)

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres
```

Then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/karaoke` in your `.env`.

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user (requires auth)

### Rooms
- `POST /api/rooms` - Create room (requires auth)
- `GET /api/rooms/:inviteCode` - Get room by invite code
- `PATCH /api/rooms/:id` - Update room (host only)
- `DELETE /api/rooms/:id` - Delete room (host only)

### Playlist
- `GET /api/rooms/:roomId/playlist` - Get playlist
- `POST /api/rooms/:roomId/playlist` - Add song
- `DELETE /api/rooms/:roomId/playlist/:itemId` - Remove song
- `PATCH /api/rooms/:roomId/playlist/reorder` - Reorder playlist

### YouTube
- `GET /api/youtube/search?q=query` - Search YouTube videos

## WebSocket Events

### Client → Server
- `join-room` - Join a room
- `leave-room` - Leave a room
- `add-song` - Add song to playlist
- `remove-song` - Remove song from playlist
- `play` / `pause` / `skip` - Playback controls

### Server → Client
- `playlist-updated` - Playlist changed
- `room-updated` - Room state changed
- `user-joined` / `user-left` - Member changes
- `playback-state` - Playback state changed

## Production Deployment (Railway)

```bash
# Railway auto-runs these:
# Build: npm run build
# Start: npm start
```

Set environment variables in Railway dashboard:
- `DATABASE_URL` - Auto-set by Railway PostgreSQL addon
- `JWT_SECRET` - Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `YOUTUBE_API_KEY` - Your YouTube Data API v3 key
- `NODE_ENV` - `production`
