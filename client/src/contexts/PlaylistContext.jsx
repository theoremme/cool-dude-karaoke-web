import React, { createContext, useContext, useReducer, useCallback } from 'react';

const PlaylistContext = createContext();

const initialState = {
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
        // Current song removed — stay at same index (next song slides in)
        // If we removed the last item, go back one
        if (newIndex >= newItems.length) {
          newIndex = newItems.length - 1;
        }
        // If playlist is now empty, reset
        if (newItems.length === 0) {
          return { items: newItems, currentIndex: -1, isPlaying: false };
        }
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
      // Playlist finished
      return { ...state, isPlaying: false };
    }

    case 'TOGGLE_PLAY':
      if (state.items.length === 0) return state;
      // If nothing is playing yet, start from the beginning
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

      // Update currentIndex to follow the currently playing song
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
      return { ...initialState };

    default:
      return state;
  }
}

export function PlaylistProvider({ children }) {
  const [state, dispatch] = useReducer(playlistReducer, initialState);

  const addItem = useCallback((video) => {
    dispatch({ type: 'ADD_ITEM', payload: video });
  }, []);

  const addItems = useCallback((videos) => {
    dispatch({ type: 'ADD_ITEMS', payload: videos });
  }, []);

  const removeItem = useCallback((index) => {
    dispatch({ type: 'REMOVE_ITEM', payload: index });
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

  const moveItem = useCallback((from, to) => {
    dispatch({ type: 'MOVE_ITEM', payload: { from, to } });
  }, []);

  const clearPlaylist = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAYLIST' });
  }, []);

  const currentItem =
    state.currentIndex >= 0 && state.currentIndex < state.items.length
      ? state.items[state.currentIndex]
      : null;

  const value = {
    ...state,
    currentItem,
    addItem,
    addItems,
    removeItem,
    playIndex,
    playNext,
    togglePlay,
    setPlaying,
    moveItem,
    clearPlaylist,
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
