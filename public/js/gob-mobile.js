/**
 * GoB mobile context — single source of truth for breakpoint, tier, and motion prefs.
 */
const GobMobile = (() => {
  const BREAKPOINT = 640;

  const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
  const coarseQuery = window.matchMedia('(pointer: coarse)');
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function isMobile() {
    return mobileQuery.matches;
  }

  function isCoarsePointer() {
    return coarseQuery.matches;
  }

  function isReducedMotion() {
    return reducedQuery.matches;
  }

  function getDeviceTier() {
    if (!isMobile()) return 'high';

    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory;
    const w = window.innerWidth;

    if (cores <= 4 && (mem !== undefined ? mem <= 2 : w <= 375)) return 'low';
    if (cores <= 6 && (mem !== undefined ? mem <= 4 : true)) return 'mid';
    return 'high';
  }

  function applyHtmlClasses() {
    const root = document.documentElement;
    const tier = getDeviceTier();

    root.classList.toggle('gob-mobile', isMobile());
    root.classList.toggle('gob-coarse-pointer', isCoarsePointer());
    root.classList.toggle('gob-reduced-motion', isReducedMotion());
    root.classList.remove('gob-tier-low', 'gob-tier-mid', 'gob-tier-high');
    root.classList.add(`gob-tier-${tier}`);
  }

  function onContextChange() {
    applyHtmlClasses();
    window.dispatchEvent(new CustomEvent('gobmobilechange'));
  }

  mobileQuery.addEventListener('change', onContextChange);
  coarseQuery.addEventListener('change', onContextChange);
  reducedQuery.addEventListener('change', onContextChange);
  window.addEventListener('resize', onContextChange);
  window.addEventListener('orientationchange', onContextChange);

  applyHtmlClasses();

  return {
    BREAKPOINT,
    isMobile,
    isCoarsePointer,
    isReducedMotion,
    getDeviceTier,
    applyHtmlClasses,
  };
})();

window.GobMobile = GobMobile;
