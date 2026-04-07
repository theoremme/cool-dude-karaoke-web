# Session Changelog — 2026-04-06/07 (Full Day Session - Final)

## Summary
Massive session: 31 commits, 25 files changed, ~1650 lines added. Diagnosed and fixed Railway costs, solved YouTube bot detection via Cloud Run microservice, built room auto-close system, fullscreen mobile video player, QR flip card with posse list, desktop/mobile host sync, and extensive UI polish.

---

## All Commits (31)

### Infrastructure / Cost (5 commits)
- `9fa4099` — Prisma singleton (4→1), graceful SIGTERM shutdown
- `a77afb2` — Auto-close inactive rooms after 10 min with warning modal
- `6156efa` — Debug: shortened timeout + touchRoom source logging
- `a97742f` — **Critical:** Fixed join-room infinite loop (memory leak)
- `29a36b9` — Restored production timeouts, polished inactivity modal

### YouTube Bot Detection (8 commits)
- `b313914` — Tried player_client args (didn't work)
- `1db3993` — Switched to @distube/ytdl-core (also blocked)
- `c9690e7` — Cookie support for both extractors + trust proxy fix
- `16ae326` — Debug formats endpoint
- `ebcb82d` — Residential proxy support via YT_PROXY
- `63fbdd1` — Proxy in debug endpoint, loosened format selector
- `dd39c87` — **Solution:** Cloud Run extractor microservice
- `ffa03a8` — Hardcoded Cloud Run URL as fallback (Railway env var flaky)

### Bug Fixes (5 commits)
- `a5d99e0` — Fixed video player, guest vibe, added flicker, mobile search
- `85191a6` — Centered lobby button, guest mobile auto-close, removed result auto-clear
- `0499529` — Fixed host mobile black screen (stale guestList reference)
- `79580bd` — Fixed host mobile not redirecting after room auto-close
- `d3b97d1` — Debug logging for extractor URL check

### Mobile Player (4 commits)
- `529301d` — Fullscreen mobile video player with overlay controls
- `afe08d1` — Fixed player not loading (auto-start playback)
- `a8d82b6` — Replaced emoji controls with SVG icons
- `e91743a` — Clean player button styles, mobile landscape safety

### UI Polish (6 commits)
- `99ea956` — QR flip card posse panel, loading phrases, pink theme, "Get in, loser"
- `1d43642` — One random loading phrase per video
- `bf5b16f` — Spinner animation on loading screen
- `8a36b9d` — Mobile host layout tweaks, QR scan label, hide long URL
- `95e6810` — Up/down reorder buttons for mobile playlist
- `29cee2b` — Self-healing URL cache, playlist control icons, desktop/mobile sync

### Documentation (3 commits)
- `873c344` — Mid-session changelog
- `891848c` — Session changelog + next-session notes
- `0e06223` — Known caveats documentation

---

## New Files Created

- `server/src/lib/prisma.js` — Shared Prisma singleton
- `extractor/Dockerfile` — Cloud Run extraction service
- `extractor/package.json` — Extraction service dependencies
- `extractor/server.js` — YouTube URL extraction via @distube/ytdl-core
- `client/src/components/MobilePlayer.jsx` — Fullscreen mobile video player
- `docs/known-caveats.md` — Documented risks and workarounds

---

## Files Modified (19)

### Server
- `server/server.js` — SIGTERM/SIGINT shutdown, trust proxy
- `server/src/controllers/authController.js` — Prisma singleton
- `server/src/controllers/roomController.js` — Prisma singleton
- `server/src/controllers/playlistController.js` — Prisma singleton
- `server/src/services/socketService.js` — Activity tracking, auto-close, debug logging
- `server/src/controllers/streamController.js` — Full rewrite: Cloud Run extractor chain, cookie/proxy support, self-healing cache, debug endpoint, hardcoded fallback URL
- `server/src/routes/stream.js` — Debug route

### Client
- `client/src/components/HostDashboard.jsx` — Inactivity modal, room-closed handler, join-room fix, members tracking, playback-sync listener, mobile player integration, "Let's Bounce"
- `client/src/components/GuestView.jsx` — Vibe support, join-room fix, error handler, removed auto-clear
- `client/src/components/VideoPlayer.jsx` — Loading phrases with spinner
- `client/src/components/QRCodeDisplay.jsx` — 3D flip card, posse list, "Get in, loser"
- `client/src/components/PlaylistQueue.jsx` — Mobile up/down reorder buttons, text icon controls
- `client/src/components/SearchBar.jsx` — Removed dedup check
- `client/src/components/SearchResults.jsx` — Local addedIds Set
- `client/src/components/CloseoutPage.jsx` — "Go to the Lobby", flex layout
- `client/src/styles/App.css` — Mobile player, QR flip card, posse panel, pink theme, landscape safety, button styles, closeout layout

---

## New Services

### Cloud Run Extractor
- **URL:** `https://yt-extractor-100464855375.us-east1.run.app`
- **Purpose:** YouTube URL extraction from Google's clean IP
- **Tech:** Node.js + @distube/ytdl-core
- **Auth:** x-api-key header (EXTRACTOR_API_KEY)
- **Cost:** Free tier (2M requests/month)
- **Caveat:** URL hardcoded in streamController.js as fallback

---

## Key Architecture

### Video Extraction Chain
```
Request → Check cache (3hr TTL, self-heals on 403/410)
  ↓ cache miss
  1. Cloud Run extractor (hardcoded URL + env var override)
  2. Local @distube/ytdl-core (likely fails — Railway IP flagged)
  3. Local yt-dlp (likely fails — Railway IP flagged)
  → Proxy video bytes to client
```

### Room Auto-Close
```
Activity tracked on: join, add/remove/reorder song, playback-sync, activity-ping
  → 8 min idle: inactivity-warning (2:00 countdown modal)
  → 10 min idle: room-closed (all clients redirected)
  → Mobile reconnect after close: error handler redirects to closeout
```

### Desktop ↔ Mobile Host Sync
Both host sessions listen for `playback-sync` events. Play/pause/skip on either side updates the other in real-time via Socket.io.

---

## Debug Code in Production

- `[Activity]` logs on every touchRoom call — verbose, reduce later
- `[stream]` logs showing extractor chain — keep for monitoring
- `/api/stream/debug/:videoId` — unauthenticated format debug endpoint
