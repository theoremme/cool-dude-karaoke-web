import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';

const PlaylistContext = createContext();

const STORAGE_KEY = 'karaoke-playlist-' + window.location.pathname;

// Normalize server DB items to client format
function normalizeServerItems(serverItems) {
  return serverItems.map((item) => ({
    id: item.id,
    videoId: item.videoId || item.video_id,
    title: item.title,
    thumbnail: item.thumbnailUrl || item.thumbnail_url || item.thumbnail,
    duration: item.duration,
    channelName: item.channelName || item.channel_name,
    addedByName: item.addedByName || item.added_by_name,
    addedAt: item.addedAt || item.added_at,
    position: item.position,
  }));
}

function loadPersistedState() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        items: parsed.items || [],
        currentIndex: parsed.currentIndex ?? -1,
        isPlaying: false,
      };
    }
  } catch (e) {
    // Corrupted storage — start fresh
  }
  return null;
}

const defaultState = {
  items: [],
  currentIndex: -1,
  isPlaying: false,
};

let nextId = 1;

function playlistReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const item = {
        ...action.payload,
        id: `pl-${nextId++}`,
        addedAt: Date.now(),
      };
      return { ...state, items: [...state.items, item] };
    }

    case 'ADD_ITEMS': {
      const newItems = action.payload.map((video) => ({
        ...video,
        id: `pl-${nextId++}`,
        addedAt: Date.now(),
      }));
      return { ...state, items: [...state.items, ...newItems] };
    }

    case 'REMOVE_ITEM': {
      const idx = action.payload;
      const newItems = state.items.filter((_, i) => i !== idx);
      let newIndex = state.currentIndex;
      if (idx < state.currentIndex) {
        newIndex--;
      } else if (idx === state.currentIndex) {
        if (newIndex >= newItems.length) {
          newIndex = newItems.length - 1;
        }
        if (newItems.length === 0) {
          return { items: newItems, currentIndex: -1, isPlaying: false };
        }
      }
      return { ...state, items: newItems, currentIndex: newIndex };
    }

    case 'SET_PLAYLIST': {
      const newItems = action.payload;
      // Try to preserve currentIndex by matching the currently playing videoId
      let newIndex = state.currentIndex;
      if (state.currentIndex >= 0 && state.currentIndex < state.items.length) {
        const currentVideoId = state.items[state.currentIndex].videoId;
        const found = newItems.findIndex((item) => item.videoId === currentVideoId);
        newIndex = found >= 0 ? found : Math.min(state.currentIndex, newItems.length - 1);
      }
      if (newItems.length === 0) {
        newIndex = -1;
      }
      return { ...state, items: newItems, currentIndex: newIndex };
    }

    case 'PLAY_INDEX':
      return {
        ...state,
        currentIndex: action.payload,
        isPlaying: true,
      };

    case 'PLAY_NEXT': {
      const next = state.currentIndex + 1;
      if (next < state.items.length) {
        return { ...state, currentIndex: next, isPlaying: true };
      }
      return { ...state, isPlaying: false };
    }

    case 'TOGGLE_PLAY':
      if (state.items.length === 0) return state;
      if (state.currentIndex === -1) {
        return { ...state, currentIndex: 0, isPlaying: true };
      }
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'MOVE_ITEM': {
      const { from, to } = action.payload;
      if (from === to) return state;
      const moved = [...state.items];
      const [item] = moved.splice(from, 1);
      moved.splice(to, 0, item);

      let newIndex = state.currentIndex;
      if (state.currentIndex === from) {
        newIndex = to;
      } else if (from < state.currentIndex && to >= state.currentIndex) {
        newIndex--;
      } else if (from > state.currentIndex && to <= state.currentIndex) {
        newIndex++;
      }
      return { ...state, items: moved, currentIndex: newIndex };
    }

    case 'CLEAR_PLAYLIST':
      return { ...defaultState };

    default:
      return state;
  }
}

export function PlaylistProvider({ children }) {
  const [state, dispatch] = useReducer(playlistReducer, defaultState, () => loadPersistedState() || defaultState);

  // Socket connection refs — set via connectSocket()
  const socketRef = useRef(null);
  const roomIdRef = useRef(null);
  const userNameRef = useRef(null);
  const [userName, setUserName] = useState(null);
  const isRemoteUpdate = useRef(false);

  // Persist state to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: state.items,
        currentIndex: state.currentIndex,
      }));
    } catch (e) {
      // Storage full or unavailable
    }
  }, [state.items, state.currentIndex]);

  // Connect socket for real-time sync — called by host/guest components
  const connectSocket = useCallback((socket, roomId, name) => {
    socketRef.current = socket;
    roomIdRef.current = roomId;
    userNameRef.current = name;
    setUserName(name);
  }, []);

  const emitSocket = useCallback((event, data) => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit(event, { roomId: roomIdRef.current, ...data });
    }
  }, []);

  // Replace entire playlist from server state
  const setPlaylist = useCallback((serverItems) => {
    const normalized = normalizeServerItems(serverItems);
    dispatch({ type: 'SET_PLAYLIST', payload: normalized });
  }, []);

  const addItem = useCallback((video) => {
    dispatch({ type: 'ADD_ITEM', payload: video });
    emitSocket('add-song', {
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      channelName: video.channelName,
      addedByName: userNameRef.current || 'Anonymous',
    });
  }, [emitSocket]);

  const addItems = useCallback((videos) => {
    dispatch({ type: 'ADD_ITEMS', payload: videos });
    // Emit each individually — server handles one at a time
    videos.forEach((video) => {
      emitSocket('add-song', {
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        channelName: video.channelName,
        addedByName: userNameRef.current || 'Anonymous',
      });
    });
  }, [emitSocket]);

  const removeItem = useCallback((index) => {
    // Look up the item's server ID before dispatching
    const item = state.items[index];
    dispatch({ type: 'REMOVE_ITEM', payload: index });
    if (item?.id && !item.id.startsWith('pl-')) {
      emitSocket('remove-song', { itemId: item.id });
    }
  }, [state.items, emitSocket]);

  const moveItem = useCallback((from, to) => {
    const item = state.items[from];
    dispatch({ type: 'MOVE_ITEM', payload: { from, to } });
    if (item?.id && !item.id.startsWith('pl-')) {
      emitSocket('reorder-song', { itemId: item.id, newPosition: to });
    }
  }, [state.items, emitSocket]);

  const clearPlaylist = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAYLIST' });
    emitSocket('clear-playlist', {});
  }, [emitSocket]);

  // Clear local state only — does NOT delete from server
  const clearLocal = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAYLIST' });
  }, []);

  const playIndex = useCallback((index) => {
    dispatch({ type: 'PLAY_INDEX', payload: index });
  }, []);

  const playNext = useCallback(() => {
    dispatch({ type: 'PLAY_NEXT' });
  }, []);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const setPlaying = useCallback((val) => {
    dispatch({ type: 'SET_PLAYING', payload: val });
  }, []);

  // Receive playback state from remote (host → guests)
  const setPlaybackState = useCallback((currentIndex, isPlaying) => {
    isRemoteUpdate.current = true;
    dispatch({ type: 'PLAY_INDEX', payload: currentIndex });
    if (!isPlaying) {
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  }, []);

  // Broadcast playback state to other clients when it changes locally
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    emitSocket('playback-sync', {
      currentIndex: state.currentIndex,
      isPlaying: state.isPlaying,
    });
  }, [state.currentIndex, state.isPlaying, emitSocket]);

  const currentItem =
    state.currentIndex >= 0 && state.currentIndex < state.items.length
      ? state.items[state.currentIndex]
      : null;

  const value = {
    ...state,
    currentItem,
    userName,
    addItem,
    addItems,
    removeItem,
    playIndex,
    playNext,
    togglePlay,
    setPlaying,
    moveItem,
    clearPlaylist,
    clearLocal,
    connectSocket,
    setPlaylist,
    setPlaybackState,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
}
