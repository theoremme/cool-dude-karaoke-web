# Next Session Notes
## Updated: 2026-04-06

### Completed This Session
- Diagnosed Railway cost issue ($12/day → Prisma singleton, graceful shutdown)
- Fixed join-room infinite loop (memory leak + blocked inactivity timer)
- Room auto-close after 10 min inactivity with 2-min warning modal
- Switched video extraction to @distube/ytdl-core (bypass YouTube bot detection)
- Guest vibe support (was wired to no-op)
- Fixed "Added" button flicker, mobile search lock, mobile guest auto-close
- Closeout page: "Go to the Lobby", centered button, scrollable setlist
- Mobile vibe button heights standardized

### Incomplete Tasks
1. **Permanent video extraction fix** — Current setup uses a residential proxy (YT_PROXY env var) to route yt-dlp around Railway's flagged datacenter IP. Works but adds a dependency. Permanent fix options: (a) Cloudflare Worker / AWS Lambda for extraction from a clean IP, (b) self-hosted extraction microservice on a non-datacenter VPS. The proxy is a recurring cost and the free tier may have limits.
2. **Popout video elapsed time sync** — Still reverted from last session. Needs re-implementation.
3. **Unused files not cleaned up** — `server/src/services/streamService.js` (replaced by yt-dlp/ytdl-core controller), default Vite scaffold files.
4. **Vibe generation not tested end-to-end** — Requires `ANTHROPIC_API_KEY` in server/.env and Railway.
5. **Room expiration cleanup** — Rooms expire after 24 hours but no cleanup job exists (auto-close handles active rooms, but expired inactive rooms stay in DB).
6. **Settings panel not built** — No replacement for removed desktop API key management.

### Known Issues
1. **YouTube bot detection on Railway** — yt-dlp gets flagged on Railway's datacenter IP. ytdl-core deployed as alternative but not yet verified. If both fail, cookie auth is needed.
2. **OAuth token store is in-memory** — Tokens lost on server restart/redeploy.
3. **Quota tracking resets on server restart** — Daily usage counter is in-memory.
4. **Debug logging verbose** — `[Activity]` logs on every touchRoom call. Should be reduced once auto-close is confirmed stable.
5. **Video proxy bandwidth** — All video bytes still flow through Railway (302 redirect failed due to IP restrictions). This is the biggest remaining cost driver during active use.

### Pending Decisions
- **If ytdl-core fails too** — Try cookies (previous attempts had format issues) or accept YouTube embed limitations
- **Reduce debug logging** — Remove `[Activity]` verbose logging once auto-close is stable
- **Phase priority** — Phase 4 (PWA/mobile), Phase 6 (polish), or continued bug fixing?

### Suggested Next Session Priorities
1. Verify ytdl-core video playback on Railway (or fix if broken)
2. Monitor Railway costs — should be significantly lower now
3. Remove verbose debug logging if auto-close is stable
4. Clean up unused files
5. Consider PWA manifest for mobile "Add to Home Screen"

### Deployment Info
- **URL:** https://www.cooldudekaraoke.com
- **Platform:** Railway (Dockerfile-based deploy)
- **Database:** Railway PostgreSQL (auto-provisioned)
- **GitHub:** https://github.com/theoremme/cool-dude-karaoke-web.git (master branch)
- **Auto-deploy:** Pushes to master trigger Railway deployment
- **Google OAuth redirect URI (production):** https://www.cooldudekaraoke.com/api/youtube/oauth/callback
- **Google OAuth:** Test user added; app in testing mode (<100 users)
- **Note:** Railway was experiencing issues at end of session. Last deploy (85191a6) was queued.

### Services Running (Local)
- **Backend:** `npm run dev:server` on port 3000 (nodemon) — not running
- **Frontend:** Vite dev server on port 5173 — not running
- **Database:** Docker container `karaoke-postgres` on port 5432 — running (up 40+ hours)
