# Next Session Notes
## Updated: 2026-04-05

### Completed This Session
- Deployed to Railway at cooldudekaraoke.com
- Dockerfile with Node.js 20 + Python3/yt-dlp
- Host mobile layout with desktop warning modal
- Leave Room confirmation modal ("Callin' it quits?")
- Lobby button on host header (navigates without closing room)
- Active rooms on lobby page with rejoin capability
- Video player loading spinner
- Playlist/lobby loading states with spinners
- Open Graph meta tags for link previews
- Custom favicon (cyan diamond star)
- Cookie infrastructure for yt-dlp (ready but not needed currently)
- All logos switched to nobg variant
- Orbitron font for auth/lobby headings
- YouTube playlist publish flow tested end-to-end

### Incomplete Tasks
1. **Popout video elapsed time sync** — Was implemented but broke the inline player. Reverted. Needs careful re-implementation.
2. **Unused files not cleaned up** — `server/src/services/streamService.js` (replaced by yt-dlp controller), default Vite scaffold files (`hero.png`, `react.svg`, `vite.svg`).
3. **Vibe generation not tested end-to-end** — Requires `ANTHROPIC_API_KEY` in server/.env and Railway.
4. **Room expiration cleanup** — Rooms expire after 24 hours but no cleanup job exists.
5. **Settings panel not built** — No replacement for the removed desktop API key management.

### Known Issues
1. **yt-dlp cookies cause format errors** — `YT_COOKIES_BASE64` env var changes YouTube's available formats, breaking `best[ext=mp4]/best`. Currently working without cookies. If bot detection returns, need to find a format selector compatible with cookie auth.
2. **OAuth token store is in-memory** — Tokens lost on server restart/redeploy.
3. **Quota tracking resets on server restart** — Daily usage counter is in-memory.
4. **No PWA manifest** — Phase 4 item, not started.

### Pending Decisions
- **Popout elapsed time approach** — Need a safe way to implement without touching the video loading/error path. Consider keeping it simpler (just popout, no time sync).
- **Phase priority** — Phase 4 (PWA/mobile), Phase 6 (polish), or continued bug fixing?

### Suggested Next Session Priorities
1. Re-implement popout video elapsed time sync safely
2. Clean up unused files
3. Test vibe generation end-to-end
4. Consider PWA manifest for mobile "Add to Home Screen"
5. Add Google OAuth login option (replace email/password)

### Deployment Info
- **URL:** https://www.cooldudekaraoke.com
- **Platform:** Railway (Dockerfile-based deploy)
- **Database:** Railway PostgreSQL (auto-provisioned)
- **GitHub:** https://github.com/theoremme/cool-dude-karaoke-web.git (master branch)
- **Auto-deploy:** Pushes to master trigger Railway deployment
- **Google OAuth redirect URI (production):** https://www.cooldudekaraoke.com/api/youtube/oauth/callback
- **Google OAuth:** Test user added; app in testing mode (<100 users)

### Services Running (Local)
- **Backend:** `npm run dev:server` on port 3000 (nodemon)
- **Frontend:** Vite dev server on port 5173
- **Database:** Docker container `karaoke-postgres` on port 5432
