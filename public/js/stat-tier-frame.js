/**
 * Steam profile frame overlays — WebM per tier (import via npm run import:steam-frame).
 * Tiers without imported assets show no overlay (border CSS only).
 */
const StatTierFrame = (() => {
  /** Only tiers with imported Steam assets */
  const FRAMES = {
    1: {
      webm: '/img/ui/stat-frame-t1.webm',
      poster: '/img/ui/stat-frame-t1-poster.png',
    },
    2: {
      webm: '/img/ui/stat-frame-t2.webm',
      poster: '/img/ui/stat-frame-t2-poster.png',
    },
    3: {
      webm: '/img/ui/stat-frame-t3.webm',
      poster: '/img/ui/stat-frame-t3-poster.png',
    },
    4: {
      webm: '/img/ui/stat-frame-t4.webm',
      poster: '/img/ui/stat-frame-t4-poster.png',
    },
  };

  const cells = new WeakMap();
  const videos = new Set();
  let useStatic = false;
  let lowTier = false;
  let webmOk = null;

  function checkPrefs() {
    try {
      useStatic = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      useStatic = false;
    }
    lowTier = document.documentElement.classList.contains('gob-tier-low');
  }

  function canWebm() {
    if (webmOk !== null) return webmOk;
    const v = document.createElement('video');
    const r = v.canPlayType('video/webm; codecs="vp9"');
    webmOk = r === 'probably' || r === 'maybe';
    return webmOk;
  }

  checkPrefs();

  try {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      checkPrefs();
      document.querySelectorAll('.stat-cell').forEach((cell) => {
        const tier = cells.get(cell);
        if (tier) attach(cell, tier);
      });
    });
  } catch { /* ignore */ }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((v) => { if (!v.paused) v.pause(); });
    else if (!useStatic && !lowTier) videos.forEach((v) => { if (v.isConnected) v.play().catch(() => {}); });
  });

  function clearWrap(wrap) {
    videos.forEach((v) => {
      if (wrap.contains(v)) {
        videos.delete(v);
        v.pause();
      }
    });
    wrap.innerHTML = '';
  }

  function slotFor(cell) {
    return cell.closest('.stat-slot') || cell;
  }

  function attach(cell, tier) {
    checkPrefs();

    if (!tier || tier <= 0 || !FRAMES[tier]) {
      detach(cell);
      return;
    }

    const assets = FRAMES[tier];
    const slot = slotFor(cell);
    const prevTier = cells.get(cell);
    cells.set(cell, tier);

    let wrap = slot.querySelector('.stat-tier-frame');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'stat-tier-frame';
      wrap.setAttribute('aria-hidden', 'true');
      slot.appendChild(wrap);
    }

    wrap.className = `stat-tier-frame stat-tier-frame--tier-${tier}`;
    cell.classList.add('stat-cell--has-frame');

    const wantVideo = !useStatic && !lowTier && canWebm();
    const mode = wantVideo ? 'video' : 'poster';
    const current = wrap.dataset.mode;

    if (prevTier !== tier || current !== mode) {
      clearWrap(wrap);
      wrap.dataset.mode = mode;

      if (mode === 'video') {
        const video = document.createElement('video');
        video.className = 'stat-tier-frame__overlay';
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.preload = 'auto';
        video.poster = assets.poster;
        const source = document.createElement('source');
        source.src = assets.webm;
        source.type = 'video/webm';
        video.appendChild(source);
        wrap.appendChild(video);
        videos.add(video);
        video.play().catch(() => {});
      } else {
        const img = document.createElement('img');
        img.className = 'stat-tier-frame__overlay';
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.src = assets.poster;
        wrap.appendChild(img);
      }
    }

    refreshDimmed(cell);
  }

  function detach(cell) {
    const slot = slotFor(cell);
    const wrap = slot.querySelector('.stat-tier-frame');
    if (wrap) clearWrap(wrap);
    cells.delete(cell);
    wrap?.remove();
    cell.classList.remove('stat-cell--has-frame');
  }

  function refreshDimmed(cell) {
    const wrap = slotFor(cell).querySelector('.stat-tier-frame');
    if (wrap) wrap.classList.toggle('is-dimmed', cell.classList.contains('is-rune-lit'));
  }

  return { attach, detach, refreshDimmed, FRAMES };
})();

Object.assign(window, { StatTierFrame });
