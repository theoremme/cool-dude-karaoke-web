# Next Session Notes
## Updated: 2026-04-07 (Evening)

### Completed This Session
- Hybrid IFrame + extraction fallback player (YouTube embed first, proxy fallback)
- Embeddability detection at search time (zero extra quota cost)
- Cool/Not Cool badges on search results with sorting
- Vibe quick-add prefers embeddable videos
- "Add it Anyway" button text for non-embeddable videos
- "Let's Bounce" → "Bail"
- Fixed inactivity countdown hanging on 0:01

### Incomplete Tasks (Carried Forward)
1. **Remove verbose debug logging** — `[Activity]` logs on every touchRoom call
2. **Clean up Railway env vars** — YT_PROXY, YT_COOKIES_BASE64, EXTRACTOR_URL no longer needed
3. **Unused files** — `server/src/services/streamService.js`, `streamController.js`, `routes/stream.js` (deactivated), default Vite scaffold files
4. **Vibe generation not tested e2e** — Requires ANTHROPIC_API_KEY
5. **Room expiration cleanup** — Expired inactive rooms stay in DB
6. **Docker image cleanup** — Python/yt-dlp can be removed from Dockerfile entirely now
7. **Cloud Run extractor** — Still deployed but no longer called. Can be shut down to save resources.
8. **`embeddable` flag not persisted to DB** — On page refresh/guest join, player defaults to trying embed for all videos

### Known Issues
1. **Hardcoded Cloud Run URL** — `DEFAULT_EXTRACTOR_URL` in streamController.js
2. **Mobile landscape lock** — `screen.orientation.lock()` doesn't work on iOS Safari
3. **OAuth token store in-memory** — Lost on restart
4. **Quota tracking resets on restart** — In-memory counter
5. **Cloud Run cold starts** — First request after idle may be slow (~2-3s)
6. **Popout player uses YouTube embed for embeddable videos** — Shows YouTube branding/controls in popout. User may want cleaner experience but extraction-first defeats the purpose of reducing extraction load.
7. **`embeddable` flag not persisted to DB** — Playlist items from server sync don't have the flag. Player defaults to trying embed (correct behavior, but causes brief embed-fail-then-proxy for non-embeddable videos on page refresh/guest join).

### Suggested Next Session Priorities
1. Test hybrid player in production (deploy and monitor)
2. Monitor Railway costs and 429 frequency — should be much lower now
3. Remove verbose debug logging and debug endpoints
4. Clean up unused env vars and files
5. Consider adding `embeddable` column to PlaylistItem if the embed-fail flicker is noticeable
6. Consider PWA manifest for mobile "Add to Home Screen"

### Future Feature Ideas
- **KaraFun OEM API** — Email business@karafun.com for partnership terms. Full catalog/streaming/lyrics.
- **Spotify fallback** — Spotify has karaoke tracks. Web Playback SDK requires Premium. Audio-only (needs lyrics UI).
- **YouTube-managed playlists (Option J)** — Rooms create YouTube playlists, API controls. High quota cost.
- **Traffic analytics** — Plausible/Umami
- **Access control** — Email whitelist/waitlist

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
- **Local dev servers:** running (backend :3000, frontend :5174)
