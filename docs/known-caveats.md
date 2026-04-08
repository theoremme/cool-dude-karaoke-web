# Known Caveats

## Video Extraction Removed

As of April 2026, all video extraction code (Cloud Run extractor, yt-dlp, @distube/ytdl-core, `/api/stream` proxy) has been removed. The app now uses a two-player architecture:
- **Embeddable videos:** YouTube IFrame Player API (in-app or popout)
- **Non-embeddable videos:** Opens YouTube directly in a separate window with a duration-based timer for auto-advance

## Room Auto-Close Inactivity Timer

The `[Activity]` debug logging fires on every room interaction (join, add song, playback sync, etc.). This is verbose and generates significant log output. Should be reduced to only log warnings/closures once the feature is confirmed stable over multiple sessions.

## Mobile Fullscreen / Landscape Lock

`screen.orientation.lock('landscape')` does not work on iOS Safari. The mobile player uses `position: fixed` to cover the screen but cannot force landscape orientation. Users must rotate their phone manually.

## Non-Embeddable Video Playback

~30-40% of karaoke videos are not embeddable. These open in a separate browser window (YouTube directly). The app uses a duration-based timer with a 25-second ad buffer to auto-advance. The host can reset the timer if an ad plays longer than expected.

## Popup Blockers

Non-embeddable videos require opening a new browser window. If the browser blocks popups, the host will see a prompt to manually open the video. A permission banner is shown on room creation to encourage allowing popups proactively.
