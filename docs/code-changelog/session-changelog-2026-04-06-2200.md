# Session Changelog — 2026-04-06 (Full Day Session)

## Summary
Major session covering Railway cost optimization, YouTube bot detection bypass, room auto-close, multiple UI bug fixes, and extensive UI polish. Deployed a separate Cloud Run microservice for YouTube URL extraction to bypass Railway's flagged datacenter IP.

---

## Commits This Session (18 commits)

### Infrastructure / Cost Fixes
- `9fa4099` — Prisma singleton (4→1 instance), graceful SIGTERM shutdown
- `a77afb2` — Auto-close inactive rooms after 10 min with 2-min warning modal
- `6156efa` — Debug: shortened timeout + touchRoom source logging
- `a97742f` — **Critical:** Fixed join-room infinite loop (memory leak + blocked inactivity)
- `29a36b9` — Restored 10min production timeout, polished inactivity modal
- `c9690e7` — Cookie support for both extractors, fixed trust proxy error

### YouTube Bot Detection
- `b313914` — Tried player_client args (didn't work)
- `1db3993` — Switched to @distube/ytdl-core with yt-dlp fallback (both blocked)
- `16ae326` — Debug formats endpoint to diagnose available formats
- `ebcb82d` — Added residential proxy support via YT_PROXY env var
- `63fbdd1` — Added proxy to debug endpoint, loosened format selector
- `dd39c87` — **Solution:** Cloud Run extractor microservice + external extraction support

### Bug Fixes
- `a5d99e0` — Fixed video player (reverted 302 redirect), guest vibe, added flicker, mobile search
- `85191a6` — Centered lobby button, fixed guest mobile auto-close, removed result auto-clear

### UI Polish
- `99ea956` — QR flip card posse panel, loading phrases, pink color scheme, "Get in, loser" / "Let's Bounce"
- `1d43642` — One random loading phrase per video (no cycling)
- `bf5b16f` — Spinner animation on loading screen, bigger bolder text
- `873c344` — Mid-session changelog + notes

---

## New Files Created

- `server/src/lib/prisma.js` — Shared Prisma singleton
- `extractor/Dockerfile` — Cloud Run extraction service Docker config
- `extractor/package.json` — Extraction service dependencies
- `extractor/server.js` — YouTube URL extraction via @distube/ytdl-core

---

## Files Modified

### Server (8 files)
- `server/server.js` — SIGTERM/SIGINT graceful shutdown, `trust proxy` setting
- `server/src/controllers/authController.js` — Prisma singleton
- `server/src/controllers/roomController.js` — Prisma singleton
- `server/src/controllers/playlistController.js` — Prisma singleton
- `server/src/services/socketService.js` — Prisma singleton, room activity tracking, inactivity auto-close system, activity-ping handler, debug logging
- `server/src/controllers/streamController.js` — Full rewrite: Cloud Run extractor (primary), ytdl-core (fallback), yt-dlp (fallback), cookie support, proxy support, debug formats endpoint
- `server/src/routes/stream.js` — Debug formats route, updated imports

### Client (7 files)
- `client/src/components/HostDashboard.jsx` — Inactivity warning modal, room-closed handler, join-room loop fix, members tracking, consolidated posse list, "Let's Bounce" text
- `client/src/components/GuestView.jsx` — Full vibe support, join-room loop fix, room-inactive error handler, removed mobile auto-clear
- `client/src/components/VideoPlayer.jsx` — Removed redirect retry logic, random loading phrases with spinner
- `client/src/components/QRCodeDisplay.jsx` — 3D flip card (QR ↔ Posse list), "Get in, loser" text, posse toggle button, member props
- `client/src/components/SearchBar.jsx` — Removed dedup check
- `client/src/components/SearchResults.jsx` — Local addedIds Set to prevent flicker
- `client/src/components/CloseoutPage.jsx` — "Go to the Lobby", flex layout
- `client/src/styles/App.css` — QR flip card styles, guest panel overlay, pink (#ff40ff) color scheme, closeout flex layout, mobile vibe button heights, button centering

---

## New Services

### Cloud Run Extractor (`extractor/`)
- Deployed to Google Cloud Run at user's GCP project
- Pure Node.js service using @distube/ytdl-core
- Single endpoint: `GET /extract/:videoId` → returns `{ url, quality, container }`
- Protected by API key header (`x-api-key`)
- Free tier: 2M requests/month

### Railway Environment Variables Added
- `EXTRACTOR_URL` — Cloud Run service URL
- `EXTRACTOR_API_KEY` — Shared secret for extractor auth
- `YT_COOKIES_BASE64` — Added then removed (cookies didn't solve format issue)
- `YT_PROXY` — Added for residential proxy (may still be set)

---

## Key Bug Fixes

1. **$12/day Railway costs** — 4 PrismaClient instances → singleton
2. **join-room infinite loop** — room-updated → setRoom(new obj) → re-triggered join effect → infinite cycle. Fixed with joinedRef guard.
3. **YouTube bot detection** — Railway IP flagged. Tried: player_client args, ytdl-core, cookies, residential proxy. Solution: Cloud Run extractor on Google's clean IP.
4. **Video player 302 redirect** — YouTube URLs IP-restricted. Reverted to proxy.
5. **Guest vibe** — was wired to no-op `() => {}`
6. **"Added" flicker** — playlist state churn. Fixed with local Set.
7. **Mobile search lock** — dedup check blocked re-searching.
8. **Mobile guest auto-close** — handled room-inactive error on reconnect.
9. **trust proxy** — Express rate-limit error on Railway reverse proxy.

---

## Debug Code Still in Production

- `[Activity]` logs on every touchRoom call — verbose, useful for monitoring auto-close
- `[Auto-close]` logs for warning/close events — keep permanently
- `[stream]` logs showing which extractor succeeded — keep permanently
- `/api/stream/debug/:videoId` — format debugging endpoint (unauthenticated, consider removing later)

---

## Architecture Changes

### Video Extraction Chain
```
Client → /api/stream/:videoId → Railway server
  1. Try Cloud Run extractor (EXTRACTOR_URL) — clean Google IP
  2. Try local @distube/ytdl-core — likely fails (Railway IP flagged)
  3. Try local yt-dlp — likely fails (Railway IP flagged)
  → Got URL → Proxy video bytes to client
```

### Room Inactivity Auto-Close
- roomActivity Map tracks last activity per room
- 30-second check interval
- 8 min idle → inactivity-warning event with countdown
- 10 min idle → auto-close, emit room-closed with inactivity flag
- Host sees "Hey dude - you there?" modal with 2:00 countdown

### QR Code / Posse Flip Card
- 3D CSS flip card: QR code on front, guest list on back
- Toggle via "◈ Posse (N)" / "◈ QR Code" button
- Members consolidated by name to handle reconnection duplicates
