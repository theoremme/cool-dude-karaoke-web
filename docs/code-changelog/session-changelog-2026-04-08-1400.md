# Session Changelog — 2026-04-08 (Afternoon)

## Summary
Major two-player refactor: removed all video extraction code (Cloud Run, yt-dlp, ytdl-core, stream proxy), replaced with embed-only architecture. Non-embeddable videos are now filtered from search results entirely. Added popout window manager, dedicated `/player` route, playback controller with 5 modes, duration timer service, and popup permission banner. Persisted `embeddable` flag and ISO 8601 duration string in DB.

---

## All Changes

### Phase 1: Extraction Cleanup

**Deleted files:**
- `server/src/controllers/streamController.js` — Video extraction chain (Cloud Run, ytdl-core, yt-dlp, proxy)
- `server/src/services/streamService.js` — Legacy stream service
- `server/src/routes/stream.js` — `/api/stream` route definitions

**Modified: `server/server.js`**
- Removed commented-out stream route import and mount

**Modified: `server/package.json`**
- Removed `@distube/ytdl-core` dependency

**Modified: `.env.example`**
- Removed `YT_DLP_PATH`

**Modified: `server/.env`**
- Removed `YT_DLP_PATH`

**Modified: `docs/known-caveats.md`**
- Rewrote to reflect extraction removal, document new architecture caveats

### Phase 2: Duration Timer Service

**New file: `client/src/services/durationTimer.js`**
- `DurationTimer` class using `Date.now()` deltas (drift-resistant for background tabs)
- `start()`, `reset()`, `clear()` methods with `onTick` and `onComplete` callbacks

**New file: `client/src/services/durationParser.js`**
- `parseVideoDuration(iso)` — ISO 8601 to seconds (with 30s–60min sanity check)
- `formatDuration(iso)` — ISO 8601 to human-readable `M:SS` or `H:MM:SS`

**Modified: `server/src/services/youtubeService.js`**
- Changed `duration` in search results from parsed seconds (Int) to raw ISO 8601 string

**Modified: `server/prisma/schema.prisma`**
- Changed `PlaylistItem.duration` from `Int?` to `String? @db.VarChar(30)`
- Migration: `20260408133542_duration_to_iso_string`

**Modified: `client/src/components/SearchResults.jsx`**
- Import and use `formatDuration` for duration display

**Modified: `client/src/components/PlaylistQueue.jsx`**
- Import and use `formatDuration` for duration display

**Modified: `client/src/components/VibeSuggestions.jsx`**
- Import and use `formatDuration` for duration display

**Modified: `client/src/components/CloseoutPage.jsx`**
- Replaced local `formatDuration(seconds)` with imported `formatDuration(iso)` from durationParser

### Phase 3: PopoutManager Service

**New file: `client/src/services/popoutManager.js`**
- `PopoutManager` class with named window `'cdkPlayer'`
- `open()` navigates to `/player-loading` placeholder
- `loadVideo({ videoId, embeddable })` navigates to `/player?v=...` (embeddable) or `youtube.com/watch?v=...` (non-embeddable)
- `sendMessage()` with try/catch for cross-origin (expected in YouTube mode)
- `startPolling(onClosed)` / `stopPolling()` for window close detection

### Phase 4: Dedicated `/player` Route

**New file: `client/src/components/PopoutPlayer.jsx`**
- Reads `?v=videoId&autoplay=1` from URL params
- Renders `YouTubeEmbed` fullscreen (100vw x 100vh)
- Listens for postMessage: `LOAD_VIDEO`, `PLAY`, `PAUSE`, `SKIP`
- Sends postMessage: `VIDEO_ENDED`, `PLAYER_READY`, `PLAYBACK_STATE`, `EMBED_BLOCKED`

**New file: `client/src/components/PlayerLoading.jsx`**
- Black screen with spinner — lightweight placeholder for popout before video loads

**Modified: `client/src/App.jsx`**
- Added `/player` route (PopoutPlayer) — unprotected
- Added `/player-loading` route (PlayerLoading) — unprotected

### Phase 5: Unified Playback Controller

**New file: `client/src/hooks/usePlaybackController.js`**
- 5 modes: `iframe`, `popout-embed`, `popout-youtube`, `popup-youtube`, `popup-blocked`
- `playSong(song)` — determines mode based on embeddability and popout state
- `skip()` — clears timer, closes popups, advances
- `disableTimer()` / `resumePlaylist()` — pause/resume auto-advance
- `handleEmbedBlocked()` — runtime fallback from iframe to YouTube popup when embed fails
- `reopenPopup()` / `retryPopup()` — recovery actions
- AD_BUFFER_SECONDS = 45, FALLBACK_DURATION_SECONDS = 480 (8 min)

**Modified: `client/src/components/HostDashboard.jsx`**
- Creates `PopoutManager` instance (ref-stable)
- Wires `usePlaybackController` with playlist context
- Passes `playbackController` and `popoutManager` to VideoPlayer and MobilePlayer
- Emits `playback-sync` with `mode` when playback mode changes
- Added popup permission banner (dismissible, sessionStorage)
- Added popup help modal with Chrome/Firefox/Safari instructions

### Phase 6: Main App UI Updates

**Modified: `client/src/components/VideoPlayer.jsx`**
- Accepts `playbackController` and `popoutManager` props
- Triggers `playSong()` on currentItem change
- iframe mode: YouTube IFrame embed (unchanged behavior)
- popout-embed mode: "Playing in popout window" status with return/skip
- YouTube modes: Prominent countdown timer with song title, "Next song in" label, neon glow, Disable Timer / Skip Now buttons
- popup-blocked mode: Warning with retry button
- Popout toggle button switches between inline and popout
- `handleEmbedBlocked` calls controller to switch from iframe to YouTube mode at runtime

**Modified: `client/src/components/MobilePlayer.jsx`**
- Accepts `playbackController` prop
- Play/pause disabled (greyed out) in YouTube modes
- "YouTube" mode badge shown when in YouTube mode
- Countdown timer visible in mobile view
- Skip uses controller's `skip()` function

### Phase 7: Socket.io Sync Updates

**Modified: `server/src/services/socketService.js`**
- `playback-sync` event now accepts and broadcasts `mode`

**Modified: `client/src/components/GuestView.jsx`**
- Added `playbackMode` state from `playback-sync` events
- Now Playing card shows "PLAYING ON YOUTUBE" when mode is YouTube

**Modified: `client/src/components/HostDashboard.jsx`**
- Accepts `mode` in `playback-sync` listener

### Phase 8: Popup Permission Prompt

**Modified: `client/src/components/HostDashboard.jsx`**
- Dismissible banner: "For the smoothest experience, allow popups..."
- "How?" link opens modal with Chrome/Firefox/Safari popup instructions
- Dismissal persisted in `sessionStorage`
- Shown in both mobile and desktop layouts

### Embeddable Flag Persistence (Bug Fix)

**Modified: `server/prisma/schema.prisma`**
- Added `embeddable Boolean @default(true)` to PlaylistItem
- Migration: `20260408141729_add_embeddable_to_playlist_item`

**Modified: `server/src/services/socketService.js`**
- `add-song` handler accepts and saves `embeddable`

**Modified: `client/src/contexts/PlaylistContext.jsx`**
- `addItem` and `addItems` now send `embeddable` in socket event
- `normalizeServerItems` includes `embeddable` field

### Non-Embeddable Video Filtering

**Modified: `client/src/components/SearchResults.jsx`**
- Non-embeddable videos filtered out of results entirely (not just sorted)
- Removed Cool/Not Cool badges
- Removed "Playback may be unreliable" warning text
- Removed "Add it Anyway" button text
- Removed `result-card-no-embed` CSS class usage

---

## New Files (7)
- `client/src/services/durationTimer.js`
- `client/src/services/durationParser.js`
- `client/src/services/popoutManager.js`
- `client/src/hooks/usePlaybackController.js`
- `client/src/components/PopoutPlayer.jsx`
- `client/src/components/PlayerLoading.jsx`
- `server/prisma/migrations/` (2 new migrations)

## Deleted Files (3)
- `server/src/controllers/streamController.js`
- `server/src/services/streamService.js`
- `server/src/routes/stream.js`

## Files Modified (17)
- `server/server.js`
- `server/package.json`
- `server/prisma/schema.prisma`
- `server/src/services/socketService.js`
- `server/src/services/youtubeService.js`
- `client/src/App.jsx`
- `client/src/components/HostDashboard.jsx`
- `client/src/components/VideoPlayer.jsx`
- `client/src/components/MobilePlayer.jsx`
- `client/src/components/SearchResults.jsx`
- `client/src/components/GuestView.jsx`
- `client/src/components/PlaylistQueue.jsx`
- `client/src/components/VibeSuggestions.jsx`
- `client/src/components/CloseoutPage.jsx`
- `client/src/contexts/PlaylistContext.jsx`
- `docs/known-caveats.md`
- `.env.example`

## Dependencies Removed
- `@distube/ytdl-core` from server/package.json

---

## Architecture: Playback Modes

```
currentItem changes → usePlaybackController.playSong(song)
  ├── embeddable + no popout  → mode: 'iframe'      (IFrame in main app)
  ├── embeddable + popout     → mode: 'popout-embed' (IFrame in /player window)
  ├── non-embeddable + popout → mode: 'popout-youtube' (youtube.com in popout)
  ├── non-embeddable + no popout → mode: 'popup-youtube' (youtube.com in new window)
  └── popup blocked by browser → mode: 'popup-blocked' (retry UI)

Runtime fallback: IFrame error 101/150 → handleEmbedBlocked → switches to YouTube mode
```

**Current state:** Non-embeddable videos filtered from search results. YouTube popup modes exist but are not triggered in normal flow.
