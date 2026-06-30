/**
 * GoB unified sound layer — procedural Web Audio (no external files required).
 */
const GobSound = (() => {
  let ctx = null;
  let unlocked = false;
  let ambientStarted = false;
  let muted = false;
  let ambientMaster = null;
  let chimeTimer = null;
  let boostLevel = 0;

  const VOL = {
    hover: 0.045,
    open: 0.12,
    close: 0.09,
    pageFlip: 0.07,
  };

  const AMBIENT = {
    base: 0.32,
    boost: 0.22,
    wind: 0.038,
    chime: 0.018,
  };

  const THROTTLE = {
    hover: 140,
    open: 0,
    close: 100,
    pageFlip: 120,
    leather: 200,
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

  function ambientVolume() {
    if (muted) return 0;
    return AMBIENT.base + boostLevel * AMBIENT.boost;
  }

  function applyAmbientVolume() {
    if (!ambientMaster || !ctx) return;
    ambientMaster.gain.setTargetAtTime(ambientVolume(), ctx.currentTime, 0.35);
  }

  function createWindLoop() {
    const c = getCtx();
    if (!c || !ambientMaster) return;

    const seconds = 4;
    const buffer = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[i] = last;
    }

    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 0.45;

    const gain = c.createGain();
    gain.gain.value = AMBIENT.wind;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ambientMaster);
    src.start();
  }

  function scheduleChime() {
    if (!unlocked || muted) return;

    const freqs = [392, 523, 659, 784, 988];
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    const vol = AMBIENT.chime * (1 + boostLevel * 0.6);
    tone(f, { duration: 1.4, volume: vol, type: 'sine' });
    tone(f * 1.5, { duration: 0.9, volume: vol * 0.35, type: 'triangle', when: 0.08 });

    chimeTimer = window.setTimeout(scheduleChime, 5000 + Math.random() * 7000);
  }

  function startAmbient() {
    if (ambientStarted) return;
    const c = getCtx();
    if (!c) return;

    ambientStarted = true;
    ambientMaster = c.createGain();
    ambientMaster.gain.value = ambientVolume();
    ambientMaster.connect(c.destination);

    createWindLoop();
    chimeTimer = window.setTimeout(scheduleChime, 2400);
  }

  function setAmbientBoost(level) {
    boostLevel = Math.max(0, Math.min(1, level));
    applyAmbientVolume();
  }

  function toggleMute() {
    muted = !muted;
    if (muted && chimeTimer) {
      clearTimeout(chimeTimer);
      chimeTimer = null;
    }
    applyAmbientVolume();
    if (!muted && unlocked && ambientStarted) {
      chimeTimer = window.setTimeout(scheduleChime, 1800);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function isMobile() {
    return window.GobMobile?.isMobile?.() ?? false;
  }

  function unlock({ startAmbient: wantAmbient } = {}) {
    const c = getCtx();
    if (!c) return;
    if (unlocked) {
      if (wantAmbient && !ambientStarted) startAmbient();
      return;
    }
    unlocked = true;
    if (c.state === 'suspended') c.resume();
    const g = c.createGain();
    g.gain.value = 0.0001;
    const o = c.createOscillator();
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.01);
    const shouldStart = wantAmbient ?? !isMobile();
    if (shouldStart) startAmbient();
  }

  function isUnlocked() {
    return unlocked;
  }

  function isAmbientStarted() {
    return ambientStarted;
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
    setAmbientBoost(1);
    tone(392, { duration: 0.1, volume: VOL.open * 0.5, type: 'sine' });
    tone(784, { duration: 0.14, volume: VOL.open, type: 'triangle', when: 0.04 });
    tone(988, { duration: 0.18, volume: VOL.open * 0.7, type: 'sine', when: 0.08 });
  }

  function playClose() {
    if (!unlocked || !canPlay('close')) return;
    setAmbientBoost(0);
    tone(740, { duration: 0.1, volume: VOL.close, type: 'triangle' });
    tone(523, { duration: 0.14, volume: VOL.close * 0.75, type: 'sine', when: 0.05 });
  }

  function playPageFlip() {
    if (!unlocked || !canPlay('pageFlip')) return;
    noiseBurst({ duration: 0.09, volume: VOL.pageFlip });
    tone(330, { duration: 0.06, volume: VOL.pageFlip * 0.5, type: 'sine' });
  }

  function playLeather() {
    if (!unlocked || !canPlay('leather')) return;
    noiseBurst({ duration: 0.16, volume: 0.032 });
    tone(110, { duration: 0.28, volume: 0.055, type: 'sawtooth' });
    tone(72, { duration: 0.38, volume: 0.04, type: 'triangle', when: 0.06 });
  }

  function playPageTransition(kind) {
    if (!unlocked) return;
    setAmbientBoost(kind === 'out' ? 0.85 : 0.55);
    window.setTimeout(() => setAmbientBoost(0), kind === 'out' ? 900 : 1400);

    if (kind === 'out') {
      tone(196, { duration: 0.22, volume: 0.06, type: 'sine' });
      tone(294, { duration: 0.18, volume: 0.04, type: 'triangle', when: 0.08 });
      noiseBurst({ duration: 0.14, volume: 0.025 });
    } else {
      tone(392, { duration: 0.12, volume: 0.05, type: 'sine' });
      tone(587, { duration: 0.2, volume: 0.07, type: 'triangle', when: 0.1 });
      tone(880, { duration: 0.16, volume: 0.035, type: 'sine', when: 0.18 });
    }
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
    isUnlocked,
    isAmbientStarted,
    startAmbient,
    setAmbientBoost,
    toggleMute,
    isMuted,
    playHover,
    playOpen,
    playClose,
    playPageFlip,
    playLeather,
    playPageTransition,
  };
})();
