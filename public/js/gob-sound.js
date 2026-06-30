/**
 * GoB unified sound layer — procedural Web Audio (no external files required).
 */
const GobSound = (() => {
  let ctx = null;
  let unlocked = false;

  const VOL = {
    hover: 0.045,
    open: 0.12,
    close: 0.09,
    pageFlip: 0.07,
  };

  const THROTTLE = {
    hover: 140,
    open: 0,
    close: 100,
    pageFlip: 120,
  };

  const lastAt = {};

  function getCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    return ctx;
  }

  function unlock() {
    const c = getCtx();
    if (!c || unlocked) return;
    unlocked = true;
    if (c.state === 'suspended') c.resume();
    const g = c.createGain();
    g.gain.value = 0.0001;
    const o = c.createOscillator();
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.01);
  }

  function canPlay(key) {
    const now = performance.now();
    const wait = THROTTLE[key] ?? 0;
    if (now - (lastAt[key] ?? 0) < wait) return false;
    lastAt[key] = now;
    return true;
  }

  function tone(freq, { duration = 0.08, type = 'sine', volume = 0.08, when = 0 } = {}) {
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst({ duration = 0.12, volume = 0.04 } = {}) {
    const c = getCtx();
    if (!c) return;
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  function playHover() {
    if (!unlocked || !canPlay('hover')) return;
    tone(1046, { duration: 0.05, volume: VOL.hover, type: 'triangle' });
    tone(1318, { duration: 0.04, volume: VOL.hover * 0.6, type: 'sine', when: 0.012 });
  }

  function playOpen() {
    if (!unlocked || !canPlay('open')) return;
    tone(392, { duration: 0.1, volume: VOL.open * 0.5, type: 'sine' });
    tone(784, { duration: 0.14, volume: VOL.open, type: 'triangle', when: 0.04 });
    tone(988, { duration: 0.18, volume: VOL.open * 0.7, type: 'sine', when: 0.08 });
  }

  function playClose() {
    if (!unlocked || !canPlay('close')) return;
    tone(740, { duration: 0.1, volume: VOL.close, type: 'triangle' });
    tone(523, { duration: 0.14, volume: VOL.close * 0.75, type: 'sine', when: 0.05 });
  }

  function playPageFlip() {
    if (!unlocked || !canPlay('pageFlip')) return;
    noiseBurst({ duration: 0.09, volume: VOL.pageFlip });
    tone(330, { duration: 0.06, volume: VOL.pageFlip * 0.5, type: 'sine' });
  }

  function bindUnlock() {
    const once = () => {
      unlock();
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
    window.addEventListener('pointerdown', once, { passive: true });
    window.addEventListener('keydown', once, { passive: true });
  }

  if (typeof window !== 'undefined') bindUnlock();

  return {
    unlock,
    playHover,
    playOpen,
    playClose,
    playPageFlip,
  };
})();
