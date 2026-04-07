# Known Caveats

## Hardcoded Cloud Run Extractor URL

**File:** `server/src/controllers/streamController.js`
**Line:** `const DEFAULT_EXTRACTOR_URL = 'https://yt-extractor-100464855375.us-east1.run.app';`

The Cloud Run extractor URL is hardcoded as a fallback because Railway's `EXTRACTOR_URL` env var was intermittently unavailable at runtime (would sometimes read as undefined despite being set in the dashboard). The env var still takes precedence if set, but the hardcoded default ensures video extraction always works.

**Risk:** If the Cloud Run service is redeployed to a different URL (new project, new region, etc.), the hardcoded URL must be updated in the code. The `EXTRACTOR_URL` env var alone won't fix it if the code falls through to the default.

**To change:** Update `DEFAULT_EXTRACTOR_URL` in `streamController.js` AND the `EXTRACTOR_URL` env var in Railway.

---

## YouTube Bot Detection on Railway

Railway's datacenter IP is permanently flagged by YouTube. Both `yt-dlp` and `@distube/ytdl-core` running on Railway get "Sign in to confirm you're not a bot." The Cloud Run extractor (running on Google's infrastructure) bypasses this.

**If the extractor stops working:** YouTube may have changed their API. Update `@distube/ytdl-core` in the `extractor/` service and redeploy to Cloud Run:
```bash
cd extractor
gcloud run deploy yt-extractor --source . --region us-east1 --allow-unauthenticated
```

---

## URL Cache Self-Healing

Extracted YouTube URLs are cached for 3 hours. If a URL expires before then, the proxy returns 403/410 from YouTube, the cache entry is cleared, and the next request fetches a fresh URL. The user may see one failed load before it self-heals.

---

## Room Auto-Close Inactivity Timer

The `[Activity]` debug logging fires on every room interaction (join, add song, playback sync, etc.). This is verbose and generates significant log output. Should be reduced to only log warnings/closures once the feature is confirmed stable over multiple sessions.

---

## Mobile Fullscreen / Landscape Lock

`screen.orientation.lock('landscape')` does not work on iOS Safari. The mobile player uses `position: fixed` to cover the screen but cannot force landscape orientation. Users must rotate their phone manually.
