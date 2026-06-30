/**
 * StPageFlip wrapper — realistic soft page curl for the spellbook.
 */
import { PageFlip } from '/vendor/page-flip/page-flip.module.js';

let pageFlip = null;

function flipSettings() {
  const portrait = window.matchMedia('(max-width: 640px)').matches;
  return {
    width: portrait ? 320 : 420,
    height: portrait ? 500 : 500,
    size: 'stretch',
    minWidth: portrait ? 260 : 260,
    maxWidth: portrait ? 380 : 480,
    minHeight: portrait ? 400 : 360,
    maxHeight: portrait ? 580 : 560,
    drawShadow: true,
    flippingTime: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 920,
    usePortrait: portrait,
    autoSize: true,
    maxShadowOpacity: 0.62,
    showCover: false,
    mobileScrollSupport: true,
    useMouseEvents: true,
    disableFlipByClick: true,
    clickEventForward: true,
    showPageCorners: true,
    swipeDistance: 28,
  };
}

/** PageFlip.destroy() removes its root element — keep a stable outer mount. */
export function ensureFlipRoot() {
  const mount = document.getElementById('spellbook-mount');
  if (!mount) return null;

  let root = document.getElementById('spellbook-flip-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'spellbook-flip-root';
    root.className = 'spellbook-flip-root';
    mount.appendChild(root);
  }
  return root;
}

export function createSpellbookFlip({ onFlip, onFlipping } = {}) {
  destroySpellbookFlip();

  const root = ensureFlipRoot();
  if (!root) return null;

  const mount = document.getElementById('spellbook-mount');
  const settings = flipSettings();
  if (mount) {
    mount.classList.toggle('spellbook-mount--portrait', settings.usePortrait);
  }

  pageFlip = new PageFlip(root, settings);

  pageFlip.on('flip', (e) => {
    onFlip?.(e.data);
  });

  pageFlip.on('changeState', (e) => {
    const flipping = e.data === 'flipping';
    onFlipping?.(flipping);
    if (flipping && typeof GobSound !== 'undefined') {
      GobSound.playPageFlip();
    }
  });

  return pageFlip;
}

function refreshLayout() {
  if (!pageFlip) return;
  pageFlip.getUI()?.update?.();
}

export function loadSpellbookPages(pageElements, startPage = 0) {
  if (!pageFlip || !pageElements.length) return;

  pageFlip.loadFromHTML(pageElements);
  pageFlip.turnToPage(Math.min(startPage, pageElements.length - 1));

  requestAnimationFrame(() => {
    refreshLayout();
    requestAnimationFrame(refreshLayout);
  });
}

export function updateSpellbookPages(pageElements, startPage = 0) {
  if (!pageElements.length) return;

  if (!pageFlip) {
    loadSpellbookPages(pageElements, startPage);
    return;
  }

  pageFlip.updateFromHtml(pageElements);
  pageFlip.turnToPage(Math.min(startPage, pageElements.length - 1));
  requestAnimationFrame(refreshLayout);
}

export function destroySpellbookFlip() {
  if (pageFlip) {
    pageFlip.destroy();
    pageFlip = null;
  }
  document.getElementById('spellbook-mount')?.classList.remove('spellbook-mount--portrait');
  ensureFlipRoot();
}

export function flipNext() {
  pageFlip?.flipNext('top');
}

export function flipPrev() {
  pageFlip?.flipPrev('top');
}

export function getPageFlip() {
  return pageFlip;
}

export function isFlipping() {
  return pageFlip?.getState() === 'flipping';
}
