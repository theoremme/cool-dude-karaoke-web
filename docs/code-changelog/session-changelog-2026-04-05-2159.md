# Session Changelog — 2026-04-05 21:59 (Part 2)

## Summary
Deployed to Railway with custom domain (cooldudekaraoke.com). Added host mobile layout, leave room confirmation, active rooms on lobby, video loading spinner, OG meta tags, cookie-based yt-dlp auth, favicon, and numerous bug fixes discovered during live deployment testing.

---

## Commits This Session (22 commits after initial session docs)

### Deployment
- `652a7b6` — Dockerfile for Railway (Node.js 20 + Python3/yt-dlp)
- `ff9800d` — Bind to 0.0.0.0 for Railway
- `.dockerignore` created

### Features
- `fde84a9` — Popout video time preservation (reverted in `2ddc358` due to player breakage)
- `fde84a9` — Host mobile layout with "Yo, dude. This hits different on desktop." warning
- `24efb8b` — Active rooms on lobby page with rejoin, QR code on host mobile
- `2100631` — Leave room confirmation modal ("Callin' it quits?")
- `21dd90b` — Lobby link in leave modal (later moved to standalone button)
- `0e240f6` — Lobby button on host header (top left), leave modal styled with auth-card
- `b039a1a` — Video player loading spinner animation
- `5995b2b` — Playlist/lobby loading spinners, clear stale playlist on room change
- `593bf44` — Open Graph meta tags for link previews
- `d4ef59a` — YouTube cookie support for yt-dlp (env var + API upload)

### Bug Fixes
- `03f41aa` — **Critical:** clearPlaylist on mount was deleting songs from database (emitting clear-playlist to server). Fixed with clearLocal() that only resets local state.
- `0650607` — Mobile viewport overflow/cropping (overflow-x: hidden on mobile breakpoint)
- `2ddc358` — Reverted VideoPlayer and streamController to working state after elapsed time changes broke video playback

### UI Polish
- `b8b41f9` — All logo instances use nobg variant
- `794c49f`, `c71dfa8`, `13e3466` — Favicon iterations (PNG star from logo)
- CSS: Orbitron font for auth/lobby headings, consistent green (#CFF527), accent color updates

---

## New Files Created

- `Dockerfile` — Node.js 20 + Python3/yt-dlp for Railway deployment
- `.dockerignore` — Excludes node_modules, .env, debug/, etc.
- `client/public/og-image.png` — Open Graph image for link previews
- `client/public/favicon.png` — Custom favicon (cyan diamond star from logo)
- `client/src/assets/favicon.png` — Favicon source file

---

## Files Modified

### Client
- `client/index.html` — OG meta tags, favicon, page title "Cool Dude Karaoke"
- `client/src/components/HostDashboard.jsx` — Mobile layout, leave modal, lobby button, loading states, nobg logo
- `client/src/components/GuestView.jsx` — Loading spinner, clearLocal, nobg logo, removed duplicate import
- `client/src/components/PlaylistQueue.jsx` — Loading prop with spinner
- `client/src/components/RoomLobby.jsx` — Active rooms with rejoin, loading state
- `client/src/components/VideoPlayer.jsx` — Loading spinner CSS class (reverted elapsed time changes)
- `client/src/contexts/PlaylistContext.jsx` — clearLocal() function
- `client/src/services/api.jsx` — getMyRooms() API call
- `client/src/styles/App.css` — Mobile warning overlay, lobby button, leave modal, video loading spinner, active rooms, overflow fixes

### Server
- `server/server.js` — Bind to 0.0.0.0
- `server/package.json` — engines: node >=20
- `server/src/controllers/streamController.js` — Cookie support, YT_DLP_PATH env var, uploadCookies/cookieStatus endpoints, error detail in response
- `server/src/controllers/roomController.js` — getMyRooms endpoint
- `server/src/routes/stream.js` — Cookie upload/status routes
- `server/src/routes/rooms.js` — /mine route for active rooms

### Config
- `.env.example` — Added YT_DLP_PATH
- `.gitignore` — Added cookies.txt

---

## Deployment Configuration

- **Platform:** Railway with custom Dockerfile
- **Domain:** cooldudekaraoke.com (via Namecheap DNS → Railway CNAME)
- **Database:** Railway PostgreSQL (auto-provisioned)
- **Environment Variables:** DATABASE_URL (auto), JWT_SECRET, YOUTUBE_API_KEY, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, NODE_ENV=production, YT_DLP_PATH=yt-dlp

---

## Bug Fixes & Resolutions

1. **clearPlaylist wiping database** — `clearPlaylist()` called on mount emitted `clear-playlist` to server, deleting all songs. Fixed by adding `clearLocal()` that only dispatches locally.
2. **Railway 436 error** — Server not binding to 0.0.0.0. Fixed by adding host parameter to listen().
3. **Mobile viewport cropping** — Content overflowing on mobile. Fixed with `overflow-x: hidden` and `max-width: 100vw` on mobile breakpoint.
4. **yt-dlp bot detection on Railway** — YouTube flagged Railway's datacenter IP. Added cookie support infrastructure. Resolved by removing cookies (bot detection was temporary).
5. **yt-dlp format errors with cookies** — Cookies changed available formats, breaking `best[ext=mp4]/best`. Resolved by removing cookies since bot detection cleared.
6. **Stale playlist showing between rooms** — SessionStorage cached previous room's playlist. Fixed with `clearLocal()` on mount + loading spinner.
7. **Popout video elapsed time changes broke player** — Reverted to working VideoPlayer state. Elapsed time feature deferred.

---

## Known Issues

- Popout video elapsed time sync was reverted — needs re-implementation without breaking the inline player
- `YT_COOKIES_BASE64` causes format issues — cookies change YouTube's format offerings. Need format-agnostic approach if cookies are needed again.
