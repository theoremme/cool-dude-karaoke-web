# WEB APP - PHASE 3 PROMPT: Cool Dude Karaoke Frontend Migration

## What to Do

1. **Complete Phases 1 & 2** (backend + Socket.io should be working)
2. **Have your Cool Dude Karaoke desktop app accessible** for reference
3. **Open Claude Code** in your web app project
4. **Copy and paste the prompt below**

---

## 📋 PROMPT FOR CLAUDE CODE:

I'm building the web version of **Cool Dude Karaoke** (a desktop Electron app I've already built). Phases 1 & 2 are complete (backend + WebSocket working).

Read `CUSTOM-MIGRATION-GUIDE.md` for complete context on the desktop app architecture.

**Phase 3 Goal:** Build React frontend by reusing/adapting components from the desktop app.

## 🎨 About Cool Dude Karaoke

**What it is:** Karaoke party app with YouTube search, AI-powered vibe playlist generation (Claude), YouTube playlist sync, and a distinctive neon Tron visual theme.

**Unique features to preserve:**
- AI Vibe Generator - Claude generates 50 themed song suggestions
- Show Versions - Compare multiple karaoke versions per song
- Add All with progress - Sequential bulk-add with visual feedback
- Lazy YouTube search - Only searches when user clicks Add/Versions (saves quota)
- Neon Tron theme - Cyan/magenta/purple gradients with glow effects

**Desktop → Web key changes:**
- `window.api.*` IPC calls → `fetch()` REST API calls + WebSocket
- Electron webview → YouTube IFrame Player API
- Single-user → Multi-user rooms

---

## 📁 Project Structure to Create

```
client/
├── src/
│   ├── components/
│   │   ├── SearchBar.js           (COPY from desktop)
│   │   ├── SearchResults.js       (COPY from desktop)
│   │   ├── VibeSuggestions.js     (ADAPT from desktop)
│   │   ├── VideoPlayer.js         (REWRITE for web)
│   │   ├── PlaylistQueue.js       (COPY from desktop)
│   │   ├── PlaylistSync.js        (ADAPT from desktop)
│   │   ├── Settings.js            (SIMPLIFY from desktop)
│   │   ├── RoomLobby.js           (NEW - room creation)
│   │   ├── GuestView.js           (NEW - mobile view)
│   │   └── HostDashboard.js       (NEW - main display)
│   ├── contexts/
│   │   └── PlaylistContext.js     (COPY from desktop)
│   ├── hooks/
│   │   ├── useSocket.js           (NEW - Socket.io)
│   │   └── useAuth.js             (NEW - authentication)
│   ├── services/
│   │   └── api.js                 (NEW - backend API calls)
│   ├── styles/
│   │   └── App.css                (COPY from desktop + responsive tweaks)
│   ├── assets/
│   │   ├── cool-dude-karaoke-logo-v1.png  (COPY from desktop)
│   │   └── cool-dude-karaoke-logo-v2.png  (COPY from desktop)
│   ├── App.js                     (ADAPT from desktop)
│   ├── index.js                   (standard React entry)
│   └── index.html
├── public/
├── package.json
├── vite.config.js
└── tailwind.config.js (OPTIONAL - desktop uses raw CSS)
```

---

## 🔄 Component Migration Instructions

I'll provide the actual desktop app components below. For each one, follow these specific adaptation instructions:

### 1. PlaylistContext.js - COPY DIRECTLY ✅

**No changes needed!** This is pure React with useReducer. Copy exactly as-is.

**What it does:**
- Manages playlist items array
- Tracks current playing index
- Handles add/remove/reorder/play actions
- Drag-and-drop support

---

### 2. SearchBar.js - COPY DIRECTLY ✅

**No changes needed!** Pure presentational component.

**Props it expects:**
- `onSearch(query)` - callback
- `onVibe(theme)` - callback  
- `loading` - boolean
- `vibeLoading` - boolean

**What it does:**
- Text input with Search and Vibe buttons
- Disables during loading states

---

### 3. SearchResults.js - COPY DIRECTLY ✅

**No changes needed!** Uses PlaylistContext, pure React.

**Props it expects:**
- `results` - array of `{videoId, title, channelName, thumbnail, duration}`

**What it does:**
- Grid display of search results
- "Add to Playlist" button per result
- Checks for duplicates via PlaylistContext

---

### 4. PlaylistQueue.js - COPY DIRECTLY ✅

**No changes needed!** Pure React with HTML5 drag-and-drop.

**What it does:**
- Displays playlist queue
- Drag-and-drop reordering
- Remove song button
- Highlight currently playing
- Double-click to play
- Clear all button

---

### 5. App.css - COPY + RESPONSIVE TWEAKS 🔄

**Copy the entire file, then add:**

```css
/* Mobile responsive additions */
@media (max-width: 768px) {
  .app-body {
    flex-direction: column;
  }
  
  .left-panel,
  .right-panel {
    width: 100% !important;
    max-width: none;
  }
  
  .search-results,
  .results-grid {
    grid-template-columns: 1fr;
  }
}

/* Touch-friendly button sizing */
@media (max-width: 768px) {
  .search-button,
  .vibe-button,
  .btn-add,
  .btn-vibe-add {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**Preserve:**
- All neon cyan/magenta/purple colors
- All gradient backgrounds
- All glow effects (text-shadow, box-shadow)
- All button styles
- All animations

---

### 6. App.js - ADAPT (Replace window.api calls) 🔄

**Keep:**
- Layout structure (header with logo + settings, two-panel body)
- All state management (results, vibeSuggestions, loading, error, etc.)
- Settings panel toggle
- Search/vibe flow logic

**Change - Replace ALL window.api calls:**

```javascript
// ❌ DESKTOP VERSION:
const results = await window.api.searchYouTube(query);

// ✅ WEB VERSION:
const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
if (!res.ok) throw new Error('Search failed');
const results = await res.json();
```

**API calls to replace:**
1. `window.api.searchYouTube(query)` → `fetch('/api/youtube/search?q=...')`
2. `window.api.vibeGenerate(theme, exclusions)` → `fetch('/api/vibe/generate', { method: 'POST', body: ... })`

**Add props for web:**
- Accept `roomId` as prop (from route params)
- Pass `roomId` to components that need it

---

### 7. VibeSuggestions.js - ADAPT (Replace window.api calls) 🔄

**Keep:**
- All 3 components: SongVersions, VibeSuggestionItem, VibeSuggestions
- Show Versions flow
- Add All sequential logic with progress
- All UI/UX

**Change - 3 locations:**

**Location 1 - SongVersions component:**
```javascript
// ❌ DESKTOP:
const results = await window.api.searchYouTube(`${song.title} ${song.artist}`);

// ✅ WEB:
const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(`${song.title} ${song.artist}`)}`);
const results = await res.json();
```

**Location 2 - VibeSuggestionItem quick add:**
```javascript
// Same replacement as above
```

**Location 3 - VibeSuggestions handleAddAll:**
```javascript
// Inside the loop, same replacement
```

---

### 8. PlaylistSync.js - ADAPT (IPC → WebSocket) 🔄

**Keep:**
- UI layout (input, connect button, status display)
- Connected playlist display
- Error handling

**Change - Replace IPC with WebSocket:**

```javascript
// ❌ DESKTOP:
await window.api.syncConnect(playlistId);
window.api.on('sync-new-items', handleNewItems);
window.api.off('sync-new-items', handleNewItems);
window.api.syncDisconnect();

// ✅ WEB:
await fetch('/api/sync/connect', {
  method: 'POST',
  body: JSON.stringify({ roomId, playlistId })
});
socket.on('sync-new-items', handleNewItems);
socket.off('sync-new-items', handleNewItems);
await fetch('/api/sync/disconnect', { method: 'POST' });
```

**Add:**
- Accept `roomId` and `socket` as props
- Use provided socket instance instead of window.api

---

### 9. Settings.js - SIMPLIFY for Web 🔄

**Desktop version:** Manages YouTube and Anthropic API keys locally

**Web version:** API keys are server-side only (security)

**Simplify to:**
- Room name/description settings
- User preferences (if authenticated)
- Visual theme toggle (optional)
- Remove all API key management

**Or skip entirely for MVP** - Settings can be added later

---

### 10. VideoPlayer.js - COMPLETE REWRITE 🔨

**Desktop version:** Uses Electron `<webview>` with CSS injection (332 lines)

**Web version:** Use YouTube IFrame Player API

**Keep these concepts:**
- Auto-advance when video ends
- Play/pause state sync
- Popout concept (use Picture-in-Picture API)
- Loading states

**New implementation:**

```javascript
import { useEffect, useRef } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

function VideoPlayer({ roomId, isHost }) {
  const { currentItem, isPlaying, playNext, setPlaying } = usePlaylist();
  const playerRef = useRef(null);

  useEffect(() => {
    if (!currentItem) return;

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    // Initialize player when API ready
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('player', {
        videoId: currentItem.videoId,
        events: {
          onReady: (event) => {
            if (isHost) event.target.playVideo();
          },
          onStateChange: (event) => {
            // Auto-advance on end
            if (event.data === window.YT.PlayerState.ENDED) {
              playNext();
            }
            // Sync playing state
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false);
            }
          },
          onError: (event) => {
            // Handle embedding restrictions
            console.error('Video unavailable:', event.data);
            // Auto-skip and show error
            playNext();
            alert('Video cannot be embedded. Skipping to next.');
          }
        }
      });
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [currentItem?.videoId]);

  if (!currentItem) {
    return (
      <div className="video-player-empty">
        <p>No video playing. Add songs to the queue!</p>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div id="player"></div>
      <div className="video-info">
        <h3>{currentItem.title}</h3>
        <p>{currentItem.channelName}</p>
      </div>
    </div>
  );
}

export default VideoPlayer;
```

**Note:** ~40% of videos will show "Video unavailable" error due to embedding restrictions. This is the trade-off for web.

---

### 11. NEW COMPONENTS (Web Only)

#### RoomLobby.js - Room Creation
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RoomLobby() {
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName })
      });
      const { room, inviteCode } = await res.json();
      navigate(`/host/${inviteCode}`);
    } catch (err) {
      alert('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="room-lobby">
      <h1>Create Karaoke Room</h1>
      <input
        type="text"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Room name (e.g., Friday Night Karaoke)"
      />
      <button onClick={handleCreate} disabled={!roomName.trim() || creating}>
        {creating ? 'Creating...' : 'Create Room'}
      </button>
    </div>
  );
}

export default RoomLobby;
```

#### GuestView.js - Mobile Interface
```javascript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import PlaylistQueue from './PlaylistQueue';
import { useSocket } from '../hooks/useSocket';

function GuestView() {
  const { inviteCode } = useParams();
  const [guestName, setGuestName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [results, setResults] = useState([]);
  const socket = useSocket();

  const handleJoin = () => {
    socket.emit('join-room', { inviteCode, guestName });
    setHasJoined(true);
  };

  const handleSearch = async (query) => {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();
    setResults(results);
  };

  if (!hasJoined) {
    return (
      <div className="guest-join">
        <h2>Join Karaoke Room</h2>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={handleJoin}>Join</button>
      </div>
    );
  }

  return (
    <div className="guest-view">
      <h2>Add Songs</h2>
      <SearchBar onSearch={handleSearch} />
      <SearchResults results={results} />
      <h3>Up Next</h3>
      <PlaylistQueue />
    </div>
  );
}

export default GuestView;
```

#### HostDashboard.js - Main Display
```javascript
import { useParams } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import PlaylistQueue from './PlaylistQueue';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import VibeSuggestions from './VibeSuggestions';
import PlaylistSync from './PlaylistSync';
import { useState } from 'react';

function HostDashboard() {
  const { inviteCode } = useParams();
  const [results, setResults] = useState([]);
  const [vibeResults, setVibeResults] = useState([]);

  const handleSearch = async (query) => {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
  };

  const handleVibe = async (theme) => {
    const res = await fetch('/api/vibe/generate', {
      method: 'POST',
      body: JSON.stringify({ theme })
    });
    setVibeResults(await res.json());
  };

  return (
    <div className="host-dashboard">
      <div className="host-main">
        <VideoPlayer isHost={true} />
        <SearchBar onSearch={handleSearch} onVibe={handleVibe} />
        <SearchResults results={results} />
        {vibeResults.length > 0 && (
          <VibeSuggestions suggestions={vibeResults} theme="..." />
        )}
      </div>
      <div className="host-sidebar">
        <div className="invite-code">
          <h3>Invite Code: {inviteCode}</h3>
          <p>Share: {window.location.origin}/room/{inviteCode}</p>
        </div>
        <PlaylistQueue />
        <PlaylistSync roomId={inviteCode} />
      </div>
    </div>
  );
}

export default HostDashboard;
```

---

## 🔌 New Services

### services/api.js
```javascript
export const searchYouTube = async (query) => {
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
};

export const generateVibe = async (theme, exclusions = []) => {
  const res = await fetch('/api/vibe/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, exclusions })
  });
  if (!res.ok) throw new Error('Vibe generation failed');
  return res.json();
};

export const createRoom = async (name) => {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return res.json();
};

// ... more API functions
```

### hooks/useSocket.js
```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket = io(); // Same origin

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => socket.disconnect();
  }, []);

  return socket;
};
```

---

## 🎨 Vite Configuration

**vite.config.js (for local dev):**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
```

---

## ✅ Success Criteria

After implementation, I should have:
- [ ] All desktop components copied/adapted
- [ ] Neon Tron theme preserved (cyan/magenta/purple)
- [ ] YouTube search working
- [ ] AI Vibe generation working (50 songs)
- [ ] Show Versions working
- [ ] Add All with progress working
- [ ] Playlist queue with drag-and-drop
- [ ] VideoPlayer with auto-advance (YouTube IFrame API)
- [ ] Room creation working
- [ ] Guest mobile view working
- [ ] Host dashboard working
- [ ] Real-time sync via WebSocket
- [ ] Mobile responsive

---

## 🚨 Critical Reminders

**Preserve these special features:**
1. **AI Vibe** - Claude generates 50 song suggestions by theme
2. **Lazy search** - Only searches YouTube when user clicks Add/Versions
3. **Show Versions** - Multiple karaoke versions per song
4. **Add All progress** - Sequential adds with visual progress
5. **Neon theme** - All gradients, glows, animations

**Accept this limitation:**
- ~40% of videos won't play (embedding restrictions)
- Show clear error and skip to next

**NO CORS needed:**
- Frontend and backend on same Railway deployment
- All API calls are same-origin

Please implement Phase 3 following these exact instructions. The desktop components I'm giving you are production-ready and well-tested. Keep the neon Tron aesthetic - it's the app's visual identity!
