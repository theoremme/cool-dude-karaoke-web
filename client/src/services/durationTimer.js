// Core idea: use Date.now() deltas, not setTimeout, so background tab
// throttling can't cause drift

export class DurationTimer {
  constructor({ duration, onComplete, onTick }) {
    this.duration = duration;       // seconds (parsed from ISO 8601)
    this.onComplete = onComplete;   // called when time is up
    this.onTick = onTick;           // called every second with secondsRemaining
    this.startTime = null;
    this.interval = null;
    this.completed = false;
  }

  start() {
    this.startTime = Date.now();
    this.completed = false;
    this.interval = setInterval(() => this._tick(), 1000);
  }

  _tick() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = Math.max(0, this.duration - elapsed);
    this.onTick?.(Math.ceil(remaining));
    if (remaining <= 0 && !this.completed) {
      this.completed = true;
      this.clear();
      this.onComplete();
    }
  }

  reset() {
    // Called if host taps "Reset Timer" (ad buffer correction)
    this.startTime = Date.now();
    this.completed = false;
  }

  clear() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
