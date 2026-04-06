# Session Changelog — 2026-04-06

## Summary
Diagnosed and fixed Railway cost issues ($12/day). Consolidated Prisma instances, added graceful shutdown, implemented room auto-close after inactivity, fixed join-room infinite loop (memory leak), switched video extraction from yt-dlp to @distube/ytdl-core to bypass YouTube bot detection. Multiple guest UI bug fixes.

---

## Commits This Session (8 commits)

### Infrastructure / Cost Fixes
- `9fa4099` — Prisma singleton, graceful shutdown, video redirect (reverted redirect later)
- `a77afb2` — Auto-close inactive rooms after 10 minutes
- `6156efa` — Debug: shorten timeout to 2min + touchRoom source logging
- `a97742f` — **Critical:** Fix join-room infinite loop causing memory leak
- `29a36b9` — Restore 10min production timeout, polish inactivity modal

### Video Player
- `b313914` — Try YouTube player_client bypass (didn't work)
- `1db3993` — Switch to @distube/ytdl-core with yt-dlp fallback

### Bug Fixes & UI Polish
- `a5d99e0` — Fix video player (revert redirect), guest vibe, added flicker, mobile search
- `85191a6` — Center lobby button, fix guest mobile close, keep search results

---

## New Files Created

- `server/src/lib/prisma.js` — Shared Prisma singleton (replaces 4 separate instances)

---

## Files Modified

### Server
- `server/server.js` — Added SIGTERM/SIGINT graceful shutdown handlers
- `server/src/controllers/authController.js` — Use Prisma singleton
- `server/src/controllers/roomController.js` — Use Prisma singleton
- `server/src/controllers/playlistController.js` — Use Prisma singleton
- `server/src/services/socketService.js` — Use Prisma singleton, add room activity tracking, inactivity warning/auto-close system, activity-ping handler, touchRoom debug logging
- `server/src/controllers/streamController.js` — Switch to @distube/ytdl-core as primary extractor with yt-dlp fallback, remove yt-dlp player_client args

### Client
- `client/src/components/HostDashboard.jsx` — Inactivity warning modal with countdown, room-closed handler, handleStillHere, fix join-room infinite loop (joinedRef)
- `client/src/components/GuestView.jsx` — Add full vibe support (VibeSuggestions, state, handlers), fix join-room infinite loop (joinedSocketRef), remove mobile auto-clear of results, handle room-inactive error on reconnect
- `client/src/components/VideoPlayer.jsx` — Remove 302 redirect retry logic (reverted to proxy-only)
- `client/src/components/SearchBar.jsx` — Remove lastSearchRef dedup check (caused mobile search lock)
- `client/src/components/SearchResults.jsx` — Track locally added songs in Set to prevent flicker
- `client/src/components/CloseoutPage.jsx` — "Go to the Lobby" button (was "Open a New Room"), navigate to / instead of /login, flex layout class
- `client/src/styles/App.css` — Closeout flex layout for scrollable setlist, centered lobby button, mobile vibe button height standardization

---

## Key Bug Fixes

1. **$12/day Railway costs** — 4 PrismaClient instances creating 4 connection pools. Fixed with shared singleton.
2. **No graceful shutdown** — Server didn't handle SIGTERM. Added handlers to close HTTP server and disconnect Prisma.
3. **join-room infinite loop** — `room-updated` → `setRoom(new object)` → re-triggered join effect → emitted join-room → server sent room-updated → loop. Caused memory leak and prevented inactivity timer from ever firing. Fixed with joinedRef guard.
4. **Video player broken by 302 redirect** — YouTube URLs are IP-restricted to Railway's server. Reverted to proxy-by-default.
5. **YouTube bot detection** — Railway's datacenter IP flagged. Switched from yt-dlp to @distube/ytdl-core (different extraction method). Status: awaiting Railway deploy to verify.
6. **Vibe not working in Guest room** — `onVibe={() => {}}` was a no-op. Added full vibe support.
7. **"Added" button flicker** — Playlist state churn from server broadcasts. Fixed with local addedIds Set.
8. **Mobile search unusable** — lastSearchRef dedup blocked re-searching after auto-clear. Removed dedup.
9. **Mobile guest not closing on auto-close** — Mobile browsers suspend WebSockets. Added error handler for room-inactive on reconnect.

---

## Architecture Changes

### Prisma Singleton Pattern
Before: 4 files each created `new PrismaClient()` (4 connection pools).
After: Single shared instance in `server/src/lib/prisma.js`, imported everywhere.

### Room Inactivity Auto-Close
- `roomActivity` Map tracks last activity per room
- Activity events: join-room, rejoin-room, add-song, remove-song, reorder-song, playback-sync, activity-ping
- 30-second check interval scans for idle rooms
- 8 min idle → `inactivity-warning` event with countdown
- 10 min idle → auto-close room, emit `room-closed` with `inactivity: true`
- Host sees "Hey dude - you there?" modal with 2:00 countdown
- Any activity clears warning via `inactivity-cleared` event

### Video Extraction
Before: yt-dlp only (Python, execFile)
After: @distube/ytdl-core (Node.js) primary, yt-dlp fallback. Logs which extractor succeeded.

---

## Debug Logging (Intentionally Kept)

- `[Activity] Room X touched by "source"` — tracks what resets inactivity timer
- `[Auto-close] Warning/closed` — tracks auto-close lifecycle
- `[stream] Got URL via ytdl-core/yt-dlp` — tracks which extractor works

These should be reviewed/reduced once features are stable.
