# Karaoke Room Web App - Complete Development Plan

## 📋 Project Overview

**What You're Building:**
A web-based collaborative karaoke platform for in-person parties. Host creates a room, friends join via link from their phones, everyone adds songs, one main display shows the videos.

**Key Decisions Made:**
- ✅ Web app (not desktop) - mobile browser optimized
- ✅ Internal database playlist (no YouTube playlist polling)
- ✅ WebSocket real-time sync (minimal API usage)
- ✅ PWA for mobile (not native apps)
- ✅ Single main display (TV/projector) for playback
- ✅ Accept YouTube ads initially, Premium features later
- ✅ Freemium monetization model

---

## 🎯 Technical Stack

### Frontend
```
Framework: React (you already know this!)
Styling: Tailwind CSS (modern, responsive)
State: React Context + useReducer
Real-time: Socket.io client
Video: YouTube IFrame Player API
PWA: Workbox (for installable mobile experience)
Hosting: Railway (same platform as backend - no CORS issues!)
```

### Backend
```
Server: Node.js + Express
Real-time: Socket.io server (you're already familiar with this!)
Database: PostgreSQL (via Railway)
ORM: Prisma (type-safe, easy migrations)
Auth: JWT tokens + bcrypt
YouTube: YouTube Data API v3 (search only)
Hosting: Railway ($5-10/mo, includes database)
```

### Deployment Architecture
```
Single Platform: Railway
├── Serves React build (frontend)
├── Serves API endpoints (/api/*)
├── Serves Socket.io (/socket.io/*)
└── PostgreSQL database

One URL, no CORS, Socket.io works automatically!
```

### Development
```
Package Manager: npm
Bundler: Vite (faster than Create React App)
API Testing: Thunder Client or Postman
Database UI: Prisma Studio
Version Control: Git + GitHub
Structure: Monorepo (client/ and server/ folders)
```

---

## 📊 Database Schema

### Tables

```sql
-- Users (room hosts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Rooms (karaoke sessions)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL, -- e.g., "ABC123"
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Auto-delete after 24 hours
  settings JSONB DEFAULT '{}' -- Room customization
);

-- Playlist Items (songs in queue)
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  video_id VARCHAR(20) NOT NULL, -- YouTube video ID
  title VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(500),
  duration INTEGER, -- seconds
  channel_name VARCHAR(100),
  position INTEGER NOT NULL, -- Queue order
  added_by_name VARCHAR(50), -- Guest name (no account needed)
  added_at TIMESTAMP DEFAULT NOW()
);

-- Room Members (track who's connected)
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for guests
  guest_name VARCHAR(50), -- For users without accounts
  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_playlist_items_room_id ON playlist_items(room_id);
CREATE INDEX idx_playlist_items_position ON playlist_items(room_id, position);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
```

---

## 🏗️ Application Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│            Railway (Single Platform)                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  Express Server                                 │    │
│  │  - Serves React build files (/)                 │    │
│  │  - REST API (/api/*)                            │    │
│  │  - Socket.io Server (/socket.io/*)              │    │
│  │  - YouTube Service (search API calls)           │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  PostgreSQL Database                            │    │
│  │  - Users, Rooms, Playlist Items                 │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              YouTube Data API v3                         │
│              (Search only - no polling)                  │
└─────────────────────────────────────────────────────────┘

Benefits of Single Platform:
✅ No CORS issues (same origin)
✅ Socket.io works automatically
✅ One deployment, one dashboard
✅ Simpler environment variables
✅ Lower complexity
```

### Real-Time Sync Architecture

```
User Action Flow:

Guest adds song from phone:
  ↓
1. Click "Add to Queue" button
  ↓
2. Socket.io emits: 'add-song' event
  ↓
3. Server receives event
  ↓
4. Server validates + saves to PostgreSQL
  ↓
5. Server broadcasts: 'playlist-updated' to ALL in room
  ↓
6. All connected clients receive update
  ↓
7. React state updates → UI re-renders
  ↓
8. Everyone sees new song in queue (<100ms)

NO YouTube API polling needed!
Cost: 0 API quota units for sync
```

---

## 📁 Project Structure (Monorepo)

```
karaoke-room-app/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                    # Node.js backend
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

**Why Monorepo:**
- ✅ Single deployment to Railway
- ✅ Shared code/types between client and server (if needed)
- ✅ One git repository
- ✅ Server serves both API and React build files
- ✅ No CORS configuration needed

---

## 🚀 Development Phases

### Phase 1: Backend Foundation (Week 1)
**Goal:** Working API server with database

**What You'll Build:**
1. Express server setup
2. PostgreSQL database + Prisma ORM
3. User authentication (register, login, JWT)
4. Room CRUD endpoints (create, get, delete)
5. Playlist item endpoints (add, remove, reorder)
6. YouTube search integration
7. Basic error handling

**Deliverables:**
- REST API running locally
- Database with schema
- Postman/Thunder Client collection for testing
- YouTube search working via API

**Time Estimate:** 20-25 hours

---

### Phase 2: Real-Time Sync (Week 1-2)
**Goal:** WebSocket server for instant updates

**What You'll Build:**
1. Socket.io server setup
2. Room join/leave events
3. Add song event + broadcast
4. Remove song event + broadcast
5. Playback control events (play, pause, skip)
6. Connection tracking (who's in the room)
7. Reconnection handling

**Deliverables:**
- WebSocket server working
- Multiple clients can connect
- Events broadcast in real-time
- Test with Socket.io client tester

**Time Estimate:** 15-20 hours

---

### Phase 3: Frontend Core (Week 2)
**Goal:** React app integrated with backend

**What You'll Build:**
1. Vite + React + Tailwind setup in /client folder
2. Authentication UI (login, register)
3. Host dashboard (create room, see invite code)
4. Main display interface (video player + queue)
5. Socket.io client integration
6. YouTube search component
7. Playlist queue component
8. Basic routing (React Router)
9. **Server configuration to serve React build files in production**

**Server Setup for Frontend:**
```javascript
// server/server.js
const express = require('express');
const path = require('path');

const app = express();

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}
```

**Client Config (No CORS needed!):**
```javascript
// client/src/api.js
const API_BASE = ''; // Same origin!

export const api = {
  login: (credentials) => fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })
};

// client/src/socket.js
import io from 'socket.io-client';
const socket = io(); // Same origin!
```

**Deliverables:**
- Working React app
- Can create rooms
- Can search YouTube
- Can see playlist queue
- Real-time updates working
- **No CORS configuration needed!**

**Time Estimate:** 25-30 hours

---

### Phase 4: Guest Mobile Experience (Week 3)
**Goal:** Mobile-optimized guest interface

**What You'll Build:**
1. Mobile-responsive layout (Tailwind breakpoints)
2. Guest join flow (enter invite code or click link)
3. Guest name prompt (no account needed)
4. Touch-optimized search UI
5. Simplified queue view for mobile
6. Add to queue from mobile
7. See current playing song
8. PWA manifest + service worker

**Deliverables:**
- Mobile-friendly guest interface
- Works on iOS and Android browsers
- Can add to home screen (PWA)
- Real-time sync from mobile

**Time Estimate:** 20-25 hours

---

### Phase 5: Video Playback & Controls (Week 3-4)
**Goal:** YouTube player with full controls

**What You'll Build:**
1. YouTube IFrame Player integration
2. Auto-advance to next song
3. Play/pause controls
4. Skip to next song
5. Current song highlight in queue
6. Progress bar / time display
7. Volume control
8. Handle video errors (deleted, restricted)
9. Queue finished state

**Deliverables:**
- Videos play automatically
- Auto-advance works
- Host can control playback
- Errors handled gracefully

**Time Estimate:** 15-20 hours

---

### Phase 6: Room Management & Polish (Week 4)
**Goal:** Admin features and UX improvements

**What You'll Build:**
1. Room settings (rename, close)
2. Kick users (if needed)
3. Clear queue button
4. Reorder queue (drag-and-drop)
5. Delete individual songs
6. Room activity log
7. Guest list view
8. Better loading states
9. Error messages
10. Toast notifications

**Deliverables:**
- Full room admin controls
- Polished UX
- Professional UI
- Smooth interactions

**Time Estimate:** 20-25 hours

---

### Phase 7: Deployment to Railway (Week 4-5)
**Goal:** Live production app on Railway

**What You'll Build:**
1. Root package.json with build scripts
2. Production environment configuration
3. Railway project setup
4. PostgreSQL database provisioning
5. Environment variables configuration
6. Deployment pipeline from GitHub
7. Custom domain setup (optional)
8. SSL/HTTPS (automatic with Railway)
9. Performance testing
10. Mobile device testing

**Root package.json Scripts:**
```json
{
  "name": "karaoke-room-app",
  "scripts": {
    "install:server": "cd server && npm install",
    "install:client": "cd client && npm install",
    "install:all": "npm run install:server && npm run install:client",
    "build": "cd client && npm run build && cd ../server && npx prisma generate",
    "start": "cd server && node server.js",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev"
  }
}
```

**Railway Deployment Steps:**

**Option A: GitHub Deploy (Recommended)**
```
1. Push monorepo to GitHub
2. Visit railway.app and sign up
3. "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Node.js
6. Configure build settings:
   - Build Command: npm run build
   - Start Command: npm start
   - Root Directory: / (leave default)
7. Add PostgreSQL database:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway auto-sets DATABASE_URL
8. Add environment variables:
   - JWT_SECRET: (generate a random 256-bit string)
   - YOUTUBE_API_KEY: (your YouTube API key)
   - NODE_ENV: production
9. Deploy!
10. Get your URL: https://your-app.up.railway.app
```

**Option B: Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add PostgreSQL database
railway add --database postgresql

# Set environment variables
railway variables set JWT_SECRET=your-secret
railway variables set YOUTUBE_API_KEY=your-key
railway variables set NODE_ENV=production

# Deploy
railway up

# Open in browser
railway open
```

**Environment Variables Setup:**
```
Required variables in Railway:
- DATABASE_URL: (auto-set when you add PostgreSQL)
- JWT_SECRET: Random 256-bit string (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
- YOUTUBE_API_KEY: Your YouTube Data API v3 key
- NODE_ENV: production
- PORT: (auto-set by Railway)
```

**Custom Domain (Optional):**
```
1. Railway Dashboard → Your Project → Settings
2. Click "Domains"
3. Click "Generate Domain" (free yourapp.up.railway.app)
4. Or click "Custom Domain" to add your own
5. If using custom domain:
   - Add your domain (e.g., karaoke-room.com)
   - Update DNS records (Railway provides instructions)
   - SSL auto-configured
```

**Testing Production Deployment:**
```
1. Visit your Railway URL
2. Create account
3. Create room
4. Open room link on mobile device
5. Add songs from mobile
6. Verify real-time sync works
7. Test video playback
8. Monitor Railway logs for errors
```

**Deliverables:**
- Live app at Railway URL
- PostgreSQL database in production
- All environment variables configured
- SSL/HTTPS enabled (automatic)
- Ready for real users
- **Single URL serves everything (no CORS!)**

**Time Estimate:** 10-15 hours

**Cost:**
- Free $5/month credit (covers MVP usage)
- After credit: ~$5-10/month (scales with usage)
- PostgreSQL included (no separate charge)

---

### Phase 8: Premium Features (Week 5-6, Optional)
**Goal:** Monetization and advanced features

**What You'll Build:**
1. Stripe integration (payment)
2. Free vs Pro tier logic
3. Room limits for free tier
4. Analytics dashboard
5. Room history
6. Export playlist to YouTube (optional)
7. Custom room themes
8. Room templates
9. Chrome extension for Premium ad-free (advanced)

**Deliverables:**
- Freemium model working
- Stripe payments integrated
- Premium features gated
- Analytics tracking

**Time Estimate:** 30-40 hours

---

## 📱 User Experience Flows

### Flow 1: Host Creates Room

```
1. Host visits yourapp.com
2. Clicks "Create Account" (if new) or "Login"
3. Dashboard shows: [+ Create New Room]
4. Clicks button → Modal opens
   ┌─────────────────────────────┐
   │ Create Karaoke Room         │
   │                             │
   │ Room Name: [____________]   │
   │                             │
   │ [Create Room]               │
   └─────────────────────────────┘
5. Room created → Redirected to room page
6. See invite code: ABC123
7. Share link: yourapp.com/room/ABC123
8. Main display interface loads
   ┌─────────────────────────────────┐
   │ 🎤 Friday Night Karaoke         │
   │ Invite Code: ABC123             │
   ├─────────────────────────────────┤
   │ [Video Player - No song yet]    │
   ├─────────────────────────────────┤
   │ Queue: Empty                    │
   │ Share this link to add songs:   │
   │ yourapp.com/room/ABC123         │
   └─────────────────────────────────┘
```

### Flow 2: Guest Joins & Adds Song

```
1. Guest receives link via text: yourapp.com/room/ABC123
2. Clicks link → Opens in mobile browser
3. Prompt appears:
   ┌─────────────────────────────┐
   │ Join Friday Night Karaoke   │
   │                             │
   │ Your Name: [____________]   │
   │                             │
   │ [Join Room]                 │
   └─────────────────────────────┘
4. Enters name "Sarah" → Joins room
5. Mobile interface loads:
   ┌─────────────────────────────┐
   │ 🎤 Friday Night Karaoke     │
   ├─────────────────────────────┤
   │ 🔍 [Search songs_______] 🔎 │
   ├─────────────────────────────┤
   │ Now Playing:                │
   │ ▶️ (No song yet)            │
   ├─────────────────────────────┤
   │ Queue: Empty                │
   │ Be the first to add a song! │
   └─────────────────────────────┘
6. Sarah searches "don't stop believin"
7. Results appear:
   ┌─────────────────────────────┐
   │ Search Results:             │
   │                             │
   │ [Thumbnail]                 │
   │ Don't Stop Believin'        │
   │ Journey • 4:12              │
   │ [+ Add to Queue]            │
   │                             │
   │ [Thumbnail]                 │
   │ Don't Stop Believin' (Live) │
   │ Journey • 5:34              │
   │ [+ Add to Queue]            │
   └─────────────────────────────┘
8. Clicks "+ Add to Queue"
9. Song added → WebSocket broadcasts update
10. Main display (host's screen) updates instantly
11. Sarah's phone shows: "Added to queue (#1)"
```

### Flow 3: Playback Begins

```
1. Host sees song in queue on main display
2. Clicks [▶ Start Party]
3. YouTube player loads first video
4. Video plays automatically
5. All connected devices see:
   ┌─────────────────────────────┐
   │ Now Playing:                │
   │ ▶️ Don't Stop Believin'     │
   │    Journey • 1:23 / 4:12    │
   ├─────────────────────────────┤
   │ Up Next:                    │
   │ 1. Sweet Caroline           │
   │ 2. Livin' on a Prayer       │
   └─────────────────────────────┘
6. Video ends → Auto-advances to next
7. Cycle continues until queue empty
```

---

## 🔑 API Endpoints Reference

### Authentication

```
POST /api/auth/register
Body: { email, password, name }
Response: { token, user }

POST /api/auth/login
Body: { email, password }
Response: { token, user }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user }
```

### Rooms

```
POST /api/rooms
Headers: Authorization: Bearer <token>
Body: { name }
Response: { room, inviteCode }

GET /api/rooms/:inviteCode
Response: { room, playlist, members }

DELETE /api/rooms/:id
Headers: Authorization: Bearer <token>
Response: { success }

PATCH /api/rooms/:id
Headers: Authorization: Bearer <token>
Body: { name, settings }
Response: { room }
```

### Playlist

```
POST /api/rooms/:roomId/playlist
Body: { videoId, title, thumbnail, duration, addedByName }
Response: { playlistItem }

DELETE /api/rooms/:roomId/playlist/:itemId
Response: { success }

PATCH /api/rooms/:roomId/playlist/reorder
Body: { itemId, newPosition }
Response: { playlist }

GET /api/rooms/:roomId/playlist
Response: { items[] }
```

### YouTube Search

```
GET /api/youtube/search?q=don't+stop+believin
Response: { 
  items: [
    {
      videoId: "1k8craCGpgs",
      title: "Don't Stop Believin'",
      thumbnail: "https://...",
      duration: 252,
      channelName: "Journey"
    }
  ]
}
```

---

## 🔌 WebSocket Events

**Socket.io Setup (No CORS Configuration Needed!):**

```javascript
// server/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Socket.io - No CORS config needed on same domain!
const io = new Server(httpServer, {
  // Just ensure both transports are available
  transports: ['websocket', 'polling']
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // ... your event handlers
});

// Must use httpServer.listen(), not app.listen()!
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Client Connection (Simple!):**
```javascript
// client/src/socket.js
import { io } from 'socket.io-client';

// No URL needed - same origin!
const socket = io({
  transports: ['websocket', 'polling']
});

export default socket;
```

### Client → Server Events

```javascript
// Join a room
socket.emit('join-room', { 
  roomId: 'abc-123', 
  guestName: 'Sarah' 
});

// Add song to playlist
socket.emit('add-song', {
  roomId: 'abc-123',
  videoId: '1k8craCGpgs',
  title: 'Don\'t Stop Believin\'',
  thumbnail: 'https://...',
  duration: 252,
  addedByName: 'Sarah'
});

// Remove song
socket.emit('remove-song', {
  roomId: 'abc-123',
  itemId: 'item-uuid'
});

// Playback controls
socket.emit('play', { roomId: 'abc-123' });
socket.emit('pause', { roomId: 'abc-123' });
socket.emit('skip', { roomId: 'abc-123' });

// Leave room
socket.emit('leave-room', { roomId: 'abc-123' });
```

### Server → Client Events

```javascript
// Room state updated
socket.on('room-updated', (room) => {
  // Update local state
});

// Playlist updated
socket.on('playlist-updated', (playlist) => {
  // Update queue display
});

// Playback state changed
socket.on('playback-state', (state) => {
  // { isPlaying, currentVideoId, timestamp }
});

// User joined
socket.on('user-joined', (user) => {
  // { guestName, joinedAt }
});

// User left
socket.on('user-left', (userId) => {
  // Remove from members list
});

// Error
socket.on('error', (error) => {
  // Display error message
});
```

---

## 🎨 UI/UX Design Principles

### Main Display (TV/Projector)

**Goals:**
- Large, readable from across room
- Video is focal point
- Queue is visible but not distracting
- Minimal chrome

**Layout:**
```
┌───────────────────────────────────────┐
│  🎤 Friday Night Karaoke  [ABC123]    │ ← Header (room name + code)
├───────────────────────────────────────┤
│                                       │
│                                       │
│         [Video Player]                │ ← 70% of screen
│           16:9 ratio                  │
│                                       │
│                                       │
├───────────────────────────────────────┤
│  Now Playing: Don't Stop Believin'    │ ← Current song info
│  Journey • 1:23 / 4:12                │
├───────────────────────────────────────┤
│  Up Next:                             │
│  1. ♪ Sweet Caroline - Neil Diamond   │ ← Queue (next 5 songs)
│  2. ♪ Livin' on a Prayer - Bon Jovi   │
│  3. ♪ Pour Some Sugar - Def Leppard   │
│                                       │
│  + 3 more in queue                    │
└───────────────────────────────────────┘
```

### Mobile Guest Interface

**Goals:**
- One-handed operation
- Large touch targets
- Search is primary action
- Current queue visible

**Layout:**
```
┌─────────────────────────────┐
│ 🎤 Friday Night Karaoke     │ ← Room name
│ 👥 8 people singing         │ ← Active members
├─────────────────────────────┤
│                             │
│ 🔍 [Search_________] 🔎     │ ← Search (always visible)
│                             │
├─────────────────────────────┤
│ ▶️ Now Playing:             │
│ Don't Stop Believin'        │ ← Currently playing
│ Journey                     │
├─────────────────────────────┤
│ Up Next:                    │
│                             │
│ 1. Sweet Caroline           │
│    Neil Diamond             │ ← Compact queue view
│                             │
│ 2. Livin' on a Prayer       │
│    Bon Jovi                 │
│                             │
│ [View Full Queue (12)]      │
└─────────────────────────────┘
```

### Search Results (Mobile)

```
┌─────────────────────────────┐
│ ← Back    Search Results    │
├─────────────────────────────┤
│ [Thumbnail]  Don't Stop...  │
│              Journey        │
│              4:12           │
│              [+ Add] ✓      │ ← Large button
├─────────────────────────────┤
│ [Thumbnail]  Don't Stop...  │
│              (Live)         │
│              Journey        │
│              5:34           │
│              [+ Add]        │
└─────────────────────────────┘
```

---

## 📊 API Quota Management

### Quota Budget (10,000 units/day default)

**Cost per operation:**
```
YouTube Search: 100 units per search
Video Details: 1 unit per video (if needed)
Playlist Operations: 0 units (no YouTube playlist!)
```

**Usage estimation:**
```
Typical Room Session (3 hours, 10 guests):
- 30 searches total (10 guests × 3 searches avg)
  = 30 × 100 = 3,000 units
- 20 videos added (details fetch)
  = 20 × 1 = 20 units
Total: ~3,020 units per room session

Daily capacity:
10,000 units ÷ 3,020 units/room = ~3 simultaneous room sessions

With 100K quota (after increase request):
100,000 ÷ 3,020 = ~33 simultaneous room sessions
```

### Quota Optimization Strategies

**1. Search Result Caching**
```javascript
// Cache popular searches in Redis or PostgreSQL
const cacheKey = `search:${query}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // 0 API units
}

// Only call API if not cached
const results = await youtubeAPI.search(query); // 100 units
await redis.setex(cacheKey, 3600, JSON.stringify(results)); // Cache 1 hour
return results;
```

**Savings:** 50-70% reduction (many people search same songs)

**2. Debounced Search**
```javascript
// Don't search on every keystroke
const debouncedSearch = debounce(async (query) => {
  const results = await api.search(query);
  setResults(results);
}, 500); // Wait 500ms after user stops typing
```

**Savings:** 80% reduction in API calls

**3. Request Quota Increase Immediately**
```
Day 1: Request 100,000 units/day
Justification:
"Building collaborative karaoke app for in-person parties.
Expected usage: 20-50 rooms/day at launch.
Each room: ~3,000 units (search only, no polling).
Need 100K to support initial user base."

Usually approved in 24-48 hours.
```

**4. Monitor and Alert**
```javascript
// Track quota usage
let quotaUsedToday = 0;

async function makeAPICall(operation, cost) {
  if (quotaUsedToday + cost > QUOTA_LIMIT * 0.9) {
    // Alert admin at 90%
    await sendAlert('Quota almost exhausted');
  }
  
  quotaUsedToday += cost;
  return await operation();
}

// Reset daily
cron.schedule('0 0 * * *', () => {
  quotaUsedToday = 0;
});
```

---

## 🔒 Security Considerations

### Authentication
```javascript
// Hash passwords with bcrypt
const passwordHash = await bcrypt.hash(password, 10);

// JWT tokens with expiration
const token = jwt.sign(
  { userId: user.id }, 
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Validate tokens on protected routes
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Room Access Control
```javascript
// Anyone with invite code can join (guest access)
// Only host can delete room
const deleteRoom = async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id }
  });
  
  if (room.hostId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  await prisma.room.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};
```

### Rate Limiting
```javascript
// Prevent abuse
const rateLimit = require('express-rate-limit');

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 searches per minute per IP
  message: 'Too many searches, please try again later'
});

app.get('/api/youtube/search', searchLimiter, searchHandler);
```

### Input Validation
```javascript
// Sanitize user inputs
const { body, validationResult } = require('express-validator');

app.post('/api/rooms',
  body('name').trim().isLength({ min: 1, max: 100 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Create room...
  }
);
```

### Environment Variables
```javascript
// Never commit secrets
// .env file (add to .gitignore)
DATABASE_URL=postgresql://...
JWT_SECRET=random-256-bit-secret
YOUTUBE_API_KEY=AIzaSyC...
NODE_ENV=production
PORT=3000
```

**Note:** No CORS configuration needed since frontend and backend are served from the same origin on Railway!

---

## 🚀 Railway Deployment Guide

### Preparation Checklist

**Before deploying:**
- [ ] All tests passing locally
- [ ] Environment variables documented in .env.example
- [ ] Database migrations working
- [ ] React build working (`cd client && npm run build`)
- [ ] Server can serve static files in production mode
- [ ] Code committed and pushed to GitHub

### Root Package.json Setup

```json
{
  "name": "karaoke-room-app",
  "version": "1.0.0",
  "scripts": {
    "install:server": "cd server && npm install",
    "install:client": "cd client && npm install", 
    "install:all": "npm run install:server && npm run install:client",
    "build": "npm run install:all && cd client && npm run build && cd ../server && npx prisma generate && npx prisma migrate deploy",
    "start": "cd server && node server.js",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### Server Configuration for Production

```javascript
// server/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/youtube', youtubeRoutes);

// Socket.io handlers
io.on('connection', (socket) => {
  // Your socket handlers
});

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from client build
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // All other GET requests return React app (for client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Railway Deployment Steps

**Method 1: GitHub Integration (Recommended)**

```
1. Push your code to GitHub:
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main

2. Go to railway.app and sign in with GitHub

3. Click "New Project"

4. Choose "Deploy from GitHub repo"

5. Select your karaoke-room-app repository

6. Railway will auto-detect Node.js

7. Configure service:
   - Service Name: karaoke-room-app
   - Build Command: npm run build
   - Start Command: npm start
   - Root Directory: / (leave as default)

8. Add PostgreSQL:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically sets DATABASE_URL env var

9. Add environment variables:
   Click "Variables" tab and add:
   - JWT_SECRET: (generate with: openssl rand -base64 32)
   - YOUTUBE_API_KEY: your-youtube-api-key
   - NODE_ENV: production

10. Deploy:
    Railway automatically deploys on git push
    
11. Get your URL:
    Click "Settings" → "Domains" → "Generate Domain"
    You get: https://your-app-production.up.railway.app
```

**Method 2: Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd karaoke-room-app
railway init

# Create PostgreSQL database
railway add

# Choose "PostgreSQL" from the list

# Set environment variables
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set YOUTUBE_API_KEY=your-key
railway variables set NODE_ENV=production

# Deploy
railway up

# Open in browser
railway open
```

### Post-Deployment Verification

**1. Check deployment logs:**
```
Railway Dashboard → Your Project → Deployments → View Logs

Look for:
✅ "Server running on port 3000" (or assigned PORT)
✅ "Database connected successfully"
✅ No error messages
```

**2. Test the app:**
```
Visit your Railway URL
- Should see React app load
- Create account → Should work
- Login → Should receive JWT token
- Create room → Should get invite code
- Open /api/health → Should return 200 OK
```

**3. Test Socket.io:**
```
Open browser console on your app
Should see: "Socket connected" (or similar)
Add a song → Should update in real-time
```

**4. Test on mobile:**
```
Visit Railway URL on phone
Join room via invite code
Add song from mobile
Verify it appears on desktop instantly
```

### Custom Domain Setup (Optional)

```
1. Buy domain (Namecheap, Google Domains, etc.)
   Example: karaoke-room.com

2. In Railway Dashboard:
   Settings → Domains → Custom Domain

3. Add your domain:
   Enter: karaoke-room.com

4. Railway provides DNS records:
   Type: CNAME
   Name: @ (or www)
   Value: <railway-provided-value>

5. Add records to your domain provider

6. Wait for DNS propagation (5 mins - 24 hours)

7. Railway automatically provisions SSL certificate

8. Access at https://karaoke-room.com
```

### Monitoring and Logs

**View logs in Railway:**
```
Dashboard → Your Project → Deployments → View Logs

Monitor for:
- API request errors
- Database connection issues  
- Socket.io connection problems
- YouTube API quota warnings
```

**Set up error alerts (optional):**
```
Consider integrating:
- Sentry (error tracking)
- LogRocket (session replay)
- Better Stack (log management)

Railway supports webhook notifications for deploy events
```

### Environment Variables Reference

```
Required in Railway:
DATABASE_URL         Auto-set by Railway PostgreSQL
PORT                 Auto-set by Railway
NODE_ENV            Set to "production"
JWT_SECRET          Generate with: openssl rand -base64 32
YOUTUBE_API_KEY     Your YouTube Data API v3 key

Optional:
SENTRY_DSN          For error tracking
LOG_LEVEL           debug, info, warn, error
```

### Troubleshooting

**Build fails:**
```
Check Railway logs for specific error
Common issues:
- Missing dependencies in package.json
- Build script errors
- Incorrect paths in server.js

Solution: Fix locally, commit, push
Railway auto-rebuilds on push
```

**Database connection fails:**
```
Check DATABASE_URL is set correctly
Railway should auto-set this when you add PostgreSQL

Manual check:
railway variables → Should see DATABASE_URL
```

**Socket.io not connecting:**
```
Check browser console for errors
Verify transports are set: ['websocket', 'polling']
Check Railway logs for connection attempts
```

**Static files not loading:**
```
Verify build ran successfully:
- Client build should be in client/dist/
- Server should have correct path: ../client/dist

Check server.js has production static file serving code
```

### Scaling (When You Grow)

**Railway auto-scales** but you can configure:

```
1. Railway Dashboard → Your Project → Settings

2. Resources:
   - Increase RAM (default 512MB → 1GB, 2GB, etc.)
   - Increase CPU (default 1 vCPU → 2 vCPU, etc.)

3. Database:
   - Upgrade PostgreSQL plan for more storage/connections
   
4. Multiple instances:
   - Railway can run multiple instances for high availability
   - Configure in Settings → Replicas
```

**Cost scales with usage:**
- Free: $5 credit/month
- Typical small app: $5-10/month
- Growing app (100+ rooms/day): $20-50/month

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// Example: Test room creation
describe('Room API', () => {
  it('should create room with valid data', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Test Room' });
    
    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('Test Room');
    expect(res.body.inviteCode).toHaveLength(6);
  });
  
  it('should reject room creation without auth', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({ name: 'Test Room' });
    
    expect(res.status).toBe(401);
  });
});
```

### Integration Tests
```javascript
// Test WebSocket + Database integration
describe('Real-time playlist sync', () => {
  it('should broadcast song addition to all clients', (done) => {
    const client1 = io('http://localhost:3000');
    const client2 = io('http://localhost:3000');
    
    client1.emit('join-room', { roomId: 'test-room' });
    client2.emit('join-room', { roomId: 'test-room' });
    
    client2.on('playlist-updated', (playlist) => {
      expect(playlist).toHaveLength(1);
      expect(playlist[0].title).toBe('Test Song');
      done();
    });
    
    client1.emit('add-song', {
      roomId: 'test-room',
      videoId: 'abc123',
      title: 'Test Song'
    });
  });
});
```

### Manual Testing Checklist

**Before launch:**
- [ ] Create account and login
- [ ] Create room and verify invite code works
- [ ] Join room from mobile device
- [ ] Add song from mobile
- [ ] Verify song appears on main display instantly
- [ ] Play video and verify auto-advance
- [ ] Test skip functionality
- [ ] Test delete song
- [ ] Test multiple users adding simultaneously
- [ ] Test room expiration (if implemented)
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test on different devices (iPhone, Android)
- [ ] Test PWA installation on mobile

---

## 💰 Monetization Implementation

### Free Tier Limits
```javascript
// Middleware to check tier
const checkRoomLimit = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { rooms: true }
  });
  
  if (!user.isPremium && user.rooms.length >= 3) {
    return res.status(403).json({ 
      error: 'Room limit reached',
      message: 'Upgrade to Pro for unlimited rooms',
      upgradeUrl: '/pricing'
    });
  }
  
  next();
};

app.post('/api/rooms', authenticate, checkRoomLimit, createRoom);
```

### Stripe Integration
```javascript
// Add to user schema
premium_until TIMESTAMP,
stripe_customer_id VARCHAR(255)

// Stripe checkout session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/subscribe', authenticate, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    customer_email: req.user.email,
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_...', // Your Stripe price ID
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${FRONTEND_URL}/success`,
    cancel_url: `${FRONTEND_URL}/pricing`,
  });
  
  res.json({ sessionId: session.id });
});

// Webhook to handle successful payment
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await prisma.user.update({
      where: { email: session.customer_email },
      data: { 
        isPremium: true,
        premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
  }
  
  res.json({ received: true });
});
```

### Pricing Page
```jsx
// components/Pricing.jsx
const Pricing = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="border rounded-lg p-8">
        <h3 className="text-2xl font-bold">Free</h3>
        <p className="text-4xl font-bold mt-4">$0</p>
        <ul className="mt-6 space-y-3">
          <li>✓ 3 rooms per month</li>
          <li>✓ Up to 10 guests per room</li>
          <li>✓ All core features</li>
          <li>✓ Mobile optimized</li>
        </ul>
        <button className="mt-6 w-full btn-secondary">
          Current Plan
        </button>
      </div>
      
      <div className="border-2 border-blue-500 rounded-lg p-8">
        <h3 className="text-2xl font-bold">Pro</h3>
        <p className="text-4xl font-bold mt-4">
          $5<span className="text-lg">/month</span>
        </p>
        <ul className="mt-6 space-y-3">
          <li>✓ Unlimited rooms</li>
          <li>✓ Unlimited guests</li>
          <li>✓ Priority support</li>
          <li>✓ Room analytics</li>
          <li>✓ Custom themes</li>
          <li>✓ Export playlists</li>
        </ul>
        <button 
          className="mt-6 w-full btn-primary"
          onClick={() => handleUpgrade()}
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
};
```

---

## 📈 Launch Checklist

### Pre-Launch (Week 5)
- [ ] Backend deployed and stable
- [ ] Frontend deployed and accessible
- [ ] Database backups configured
- [ ] Error monitoring (Sentry or similar)
- [ ] Analytics (Google Analytics or Plausible)
- [ ] Domain name purchased and configured
- [ ] SSL certificate active
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] YouTube API quota increase approved (100K)
- [ ] Load testing completed (10+ simultaneous rooms)
- [ ] Mobile testing on iOS and Android
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

### Launch Day
- [ ] Create demo video/GIF
- [ ] Write launch post (Product Hunt, Reddit, etc.)
- [ ] Share with friends and family
- [ ] Monitor error logs
- [ ] Monitor API quota usage
- [ ] Monitor server performance
- [ ] Be ready to fix bugs quickly

### Post-Launch (Week 6+)
- [ ] Collect user feedback
- [ ] Fix reported bugs
- [ ] Monitor conversion (free → paid)
- [ ] Analyze usage patterns
- [ ] Plan next features
- [ ] Consider marketing strategy

---

## 🎯 Success Metrics

### Technical Metrics
- API quota usage: <80% of limit
- Response time: <200ms for API calls
- WebSocket latency: <100ms
- Uptime: >99.5%
- Error rate: <1%

### User Metrics
- Rooms created per day
- Average room duration
- Songs added per room
- Guests per room
- Return users (create multiple rooms)
- Free → Pro conversion rate

### Business Metrics (if monetizing)
- Monthly recurring revenue (MRR)
- Churn rate
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## 🔮 Future Enhancements

### Phase 9: Advanced Features (Post-Launch)
- [ ] Spotify integration (lyrics + audio)
- [ ] Multiple playback modes (video/audio only/lyrics)
- [ ] Voting system (guests vote on next song)
- [ ] Song queue shuffle
- [ ] Karaoke mode (lyrics overlay on video)
- [ ] Room themes and customization
- [ ] Playlist templates (80s night, rock classics, etc.)
- [ ] Social sharing (share room on social media)
- [ ] Room analytics (most popular songs, peak times)
- [ ] Chrome extension for Premium ad-free
- [ ] Remote rooms (Zoom integration for virtual karaoke)
- [ ] Mobile native apps (React Native)
- [ ] Voice search (add songs via voice command)

---

## 📞 Support and Resources

### Documentation to Create
1. User Guide (how to create and join rooms)
2. FAQ page
3. Troubleshooting guide
4. API documentation (if you open it up)
5. Developer guide (for contributors)

### Community
- Discord or Slack for users
- GitHub for bug reports
- Email support (support@yourapp.com)
- Social media presence (Twitter, Instagram)

---

## 🎉 You're Ready to Build!

**Total Timeline:**
- **MVP (Phases 1-7):** 4-5 weeks (~120-160 hours)
- **With Premium (Phase 8):** 6-7 weeks (~150-200 hours)

**Recommended Approach:**
1. Start with Phases 1-3 (backend + frontend core)
2. Deploy early and test with friends
3. Add Phases 4-5 (mobile + playback)
4. Polish with Phase 6
5. Launch Phase 7
6. Add monetization Phase 8 after validating demand

**This is a real product.** People will pay for this. Let's build it! 🚀

Want me to create the Phase 1 prompt to get started with the backend foundation?
