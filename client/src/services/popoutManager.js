const PLAYER_PATH = '/player';

export class PopoutManager {
  constructor() {
    this.win = null;
    this.pollInterval = null;
  }

  isOpen() {
    return this.win && !this.win.closed;
  }

  open() {
    if (this.isOpen()) return this.win;
    this.win = window.open(
      '/player-loading',
      'cdkPlayer',
      'width=1280,height=720'
    );
    return this.win;
  }

  loadVideo({ videoId, embeddable }) {
    if (!this.isOpen()) return false;

    if (embeddable) {
      // Navigate to our player — IFrame will initialize from URL params
      this.win.location.href = `${PLAYER_PATH}?v=${videoId}&autoplay=1`;
    } else {
      // Navigate to YouTube directly
      this.win.location.href = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
    }
    return true;
  }

  close() {
    if (this.isOpen()) this.win.close();
    this.win = null;
    this.stopPolling();
  }

  startPolling(onClosed) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.win?.closed) {
        this.stopPolling();
        this.win = null;
        onClosed();
      }
    }, 1000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  sendMessage(msg) {
    // Only works when popout is on same origin (embeddable mode)
    if (this.isOpen()) {
      try { this.win.postMessage(msg, window.location.origin); }
      catch (e) { /* cross-origin — expected during YouTube mode */ }
    }
  }
}
