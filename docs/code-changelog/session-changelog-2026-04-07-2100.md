# Session Changelog — 2026-04-07 (Evening Session)

## Summary
Implemented hybrid YouTube IFrame + extraction fallback player to reduce 429 rate-limit exposure. Added embeddability detection at search time (zero extra quota cost), visual badges for embeddable vs non-embeddable videos, and sorted search results to prioritize embeddable content. Vibe quick-add now prefers embeddable videos. Multiple UI text changes.

---

## All Changes

### Hybrid IFrame + Extraction Player (Major Feature)

**Problem:** YouTube 429 rate-limiting on Cloud Run extractor IP blocks all video playback across all sessions. Extraction is a cat-and-mouse game with YouTube.

**Solution:** Try YouTube IFrame embed first for embeddable videos (60-70% of catalog). Only fall back to extraction for non-embeddable videos. Dramatically reduces extraction volume and 429 risk.

**New file: `client/src/components/YouTubeEmbed.jsx`**
- Wraps YouTube IFrame Player API with React component
- `forwardRef` with imperative `play()/pause()/getCurrentTime()/seekTo()` methods
- Detects embed-blocked videos via error codes 101/150 → triggers `onEmbedBlocked` callback
- Lazy-loads YouTube IFrame API with 10s timeout fallback
- Callback ref pattern avoids stale closures in event handlers

**Modified: `client/src/components/VideoPlayer.jsx`**
- Added `playerMode` state: `'embed'` or `'proxy'`
- Embeddable videos → YouTubeEmbed component (IFrame API)
- Non-embeddable or embed-blocked → `<video>` with `/api/stream/` proxy (existing behavior)
- `key={currentItem.videoId}` forces fresh YouTube player per video
- Play/pause sync works across both player modes
- Popout window uses same hybrid logic: embed first (if embeddable), proxy fallback
- Popout HTML loads YouTube IFrame API and handles embed→proxy fallback with error detection

**Modified: `client/src/components/MobilePlayer.jsx`**
- Same hybrid logic as desktop VideoPlayer
- YouTubeEmbed with `controls={false}` (uses custom overlay controls)
- `key={currentItem.videoId}` for fresh player per video

**Modified: `client/index.html`**
- Preloads YouTube IFrame API script (`async`) so it's ready before first play

**Modified: `client/src/styles/App.css`**
- `.youtube-embed-container` and iframe sizing for desktop and mobile

### Embeddability Detection at Search Time

**Modified: `server/src/services/youtubeService.js`**
- Added `status` to existing `videos.list` API call's `part` parameter: `'contentDetails,status'`
- Extracts `embeddable` boolean from `item.status.embeddable`
- Zero additional quota cost — same API call, just requesting extra data part
- `embeddable` field included in search result items returned to client

### Search Results UI

**Modified: `client/src/components/SearchResults.jsx`**
- Embeddable videos sorted to top, non-embeddable to bottom
- Random badge on each video thumbnail:
  - Cool (embeddable): Rad, Gnarly, Tubular, Fresh, Dope, etc. (cyan badge)
  - Not cool (non-embeddable): Bogus, Wack, Mid, Sus, etc. (orange badge)
- Non-embeddable cards dimmed (60% opacity, orange border)
- "Playback may be unreliable" warning text on non-embeddable
- "Add it Anyway" button text for non-embeddable (vs "Add to Playlist")
- Fixed React hooks ordering violation (`useMemo` moved before early return)

**Modified: `client/src/styles/App.css`**
- `.result-card-no-embed` — dimmed styling with orange border
- `.result-embed-warning` — orange warning text
- `.result-badge`, `.result-badge-cool`, `.result-badge-not-cool` — thumbnail badge styles

### Vibe Embeddable Preference

**Modified: `client/src/components/VibeSuggestions.jsx`**
- `handleQuickAdd` picks first embeddable result instead of `results[0]`
- `handleAddAll` same fix — prefers embeddable for each song

### UI Text Changes

**Modified: `client/src/components/HostDashboard.jsx`**
- "Let's Bounce" → "Bail" (both mobile and desktop host views)

### Bug Fix: Inactivity Countdown

**Modified: `client/src/components/HostDashboard.jsx`**
- Countdown timer was hanging on `0:01` — `setInactivityWarning` was called after the `seconds <= 0` early return
- Moved state update before the check so display shows `0:00` before room closes

---

## New Files
- `client/src/components/YouTubeEmbed.jsx` — YouTube IFrame Player API wrapper component

## Files Modified (9)
- `client/index.html` — YouTube IFrame API preload
- `client/src/components/VideoPlayer.jsx` — Hybrid embed/proxy player + popout
- `client/src/components/MobilePlayer.jsx` — Hybrid embed/proxy player
- `client/src/components/SearchResults.jsx` — Badges, sorting, warnings, button text
- `client/src/components/VibeSuggestions.jsx` — Prefer embeddable in quick-add
- `client/src/components/HostDashboard.jsx` — "Bail" text, countdown fix
- `client/src/styles/App.css` — Badge, embed container, warning styles
- `server/src/services/youtubeService.js` — Embeddable field from YouTube API
- `.claude/settings.local.json` — Tool permissions

---

### Stream/Extraction Route Deactivated

**Modified: `server/server.js`**
- Commented out `streamRoutes` require and route mounting
- `/api/stream/` endpoint no longer reachable
- Code preserved in `streamController.js` and `routes/stream.js` but inactive
- Reason: YouTube ToS violation risk, pending Google API quota increase application

## Architecture: Playback Chain (Final)

### Inline Player (Desktop/Mobile)
```
1. Check embeddable flag from search API
2. If embeddable → YouTube IFrame embed
3. If not embeddable → "Can't play in-app" + Watch on YouTube / Skip
4. If embed error at runtime → same error handling
```

### Pop-out Player
```
Opens YouTube.com directly in new window — no extraction, no embed.
User controls playback via YouTube's native UI.
Skip to next song available in main app.
```

---

## Future Options Documented (Memory)
- **Option J: YouTube-managed playlists** — Rooms create YouTube playlists, controls via API. Shelved due to quota.
- **Spotify integration** — Spotify has karaoke tracks (SBI Audio Karaoke). Web Playback SDK as fallback. Requires Premium.
- **KaraFun OEM API** — Full catalog/streaming/lyrics. Requires B2B partnership. Next step: email business@karafun.com.
