import { useState, useRef, useEffect, useCallback } from 'react';
import { DurationTimer } from '../services/durationTimer';
import { parseVideoDuration } from '../services/durationParser';

const AD_BUFFER_SECONDS = 45;
const FALLBACK_DURATION_SECONDS = 480; // 8 minutes

// Modes: 'iframe' | 'popout-embed' | 'popout-youtube' | 'popup-youtube' | 'popup-blocked'

export function usePlaybackController({ currentItem, onAdvance, popoutManager }) {
  const [mode, setMode] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);
  const timerRef = useRef(null);
  const popupRef = useRef(null);
  const popupPollRef = useRef(null);

  // Clean up timer + popup on unmount
  useEffect(() => {
    return () => {
      timerRef.current?.clear();
      popupPollRef.current && clearInterval(popupPollRef.current);
      popoutManager?.stopPolling();
    };
  }, [popoutManager]);

  // Listen for postMessage from popout player (embeddable mode)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const { type } = event.data || {};
      if (type === 'VIDEO_ENDED') {
        clearCurrentTimer();
        onAdvance();
      } else if (type === 'EMBED_BLOCKED') {
        // Video was thought to be embeddable but IFrame rejected it
        // Switch to YouTube mode
        if (currentItem && mode === 'popout-embed') {
          playAsYouTube(currentItem, true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentItem, mode, onAdvance]);

  function clearCurrentTimer() {
    timerRef.current?.clear();
    setTimerSeconds(null);
  }

  function closeAnyPopup() {
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    popupRef.current = null;
    if (popupPollRef.current) {
      clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
    popoutManager?.stopPolling();
    setPopupClosed(false);
  }

  function startTimer(seconds) {
    clearCurrentTimer();
    timerRef.current = new DurationTimer({
      duration: seconds,
      onComplete: () => onAdvance(),
      onTick: (remaining) => setTimerSeconds(remaining),
    });
    timerRef.current.start();
  }

  function openPopup(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
    const popup = window.open(url, '_blank', 'width=1280,height=720,left=100,top=50');
    if (!popup) {
      setPopupBlocked(true);
      setMode('popup-blocked');
      return;
    }
    popupRef.current = popup;
    setPopupBlocked(false);
    setPopupClosed(false);

    // Poll for manual close
    popupPollRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
        popupRef.current = null;
        setPopupClosed(true);
      }
    }, 1000);
  }

  function playAsYouTube(song, popoutActive) {
    const duration = parseVideoDuration(song.duration);
    const effectiveDuration = duration
      ? duration + AD_BUFFER_SECONDS
      : FALLBACK_DURATION_SECONDS;

    startTimer(effectiveDuration);

    if (popoutActive) {
      setMode('popout-youtube');
      popoutManager.loadVideo({ videoId: song.videoId, embeddable: false });
      popoutManager.startPolling(() => setPopupClosed(true));
    } else {
      setMode('popup-youtube');
      openPopup(song.videoId);
    }
  }

  const playSong = useCallback((song) => {
    if (!song) return;
    clearCurrentTimer();
    closeAnyPopup();
    setTimerDisabled(false);

    const popoutActive = popoutManager?.isOpen();

    if (song.embeddable !== false) {
      if (popoutActive) {
        setMode('popout-embed');
        popoutManager.loadVideo({ videoId: song.videoId, embeddable: true });
        // postMessage flow handles advancement via VIDEO_ENDED
      } else {
        setMode('iframe');
        // Existing IFrame behavior in main app — VideoPlayer handles this
      }
      setPopupBlocked(false);
      setPopupClosed(false);
    } else {
      playAsYouTube(song, popoutActive);
    }
  }, [popoutManager, onAdvance]);

  const skip = useCallback(() => {
    clearCurrentTimer();
    closeAnyPopup();
    onAdvance();
  }, [onAdvance]);

  const [timerDisabled, setTimerDisabled] = useState(false);

  const disableTimer = useCallback(() => {
    clearCurrentTimer();
    setTimerDisabled(true);
  }, []);

  const resumePlaylist = useCallback(() => {
    setTimerDisabled(false);
    onAdvance();
  }, [onAdvance]);

  const reopenPopup = useCallback(() => {
    if (!currentItem) return;
    setPopupClosed(false);
    const popoutActive = popoutManager?.isOpen();
    if (popoutActive) {
      popoutManager.loadVideo({ videoId: currentItem.videoId, embeddable: false });
      popoutManager.startPolling(() => setPopupClosed(true));
    } else {
      openPopup(currentItem.videoId);
    }
  }, [currentItem, popoutManager]);

  const retryPopup = useCallback(() => {
    if (!currentItem) return;
    setPopupBlocked(false);
    openPopup(currentItem.videoId);
    if (!popupRef.current) return; // still blocked
    setMode('popup-youtube');
  }, [currentItem]);

  // Called by VideoPlayer when IFrame embed is blocked at runtime (error 101/150)
  // Switches from iframe mode to YouTube popup/popout mode
  const handleEmbedBlocked = useCallback(() => {
    if (!currentItem) return;
    const popoutActive = popoutManager?.isOpen();
    playAsYouTube(currentItem, popoutActive);
  }, [currentItem, popoutManager, onAdvance]);

  return {
    mode,
    timerSeconds,
    timerDisabled,
    popupBlocked,
    popupClosed,
    playSong,
    skip,
    disableTimer,
    resumePlaylist,
    reopenPopup,
    retryPopup,
    handleEmbedBlocked,
  };
}
