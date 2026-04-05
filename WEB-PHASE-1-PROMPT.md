# WEB APP - PHASE 1 PROMPT: Backend Foundation

## What to Do

1. **Create a new project folder** (e.g., `karaoke-room-app`)
2. **Open Claude Code** in that directory
3. **Copy and paste the prompt below**

---

## 📋 PROMPT FOR CLAUDE CODE:

I'm building a web-based collaborative karaoke platform. This is Phase 1: Backend Foundation.

Read the full specification in `karaoke-web-app-development-plan.md` for complete context.

**Phase 1 Goal:** Working REST API + WebSocket server + PostgreSQL database in a monorepo structure ready for Railway deployment.

**CRITICAL: Monorepo Structure for Railway**

Set up the project as a monorepo that will deploy to Railway as a single platform:

```
karaoke-room-app/
├── client/                    # React frontend (Phase 3)
│   └── (will be created later)
├── server/                    # Node.js backend (create now)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── server.js
│   └── package.json
├── .env.example
├── .gitignore
├── package.json               # Root package.json for Railway
└── README.md
```

Please help me build:

### 1. Root Package.json (for Railway deployment)
Create a root package.json with these scripts:
```json
{
  "name": "karaoke-room-app",
  "scripts": {
    "install:server": "cd server && npm install",
    "install:client": "cd client && npm install",
    "install:all": "npm run install:server && npm run install:client",
    "build": "npm run install:all && cd server && npx prisma generate",
    "start": "cd server && node server.js",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev"
  }
}
```

### 2. Server Setup with Production Static File Serving
Configure server.js to:
- Serve API routes at /api/*
- Serve Socket.io at /socket.io/*
- In production mode, serve built React files from ../client/dist
- Handle client-side routing (return index.html for non-API routes)

```javascript
// Example structure for server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

// Socket.io - NO CORS CONFIG NEEDED (same origin!)
const io = new Server(httpServer, {
  transports: ['websocket', 'polling']
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Production: Serve React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

httpServer.listen(process.env.PORT || 3000);
```

### 3. Database Schema (Prisma)
Implement these tables:
- **users** (id, email, password_hash, name, created_at, last_login)
- **rooms** (id, name, invite_code, host_id, is_active, created_at, expires_at, settings)
- **playlist_items** (id, room_id, video_id, title, thumbnail_url, duration, channel_name, position, added_by_name, added_at)
- **room_members** (id, room_id, user_id, guest_name, joined_at, last_seen)

Include proper indexes and foreign keys as specified in the dev plan.

### 4. Authentication System
- User registration (POST /api/auth/register)
- User login (POST /api/auth/login)
- JWT token generation
- Password hashing with bcrypt (salt rounds: 10)
- Auth middleware to protect routes
- Get current user (GET /api/auth/me)

### 5. Room Management API
- Create room (POST /api/rooms) - requires auth, generates 6-char uppercase alphanumeric invite code
- Get room by invite code (GET /api/rooms/:inviteCode) - public
- Delete room (DELETE /api/rooms/:id) - auth required, host only
- Update room (PATCH /api/rooms/:id) - auth required, host only

### 6. Playlist Management API
- Add song to playlist (POST /api/rooms/:roomId/playlist)
- Remove song (DELETE /api/rooms/:roomId/playlist/:itemId)
- Get playlist (GET /api/rooms/:roomId/playlist)
- Reorder playlist (PATCH /api/rooms/:roomId/playlist/reorder)

### 7. YouTube Search Integration
- YouTube Data API v3 service module
- Search endpoint (GET /api/youtube/search?q=query)
- Return: videoId, title, thumbnail, duration, channelName
- API key from environment variable
- Error handling for quota exceeded

### 8. WebSocket Server (Socket.io)
Set up Socket.io with these events:
- join-room (user joins a room)
- leave-room (user leaves)
- add-song (broadcast to all in room)
- remove-song (broadcast to all in room)
- play, pause, skip (playback controls, broadcast to room)
- playlist-updated (server → clients)
- room-updated (server → clients)
- user-joined, user-left

**IMPORTANT:** No CORS configuration needed for Socket.io since frontend and backend will be on the same origin (Railway)!

### 9. Error Handling & Validation
- Input validation for all endpoints
- Proper HTTP status codes
- Error response format: { error: 'message' }
- Rate limiting on search endpoint (10 req/min per IP)

### 10. Environment Variables
Create .env.example with:
```
DATABASE_URL=postgresql://user:password@localhost:5432/karaoke
JWT_SECRET=your-secret-key-here
YOUTUBE_API_KEY=your-youtube-api-key
NODE_ENV=development
PORT=3000
```

**Technical Requirements:**
- Use async/await (no callbacks)
- Proper error handling with try-catch
- Clean separation of concerns (routes, controllers, services)
- RESTful API design
- Secure password storage (bcrypt)
- JWT expiration: 7 days
- Invite codes: 6 uppercase alphanumeric chars (e.g., "ABC123")
- Must use httpServer.listen() not app.listen() (for Socket.io)

**Deliverables:**
1. Complete working backend server in /server folder
2. All endpoints tested and working
3. Prisma migrations ready
4. Root package.json with Railway deployment scripts
5. README with setup instructions
6. .env.example file
7. .gitignore (node_modules, .env, etc.)

After you build this, I should be able to:
- Run `npm install` in root
- Run `npm run install:server`
- Set up .env file in /server
- Run `cd server && npx prisma migrate dev` to create database
- Run `npm run dev:server` to start server
- Test all endpoints with Thunder Client/Postman
- See server ready to serve React build in production mode

Please provide complete, production-ready code with proper error handling and validation. Remember: NO CORS configuration needed since this will all be on one Railway deployment!

---

## ✅ Success Criteria for Phase 1

After following Claude's instructions, you should have:
- [ ] Server starts without errors
- [ ] Can register a new user
- [ ] Can login and receive JWT token
- [ ] Can create a room (returns invite code)
- [ ] Can get room details by invite code
- [ ] Can add songs to room playlist
- [ ] Can search YouTube and get results
- [ ] WebSocket server connects
- [ ] Database has all tables with proper relationships

## 🔧 Setup Steps You'll Do

1. Create project folder
2. Follow Claude's setup instructions
3. Install PostgreSQL locally (or use Docker)
4. Create .env file with your credentials
5. Run database migrations
6. Add your YouTube API key to .env
7. Start the server
8. Test endpoints with REST client

## ⏱️ Estimated Time
20-25 hours of development
(Claude will do most of the heavy lifting, you test and iterate)

## 📝 Testing

**Manual tests to run:**

```bash
# 1. Register user
POST http://localhost:3000/api/auth/register
Body: { "email": "test@test.com", "password": "password123", "name": "Test User" }

# 2. Login
POST http://localhost:3000/api/auth/login
Body: { "email": "test@test.com", "password": "password123" }
# Copy the token from response

# 3. Create room
POST http://localhost:3000/api/rooms
Headers: Authorization: Bearer <your-token>
Body: { "name": "Test Party" }
# Note the invite code

# 4. Get room
GET http://localhost:3000/api/rooms/<invite-code>

# 5. Add song
POST http://localhost:3000/api/rooms/<room-id>/playlist
Body: {
  "videoId": "1k8craCGpgs",
  "title": "Don't Stop Believin'",
  "thumbnail": "https://i.ytimg.com/vi/1k8craCGpgs/default.jpg",
  "duration": 252,
  "channelName": "Journey",
  "addedByName": "Sarah"
}

# 6. Search YouTube
GET http://localhost:3000/api/youtube/search?q=journey

# 7. Test WebSocket (use socket.io client tester or Postman)
Connect to: ws://localhost:3000
Emit: join-room with { roomId: "<room-id>", guestName: "Test" }
```

## 🐛 Common Issues & Solutions

**Issue: Can't connect to PostgreSQL**
- Solution: Make sure PostgreSQL is running
- Or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

**Issue: Prisma migrations failing**
- Solution: Delete prisma/migrations folder and run `npx prisma migrate dev --name init`

**Issue: YouTube API quota exceeded**
- Solution: You're testing too much, wait until tomorrow or get quota increase

**Issue: CORS errors**
- Solution: Make sure CORS is configured in server.js with your frontend URL

---

**Next Step**: Once Phase 1 is complete and all tests pass, proceed to Phase 2 (Real-Time Sync Enhancement)
