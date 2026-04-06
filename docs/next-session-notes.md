# Next Session Notes
## Updated: 2026-04-06

### Completed This Session
- Diagnosed Railway cost issue ($12/day → Prisma singleton, graceful shutdown)
- Fixed join-room infinite loop (memory leak + blocked inactivity timer)
- Room auto-close after 10 min inactivity with 2-min warning modal
- Deployed Cloud Run extractor microservice to bypass YouTube bot detection
- Video playback working via Cloud Run extraction + Railway proxy
- Guest vibe support, search fixes, mobile guest auto-close
- QR code 3D flip card with posse (guest) list
- "Get in, loser" / "Let's Bounce" / loading phrases UI polish
- Pink (#ff40ff) color scheme for card/modal titles

### Incomplete Tasks
1. **Permanent video extraction architecture** — Current Cloud Run extractor works but is a separate service to maintain. Consider: consolidating into a single deploy, or accepting the microservice split long-term.
2. **Remove verbose debug logging** — `[Activity]` logs on every touchRoom call. Reduce once auto-close is confirmed stable over multiple sessions.
3. **Remove debug formats endpoint** — `/api/stream/debug/:videoId` is unauthenticated. Remove or add auth once video extraction is stable.
4. **Clean up YT_PROXY env var** — May still be set in Railway from proxy testing. Can remove since Cloud Run extractor is the solution.
5. **Popout video elapsed time sync** — Reverted from previous session. Needs re-implementation.
6. **Unused files** — `server/src/services/streamService.js`, default Vite scaffold files.
7. **Vibe generation not tested end-to-end** — Requires `ANTHROPIC_API_KEY`.
8. **Room expiration cleanup** — Expired inactive rooms stay in DB.
9. **Settings panel not built** — No replacement for removed desktop API key management.
10. **Docker image cleanup** — Python/yt-dlp could potentially be removed from Dockerfile since Cloud Run handles extraction. But keeping as fallback for now.

### Known Issues
1. **Railway deploy restarts cause brief video failures** — Any request during the ~30s deploy window fails. Normal behavior.
2. **OAuth token store is in-memory** — Tokens lost on server restart/redeploy.
3. **Quota tracking resets on server restart** — Daily usage counter is in-memory.
4. **Cloud Run cold starts** — First request after idle period may be slow (~2-3s). Subsequent requests are fast.
5. **Cookie infrastructure unused** — Cookie upload/status endpoints still exist but cookies aren't needed with Cloud Run approach. Could clean up.

### Pending Decisions
- **Cloud Run extractor long-term** — Keep as separate microservice or find a way to consolidate?
- **Remove Python/yt-dlp from Dockerfile?** — Would shrink image and speed deploys, but removes fallback.
- **Phase priority** — Phase 4 (PWA/mobile), Phase 6 (polish), or continued bug fixing?

### Suggested Next Session Priorities
1. Monitor Railway costs — should be significantly lower now
2. Remove verbose `[Activity]` debug logging
3. Clean up unused env vars (YT_PROXY, YT_COOKIES_BASE64)
4. Test vibe generation end-to-end
5. Consider PWA manifest for mobile "Add to Home Screen"

### Deployment Info
- **URL:** https://www.cooldudekaraoke.com
- **Platform:** Railway (Dockerfile-based deploy)
- **Database:** Railway PostgreSQL (auto-provisioned)
- **Extractor:** Google Cloud Run (yt-extractor service)
- **GitHub:** https://github.com/theoremme/cool-dude-karaoke-web.git (master branch)
- **Auto-deploy:** Pushes to master trigger Railway deployment
- **Google OAuth redirect URI (production):** https://www.cooldudekaraoke.com/api/youtube/oauth/callback
- **Google OAuth:** Test user added; app in testing mode (<100 users)

### Services Running (Local)
- **Backend:** `npm run dev:server` on port 3000 — not running
- **Frontend:** Vite dev server on port 5173 — not running
- **Database:** Docker container `karaoke-postgres` on port 5432 — running
