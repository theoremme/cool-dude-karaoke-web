import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

// YouTube IFrame API loader (singleton)
let ytApiPromise = null;

function loadYTApi() {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => reject(new Error('YouTube API load timeout')), 10000);

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (prevCallback) prevCallback();
      resolve();
    };

    // Script may already be in DOM (preloaded in index.html)
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load YouTube API')); };
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

const YouTubeEmbed = forwardRef(({ videoId, controls = true, onEnded, onPlay, onPause, onEmbedBlocked, onError, onReady }, ref) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerReady = useRef(false);
  const callbacksRef = useRef({});

  // Keep callbacks ref updated without triggering effects
  callbacksRef.current = { onEnded, onPlay, onPause, onEmbedBlocked, onError, onReady };

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
    seekTo: (t) => playerRef.current?.seekTo?.(t, true),
  }));

  // Create player or load new video
  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;

    const init = async () => {
      try {
        await loadYTApi();
      } catch {
        if (!cancelled) callbacksRef.current.onEmbedBlocked?.();
        return;
      }
      if (cancelled) return;

      // Player already exists — just load new video
      if (playerRef.current && playerReady.current) {
        playerRef.current.loadVideoById(videoId);
        // Player is already initialized, signal ready immediately
        callbacksRef.current.onReady?.();
        return;
      }

      // Create fresh player
      if (containerRef.current) containerRef.current.innerHTML = '';
      const el = document.createElement('div');
      containerRef.current.appendChild(el);

      playerRef.current = new window.YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: controls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            playerReady.current = true;
            callbacksRef.current.onReady?.();
          },
          onStateChange: (e) => {
            const { PLAYING, PAUSED, ENDED } = window.YT.PlayerState;
            if (e.data === PLAYING) callbacksRef.current.onPlay?.();
            else if (e.data === PAUSED) callbacksRef.current.onPause?.();
            else if (e.data === ENDED) callbacksRef.current.onEnded?.();
          },
          onError: (e) => {
            if (e.data === 101 || e.data === 150) {
              callbacksRef.current.onEmbedBlocked?.();
            } else {
              callbacksRef.current.onError?.(e);
            }
          },
        },
      });
    };

    init();

    return () => { cancelled = true; };
  }, [videoId, controls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerReady.current = false;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="youtube-embed-container" />;
});

YouTubeEmbed.displayName = 'YouTubeEmbed';

export default YouTubeEmbed;
