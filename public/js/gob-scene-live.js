/**
 * Phase 9 — living main scene: parallax, hints, tree breath, spotlight tracking.
 */
const GobSceneLive = (() => {
  const PARALLAX_MAX = 8;

  const HINTS = [
    'Крути колесом мыши · нажми на карточку',
    'Имена шепчутся из глубины мира',
    'Дерево помнит каждого героя',
    'Выбери того, кто отзовётся',
    'Туман расступится для избранного',
  ];

  let parallaxRAF = null;
  let hintTimer = null;
  let hintIndex = 0;
  let paraX = 0;
  let paraY = 0;
  let targetX = 0;
  let targetY = 0;

  function initParallax() {
    if (GobMotion.reduced()) return;
    const depth = document.querySelector('.realm-depth');
    if (!depth) return;

    document.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx * PARALLAX_MAX;
      targetY = ny * PARALLAX_MAX * 0.45;
    }, { passive: true });

    const tick = () => {
      paraX += (targetX - paraX) * 0.08;
      paraY += (targetY - paraY) * 0.08;
      depth.style.setProperty('--para-x', `${paraX.toFixed(2)}px`);
      depth.style.setProperty('--para-y', `${paraY.toFixed(2)}px`);

      const layers = [
        { sel: '.mountains-back', mx: 0.28, my: 0.18 },
        { sel: '.mountains-mid', mx: 0.45, my: 0.28 },
        { sel: '.mountains-front', mx: 0.62, my: 0.38 },
        { sel: '.mist-left', mx: 0.85, my: 1 },
        { sel: '.mist-right', mx: -0.85, my: 1, flip: true },
      ];

      layers.forEach(({ sel, mx, my, flip }) => {
        const el = depth.querySelector(sel);
        if (!el) return;
        const x = paraX * mx;
        const y = paraY * my;
        el.style.transform = flip
          ? `scaleX(-1) translate(${x}px, ${y}px)`
          : `translate(${x}px, ${y}px)`;
      });

      window.SceneAtmosphere?.setParallax?.(paraX, paraY);
      parallaxRAF = requestAnimationFrame(tick);
    };
    parallaxRAF = requestAnimationFrame(tick);
  }

  function scheduleHintCycle() {
    const hint = document.getElementById('pageHint');
    if (!hint || GobMotion.reduced() || typeof gsap === 'undefined') return;

    hintTimer = setTimeout(cycleHint, 9000);
  }

  function cycleHint() {
    const hint = document.getElementById('pageHint');
    if (!hint) return;

    if (document.body.classList.contains('card-open')) {
      hintTimer = setTimeout(cycleHint, 3000);
      return;
    }

    hintIndex = (hintIndex + 1) % HINTS.length;

    GobMotion.timeline({
      onComplete: () => {
        hintTimer = setTimeout(cycleHint, 9000);
      },
    })
      .to(hint, { opacity: 0, y: 10, duration: 0.6, ease: 'power2.in' })
      .call(() => { hint.textContent = HINTS[hintIndex]; })
      .fromTo(hint, { y: -8, opacity: 0 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' });
  }

  function initAmbientToggle() {
    const btn = document.getElementById('ambientToggle');
    if (!btn || typeof GobSound === 'undefined') return;

    btn.addEventListener('click', () => {
      const muted = GobSound.toggleMute();
      btn.classList.toggle('is-muted', muted);
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    });
  }

  function positionSpotlight(card) {
    const spot = document.getElementById('cardSpotlight');
    if (!spot || !card) return;

    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.46;
    const spreadX = Math.max(rect.width * 1.1, 180);
    const spreadY = Math.max(rect.height * 1.35, 240);

    spot.style.setProperty('--spot-x', `${cx}px`);
    spot.style.setProperty('--spot-y', `${cy}px`);
    spot.style.setProperty('--spot-rx', `${spreadX}px`);
    spot.style.setProperty('--spot-ry', `${spreadY}px`);
  }

  function init() {
    initParallax();
    scheduleHintCycle();
    initAmbientToggle();

    window.addEventListener('resize', () => {
      const card = document.querySelector('.card.selected');
      if (card) positionSpotlight(card);
    });
  }

  function destroy() {
    if (parallaxRAF) cancelAnimationFrame(parallaxRAF);
    if (hintTimer) clearTimeout(hintTimer);
    parallaxRAF = null;
    hintTimer = null;
  }

  return { init, destroy, positionSpotlight };
})();
