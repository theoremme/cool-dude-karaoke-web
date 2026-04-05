# Next Session Notes
## Updated: 2026-04-04

### Uncommitted Changes
There are changes since the initial commit (`a24ac69`) that need to be committed:
- QR code feature (QRCodeDisplay component + CSS + qrcode.react dependency)
- Popout video player (window.open with postMessage sync)
- Video streaming proxy (yt-dlp backend, HTML5 video player)
- YouTube playlist sync endpoint (POST /api/sync/connect, /disconnect)
- Vibe generation endpoint (POST /api/vibe/generate)
- HTML entity decoding in YouTube results
- Various CSS fixes (logo sizes, overflow, mobile responsive)

### Incomplete Tasks
1. **WebSocket real-time sync not fully wired** — Playlist updates from one client don't push to other clients' React state. The socket events fire but the PlaylistContext isn't connected to socket listeners. Host and guest playlists are independent.
2. **Vibe generation not tested end-to-end** — Endpoint built, requires `ANTHROPIC_API_KEY` in server/.env. Not verified in the UI.
3. **Settings panel not built** — Desktop version managed API keys (removed for web security). No replacement settings UI exists.
4. **streamService.js is unused** — The `@distube/ytdl-core` service was replaced by yt-dlp in `streamController.js`. Can delete `streamService.js`.
5. **Default Vite scaffold files remain** — `client/src/assets/hero.png`, `react.svg`, `vite.svg` are leftover. Can clean up.

### Known Issues
1. **yt-dlp path is hardcoded** — `streamController.js` defaults to `C:/Users/Lucy/AppData/Roaming/Python/Python312/Scripts/yt-dlp.exe`. Needs `YT_DLP_PATH` env var for deployment.
2. **yt-dlp JS runtime warning** — yt-dlp warns about missing JS runtime (deno). Works but may have missing formats. Consider installing deno or node runtime for yt-dlp.
3. **No PWA manifest** — Phase 4 item, not started.
4. **client/package-lock.json not committed** — Left out of initial commit intentionally.

### Pending Decisions
- **Video player strategy for deployment** — yt-dlp needs to be installed on Railway. May need a custom Dockerfile or Nixpacks config. Alternative: fall back to popout player (window.open to YouTube) for deployment.
- **Room expiration** — Rooms set to expire after 24 hours but no cleanup job exists.
- **Phase priority** — Phase 4 (PWA/mobile), Phase 6 (polish), or Phase 7 (Railway deployment) next?

### Suggested Next Session Priorities
1. Commit uncommitted changes
2. Wire up WebSocket sync between host and guest playlists
3. Test vibe generation end-to-end
4. Clean up unused files (streamService.js, default Vite assets)
5. Plan Railway deployment (yt-dlp dependency)

### Services Running
- **Backend:** `npm run dev:server` on port 3000 (nodemon)
- **Frontend:** Vite dev server on port 5173
- **Database:** Docker container `karaoke-postgres` on port 5432
- All three need to be running for development. Check Docker Desktop is started first.
