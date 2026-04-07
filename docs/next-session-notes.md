# Next Session Notes
## Updated: 2026-04-07

### Completed This Session
- Diagnosed and fixed $12/day Railway costs (Prisma singleton, join-room loop, graceful shutdown)
- Room auto-close after 10 min inactivity with "Hey dude - you there?" warning modal
- Deployed Cloud Run extractor to bypass YouTube bot detection (hardcoded URL fallback)
- Self-healing URL cache (clears on 403/410 from YouTube)
- Fullscreen mobile video player with SVG overlay controls
- Desktop ↔ mobile host playback sync via playback-sync events
- QR code 3D flip card with posse (guest) list
- Guest vibe support, search fixes, mobile auto-close handling
- Mobile playlist reorder (up/down buttons replacing drag)
- Mobile landscape safety styles
- UI polish: pink theme, "Get in, loser", "Let's Bounce", loading phrases
- Known caveats documentation

### Incomplete Tasks
1. **Remove verbose debug logging** — `[Activity]` logs on every touchRoom call. Remove once auto-close is stable.
2. **Remove debug formats endpoint** — `/api/stream/debug/:videoId` is unauthenticated.
3. **Clean up Railway env vars** — YT_PROXY, YT_COOKIES_BASE64 may still be set. Can remove.
4. **Popout video elapsed time sync** — Reverted from previous session.
5. **Unused files** — `server/src/services/streamService.js`, default Vite scaffold files.
6. **Vibe generation not tested e2e** — Requires ANTHROPIC_API_KEY.
7. **Room expiration cleanup** — Expired inactive rooms stay in DB.
8. **Docker image cleanup** — Python/yt-dlp could be removed since Cloud Run handles extraction.
9. **Permanent video extraction architecture** — Cloud Run works but is a separate service with a hardcoded URL. Consider consolidating.

### Known Issues
1. **Hardcoded Cloud Run URL** — `DEFAULT_EXTRACTOR_URL` in streamController.js. Must update code if Cloud Run URL changes. Railway env var was intermittently unavailable. See `docs/known-caveats.md`.
2. **Mobile landscape lock** — `screen.orientation.lock()` doesn't work on iOS Safari. Player uses fixed positioning instead.
3. **OAuth token store in-memory** — Lost on restart.
4. **Quota tracking resets on restart** — In-memory counter.
5. **Cloud Run cold starts** — First request after idle may be slow (~2-3s).

### Suggested Next Session Priorities
1. Monitor Railway costs — should be much lower now
2. Remove verbose debug logging and debug endpoints
3. Clean up unused env vars and files
4. Test vibe generation end-to-end
5. Consider PWA manifest for mobile "Add to Home Screen"

### Deployment Info
- **URL:** https://www.cooldudekaraoke.com
- **Platform:** Railway (Dockerfile) + Google Cloud Run (extractor)
- **Extractor:** https://yt-extractor-100464855375.us-east1.run.app
- **Database:** Railway PostgreSQL
- **GitHub:** https://github.com/theoremme/cool-dude-karaoke-web.git (master branch)
- **Auto-deploy:** Pushes to master trigger Railway deployment
- **Google Cloud:** User has billing set up with $300 free credits

### Services
- **Railway web service:** deployed, running
- **Cloud Run extractor:** deployed, running
- **Local Docker (karaoke-postgres):** running
- **Local dev servers:** not running
