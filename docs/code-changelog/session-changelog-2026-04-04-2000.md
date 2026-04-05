# Session Changelog — 2026-04-04 20:00

## Summary
Initial build of the Cool Dude Karaoke web app. Completed Phases 1-3 of the dev plan plus additional features (video streaming proxy, QR codes, popout player).

---

## New Files Created

### Root
- `package.json` — Root monorepo package.json with Railway deployment scripts
- `.gitignore` — Ignores node_modules, .env, debug/, dist/, player-script files
- `.env.example` — Template for environment variables
- `README.md` — Project setup and API documentation
- `CLAUDE.md` — Session onboarding reference for Claude Code

### Documentation (`docs/`)
- `docs/DOCUMENTATION_GUIDE.md` — Full onboarding doc read by /hello skill
- `docs/docker-setup.md` — Docker/PostgreSQL container management reference

### Server (`server/`)
- `server/package.json` — Server dependencies
- `server/server.js` — Express + Socket.io + static file serving entry point
- `server/prisma/schema.prisma` — Database schema (users, rooms, playlist_items, room_members)
- `server/prisma/migrations/20260404201622_init/` — Initial migration
- `server/src/routes/auth.js` — Auth routes (register, login, me)
- `server/src/routes/rooms.js` — Room CRUD routes
- `server/src/routes/playlist.js` — Playlist management routes
- `server/src/routes/youtube.js` — YouTube search with rate limiting
- `server/src/routes/vibe.js` — AI vibe generation route
- `server/src/routes/stream.js` — Video stream proxy route
- `server/src/routes/sync.js` — YouTube playlist sync routes
- `server/src/controllers/authController.js` — Registration, login, JWT
- `server/src/controllers/roomController.js` — Room CRUD with invite codes
- `server/src/controllers/playlistController.js` — Add/remove/reorder songs
- `server/src/controllers/youtubeController.js` — YouTube search (auto-appends "karaoke")
- `server/src/controllers/vibeController.js` — Claude-powered vibe generation
- `server/src/controllers/streamController.js` — yt-dlp video stream proxy with caching
- `server/src/services/youtubeService.js` — YouTube Data API v3 integration
- `server/src/services/vibeService.js` — Anthropic Claude API for song suggestions
- `server/src/services/socketService.js` — Socket.io handlers with reconnection grace period
- `server/src/services/streamService.js` — ytdl-core service (unused, replaced by yt-dlp)
- `server/src/services/playlistSyncService.js` — YouTube playlist sync service
- `server/src/middleware/auth.js` — JWT authentication middleware
- `server/src/utils/inviteCode.js` — 6-char invite code generator

### Client (`client/`)
- `client/vite.config.js` — Vite config with API/WebSocket proxy
- `client/src/main.jsx` — React entry point
- `client/src/App.jsx` — Router with auth, host, guest routes
- `client/src/styles/App.css` — Full neon Tron theme (copied from desktop + responsive + QR styles)
- `client/src/contexts/PlaylistContext.jsx` — Playlist state management (copied from desktop)
- `client/src/components/SearchBar.jsx` — Search + vibe input (copied from desktop)
- `client/src/components/SearchResults.jsx` — Result grid (copied from desktop)
- `client/src/components/PlaylistQueue.jsx` — Drag-and-drop queue (copied from desktop)
- `client/src/components/VibeSuggestions.jsx` — AI vibe suggestions (adapted from desktop)
- `client/src/components/PlaylistSync.jsx` — YouTube playlist sync (adapted from desktop)
- `client/src/components/VideoPlayer.jsx` — HTML5 video player with yt-dlp proxy + popout
- `client/src/components/AuthPage.jsx` — Login/register page
- `client/src/components/RoomLobby.jsx` — Create/join room page
- `client/src/components/HostDashboard.jsx` — Main host display
- `client/src/components/GuestView.jsx` — Mobile guest interface
- `client/src/components/QRCodeDisplay.jsx` — QR code for room joining
- `client/src/hooks/useSocket.jsx` — Socket.io hook
- `client/src/hooks/useAuth.jsx` — Auth context + hook
- `client/src/services/api.jsx` — REST API service layer
- `client/src/assets/cool-dude-karaoke-logo-v1.png` — Logo (copied from desktop)
- `client/src/assets/cool-dude-karaoke-logo-v2.png` — Logo v2 (copied from desktop)

---

## Dependencies Added

### Server
- `express`, `socket.io`, `@prisma/client`, `prisma`
- `bcrypt`, `jsonwebtoken`, `dotenv`
- `express-rate-limit`, `express-validator`
- `@anthropic-ai/sdk` — Vibe generation
- `@distube/ytdl-core` — Video URL extraction (partially working, replaced by yt-dlp)
- `socket.io-client` (devDep) — For testing
- `nodemon` (devDep)

### Client
- `react`, `react-dom`, `react-router-dom`
- `socket.io-client`
- `qrcode.react`
- `@vitejs/plugin-react`, `vite`

### System
- `yt-dlp` (Python) — Installed via pip, used for video stream URL extraction
- `Docker` — PostgreSQL container `karaoke-postgres`

---

## Configuration Changes
- PostgreSQL database `karaoke` created via Docker container `karaoke-postgres`
- Prisma migration `20260404201622_init` applied
- Vite dev proxy configured: `/api` → `:3000`, `/socket.io` → `:3000` (ws)

---

## Bug Fixes
1. **CSS overflow clipping** — Auth/lobby pages clipped by `.app { overflow: hidden }`. Fixed with `.app-page` class override.
2. **HTML entities in YouTube titles** — `&#39;` showing as literal text. Added `decodeHtmlEntities()` to YouTube service.
3. **Video embedding restrictions** — YouTube IFrame API blocked ~40% of karaoke videos. Replaced with server-side yt-dlp stream proxy for near-100% playback.
4. **Stream proxy not following redirects** — YouTube CDN returned 302 redirects. Added recursive redirect following in stream controller.
5. **Stream controller crash** — Leftover `.on('error')` call on plain object after refactor. Rewrote controller cleanly.
6. **Guest view logo size** — Inline style had `height: 60`. Changed to `height: 180`.

---

## Architecture Decisions
- **Video streaming via yt-dlp proxy** instead of YouTube IFrame API — bypasses embedding restrictions, near-100% video availability
- **yt-dlp (Python)** over `@distube/ytdl-core` (Node) — ytdl-core failed to parse YouTube's cipher, yt-dlp works reliably
- **Stream URL caching** — 3-hour TTL, URLs last 4-6 hours from YouTube
- **No CORS configuration** — Frontend and backend on same origin (Railway deployment)
- **Popout player** via `window.open()` with postMessage communication

---

## Git Commits
- `a24ac69` — Initial commit: Phases 1-3 complete (all files above)
- Uncommitted: QR code feature, popout player, bug fixes since initial commit
