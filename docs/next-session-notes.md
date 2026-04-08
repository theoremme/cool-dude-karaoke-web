# Next Session Notes
## Updated: 2026-04-08 (Afternoon)

### Completed This Session
- Two-player refactor: removed all extraction code (Cloud Run, yt-dlp, ytdl-core, /api/stream)
- Added popout window manager, /player route, usePlaybackController (5 modes)
- Duration timer service (Date.now()-based, drift-resistant)
- ISO 8601 duration stored in DB, parsed/formatted client-side
- Persisted `embeddable` boolean on PlaylistItem in DB
- Non-embeddable videos filtered from search results (embed-only for now)
- Popup permission banner with browser-specific instructions
- Playback mode synced to guests via Socket.io
- Pushed to master, Railway deploying

### Incomplete Tasks (Carried Forward)
1. **Remove verbose debug logging** — `[Activity]` logs on every touchRoom call
2. **Clean up Railway env vars** — YT_PROXY, YT_COOKIES_BASE64, EXTRACTOR_URL, EXTRACTOR_API_KEY no longer needed
3. **Vibe generation not tested e2e** — Requires ANTHROPIC_API_KEY
4. **Room expiration cleanup** — Expired inactive rooms stay in DB
5. **Docker image cleanup** — Python/yt-dlp can be removed from Dockerfile since extraction is gone
6. **Cloud Run extractor** — Still deployed but no longer called. Can be shut down.
7. **Unused CSS** — `.result-card-no-embed`, `.result-embed-warning`, `.result-badge*` classes still in App.css

### Known Issues
1. **Mobile landscape lock** — `screen.orientation.lock()` doesn't work on iOS Safari
2. **OAuth token store in-memory** — Lost on restart
3. **Quota tracking resets on restart** — In-memory counter
4. **Non-embeddable videos hidden** — ~30-40% of karaoke catalog not available. YouTube popup approach tested but UX was poor (buffering, no fullscreen control, timer sync issues)
5. **YouTube popup code dormant** — All 5 playback modes implemented but YouTube modes won't trigger since non-embeddable videos are filtered from search results

### Research In Progress
- **KaraFun OEM API** — User wants to research integration. Email business@karafun.com for partnership terms. Full catalog/streaming/lyrics. Could solve the non-embeddable gap.

### Suggested Next Session Priorities
1. **KaraFun integration research** — User's stated next priority
2. Verify Railway deployment is healthy (extraction code removed, migrations applied)
3. Clean up Railway env vars (extraction-related)
4. Remove Python/yt-dlp from Dockerfile to reduce image size
5. Shut down Cloud Run extractor service
6. Remove unused CSS classes from App.css

### Future Feature Ideas
- **KaraFun OEM API** — Full catalog/streaming/lyrics via B2B partnership
- **Spotify fallback** — Spotify has karaoke tracks. Web Playback SDK requires Premium. Audio-only.
- **Traffic analytics** — Plausible/Umami
- **Access control** — Email whitelist/waitlist
- **PWA manifest** — Mobile "Add to Home Screen"

### Deployment Info
- **URL:** https://www.cooldudekaraoke.com
- **Platform:** Railway (Dockerfile)
- **Database:** Railway PostgreSQL
- **GitHub:** https://github.com/theoremme/cool-dude-karaoke-web.git (master branch)
- **Auto-deploy:** Pushes to master trigger Railway deployment
- **Cloud Run extractor:** Still deployed but unused — can be shut down

### Services
- **Railway web service:** deploying (push just sent)
- **Cloud Run extractor:** deployed but no longer called
- **Local Docker (karaoke-postgres):** running
- **Local dev servers:** running (backend :3000, frontend :5174)
