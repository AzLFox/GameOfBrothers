/**
 * StPageFlip wrapper — realistic soft page curl for the spellbook.
 */
import { PageFlip } from '/vendor/page-flip/page-flip.module.js';

let pageFlip = null;

function mountBox() {
  const mount = document.getElementById('spellbook-mount');
  return mount?.closest('.spellbook-well') || mount;
}

function flipSettings() {
  const portrait = window.GobMobile.isMobile();
  const box = mountBox();
  const rect = box?.getBoundingClientRect();
  const padW = portrait ? 16 : 24;
  const padH = portrait ? 12 : 20;
  const availW = rect?.width ? Math.max(240, Math.floor(rect.width - padW)) : (portrait ? 320 : 420);
  const availH = rect?.height ? Math.max(320, Math.floor(rect.height - padH)) : (portrait ? 460 : 500);

  return {
    width: portrait ? availW : 420,
    height: portrait ? availH : 500,
    size: 'stretch',
    minWidth: portrait ? Math.min(240, availW) : 260,
    maxWidth: portrait ? availW : 480,
    minHeight: portrait ? Math.min(320, availH) : 360,
    maxHeight: portrait ? availH : 560,
    drawShadow: !portrait,
    flippingTime: window.GobMobile.isReducedMotion() ? 1 : (portrait ? 780 : 920),
    usePortrait: portrait,
    autoSize: true,
    maxShadowOpacity: portrait ? 0.45 : 0.62,
    showCover: false,
    mobileScrollSupport: true,
    useMouseEvents: true,
    disableFlipByClick: true,
    clickEventForward: true,
    showPageCorners: !portrait,
    swipeDistance: portrait ? 24 : 28,
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

/** Пересоздать flip после resize/orientation — сохраняет текущую страницу. */
export function recreateSpellbookFlip({ onFlip, onFlipping } = {}) {
  const current = pageFlip?.getCurrentPageIndex?.() ?? 0;
  createSpellbookFlip({ onFlip, onFlipping });
  const pages = document.querySelectorAll('.spellbook-pf-page');
  if (pages.length) {
    loadSpellbookPages([...pages], current);
  } else {
    refreshLayout();
  }
  return pageFlip;
}
