/**
 * Desktop cursor glow on main-page interactives (phase 11).
 */
const GobCursorGlow = (() => {
  const INTERACTIVE =
    '.btn-create, .card:not(.card--skeleton):not(.card--placeholder), .ambient-toggle, .page-header a';

  function canRun() {
    if (window.GobMobile.isMobile()) return false;
    if (!document.body.classList.contains('main-page')) return false;
    if (window.GobMobile.isReducedMotion()) return false;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
    return true;
  }

  function init() {
    if (!canRun()) return;

    const glow = document.createElement('div');
    glow.className = 'gob-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    let overInteractive = 0;

    const move = (e) => {
      glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };

    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mousedown', () => glow.classList.add('is-pressed'), { passive: true });
    document.addEventListener('mouseup', () => glow.classList.remove('is-pressed'), { passive: true });

    const enter = () => {
      overInteractive += 1;
      glow.classList.add('is-active');
    };

    const leave = () => {
      overInteractive = Math.max(0, overInteractive - 1);
      if (!overInteractive) glow.classList.remove('is-active');
    };

    document.querySelectorAll(INTERACTIVE).forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    const carousel = document.getElementById('carousel');
    if (carousel) {
      const observer = new MutationObserver(() => {
        carousel.querySelectorAll('.card:not(.card--skeleton):not(.card--placeholder)').forEach((card) => {
          if (card.dataset.glowBound) return;
          card.dataset.glowBound = '1';
          card.addEventListener('mouseenter', enter);
          card.addEventListener('mouseleave', leave);
        });
      });
      observer.observe(carousel, { childList: true, subtree: true });
    }
  }

  return { init };
})();
