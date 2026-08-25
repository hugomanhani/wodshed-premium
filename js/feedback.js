// WODshed feedback — tone + haptic cues so the clock can be trusted without
// staring at the screen, plus a shared 3-2-1 lead-in used before any timer starts.

const Feedback = {
  _ctx: null,
  _ctx_() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this._ctx = new AC();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },
  tone(freq, durMs, gain = 0.18) {
    if (!Store.state.soundOn) return;
    const ctx = this._ctx_();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.start(now);
    osc.stop(now + durMs / 1000 + 0.02);
  },
  vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
  tick() { this.tone(720, 90, 0.1); this.vibrate(15); },
  go() { this.tone(1046, 220, 0.22); this.vibrate([0, 40, 60, 80]); },
  roundChange() { this.tone(880, 140, 0.2); this.vibrate(30); },
  complete() { this.tone(660, 140, 0.22); setTimeout(() => this.tone(990, 260, 0.22), 150); this.vibrate([0, 40, 40, 40, 40, 80]); },
  warn() { this.tone(523, 110, 0.18); this.vibrate(20); },
};

// Runs a 3-2-1-GO overlay via the supplied render callback, then calls onDone.
// render(secondsLeft) is for in-progress frames only — onDone is solely responsible
// for clearing the lead-in state so it lands in the same render as starting the timer,
// rather than as a separate render the transition system could apply out of order.
function runLeadIn(renderFn, onDone) {
  let n = 3;
  renderFn(n);
  Feedback.tick();
  const iv = setInterval(() => {
    n -= 1;
    if (n > 0) { renderFn(n); Feedback.tick(); }
    else {
      clearInterval(iv);
      renderFn(0);
      Feedback.go();
      setTimeout(onDone, 350);
    }
  }, 700);
  return iv;
}
