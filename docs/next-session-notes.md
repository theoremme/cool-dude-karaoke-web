# Next Session Notes
## Updated: 2026-04-05

### Completed This Session
- WebSocket real-time playlist sync (add/remove/reorder/clear)
- sessionStorage persistence for playlist, search, vibe, and guest state
- Responsive guest views (desktop two-panel, mobile single-column)
- Guest playlist is read-only (controls deactivated, not removed)
- "Added by" indicators on playlist items
- Playback sync from host to guests (now playing indicator)
- Leave Room → closeout page with "Rad sesh, dude!" splash
- PDF keepsake download (dark theme, Orbitron font, Tron grid, logo)
- YouTube playlist publishing via OAuth (working end-to-end)
- Server-side search cache (4hr TTL, saves API quota)
- Quota tracking with `/api/youtube/quota` endpoint
- Client-side duplicate search prevention
- Accent color updated to #F56F27
- Nobg logo variant used on non-black backgrounds

### Incomplete Tasks
1. **Unused files not cleaned up** — `server/src/services/streamService.js` (replaced by yt-dlp), default Vite scaffold files (`hero.png`, `react.svg`, `vite.svg`) still present.
2. **Vibe generation not tested end-to-end** — Requires `ANTHROPIC_API_KEY` in server/.env.
3. **Settings panel not built** — No replacement for the removed desktop API key management.
4. **Room expiration cleanup** — Rooms expire after 24 hours but no cleanup job exists.

### Known Issues
1. **yt-dlp path hardcoded** — `streamController.js` defaults to local Windows path. Needs `YT_DLP_PATH` env var for deployment.
2. **OAuth token store is in-memory** — Tokens lost on server restart. Fine for single-server, would need Redis or similar for multi-instance.
3. **Quota tracking resets on server restart** — Daily usage counter is in-memory. Not critical but could lead to over-counting after restart.
4. **No PWA manifest** — Phase 4 item, not started.
5. **QR-CODE-IMPLEMENTATION.md and client/README.md** — Untracked scaffold/doc files in repo root.

### Pending Decisions
- **Video player strategy for deployment** — yt-dlp needs to be installed on Railway (custom Dockerfile or Nixpacks). Alternative: popout player fallback.
- **Phase priority** — Phase 4 (PWA/mobile), Phase 6 (polish), or Phase 7 (Railway deployment) next?
- **Search cache persistence** — Currently in-memory. Worth adding Redis or SQLite cache if deploying multi-instance?

### Suggested Next Session Priorities
1. Clean up unused files (streamService.js, default Vite assets)
2. Test vibe generation end-to-end
3. Plan Railway deployment (yt-dlp dependency, env vars, Dockerfile)
4. Consider PWA manifest for mobile "Add to Home Screen"

### Environment Setup
- **Google OAuth**: Configured in Google Cloud Console. Test user added. Credentials in `server/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- **YouTube API quota**: Default 10,000 units/day. Search caching active. User plans to request quota increase from Google.
- **Reminder**: If app approaches 100 OAuth users, start Google verification process.

### Services Running
- **Backend:** `npm run dev:server` on port 3000 (nodemon)
- **Frontend:** Vite dev server on port 5173
- **Database:** Docker container `karaoke-postgres` on port 5432
