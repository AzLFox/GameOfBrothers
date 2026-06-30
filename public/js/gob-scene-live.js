/**

 * Phase 9 — living main scene: parallax, hints, tree breath, spotlight tracking.

 * Mobile parallax budgets via GobMobile.getDeviceTier(): mid≤4px, high≤6px, low=off.

 */

const GobSceneLive = (() => {

  const PARALLAX_DESKTOP = 8;



  const HINTS_DESKTOP = [

    'Крути колесом мыши · нажми на карточку',

    'Имена шепчутся из глубины мира',

    'Дерево помнит каждого героя',

    'Выбери того, кто отзовётся',

    'Туман расступится для избранного',

  ];



  const HINTS_MOBILE = [

    'Свайпай · нажми на карточку',

    'Имена шепчутся из глубины мира',

    'Дерево помнит каждого героя',

    'Выбери того, кто отзовётся',

    'Туман расступится для избранного',

  ];



  function getHints() {

    return GobMobile.isMobile() ? HINTS_MOBILE : HINTS_DESKTOP;

  }



  function getParallaxMax() {

    if (GobMotion.reduced()) return 0;

    if (!GobMobile.isMobile()) return PARALLAX_DESKTOP;

    const tier = GobMobile.getDeviceTier();

    if (tier === 'mid') return 4;

    if (tier === 'high') return 6;

    return 0;

  }



  function applyHintCopy() {

    const hint = document.getElementById('pageHint');

    if (!hint) return;

    hint.textContent = getHints()[hintIndex % getHints().length];

  }



  let parallaxRAF = null;

  let parallaxActive = false;

  let hintTimer = null;

  let hintIndex = 0;

  let paraX = 0;

  let paraY = 0;

  let targetX = 0;

  let targetY = 0;

  let visibilityHandler = null;

  let pointerMoveHandler = null;

  let mobileChangeHandler = null;

  let resizeHandler = null;



  function parallaxTick() {

    if (!parallaxActive) return;



    paraX += (targetX - paraX) * 0.08;

    paraY += (targetY - paraY) * 0.08;



    const depth = document.querySelector('.realm-depth');

    if (depth) {

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

    }



    window.SceneAtmosphere?.setParallax?.(paraX, paraY);

    parallaxRAF = requestAnimationFrame(parallaxTick);

  }



  function startParallax() {

    if (parallaxActive || GobMotion.reduced() || !getParallaxMax()) return;

    parallaxActive = true;

    parallaxRAF = requestAnimationFrame(parallaxTick);

  }



  function pauseParallax() {

    parallaxActive = false;

    if (parallaxRAF) {

      cancelAnimationFrame(parallaxRAF);

      parallaxRAF = null;

    }

    window.SceneAtmosphere?.pause?.();

  }



  function resumeParallax() {

    window.SceneAtmosphere?.resume?.();

    if (!document.hidden) startParallax();

  }



  function initParallax() {

    if (GobMotion.reduced()) return;

    const depth = document.querySelector('.realm-depth');

    if (!depth) return;



    pointerMoveHandler = (e) => {

      const max = getParallaxMax();

      if (!max) return;

      const nx = (e.clientX / window.innerWidth - 0.5) * 2;

      const ny = (e.clientY / window.innerHeight - 0.5) * 2;

      targetX = nx * max;

      targetY = ny * max * 0.45;

    };

    document.addEventListener('pointermove', pointerMoveHandler, { passive: true });



    visibilityHandler = () => {

      if (document.hidden) pauseParallax();

      else resumeParallax();

    };

    document.addEventListener('visibilitychange', visibilityHandler);



    startParallax();

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



    hintIndex = (hintIndex + 1) % getHints().length;



    GobMotion.timeline({

      onComplete: () => {

        hintTimer = setTimeout(cycleHint, 9000);

      },

    })

      .to(hint, { opacity: 0, y: 10, duration: 0.6, ease: 'power2.in' })

      .call(() => { hint.textContent = getHints()[hintIndex]; })

      .fromTo(hint, { y: -8, opacity: 0 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' });

  }



  function initAmbientToggle() {

    const btn = document.getElementById('ambientToggle');

    if (!btn || typeof GobSound === 'undefined') return;



    btn.addEventListener('click', () => {
      if (!GobSound.isAmbientStarted()) {
        GobSound.unlock({ startAmbient: true });
        return;
      }

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

    applyHintCopy();

    mobileChangeHandler = () => {

      applyHintCopy();

      if (document.hidden) return;

      if (getParallaxMax()) resumeParallax();

      else pauseParallax();

    };

    window.addEventListener('gobmobilechange', mobileChangeHandler);

    initParallax();

    scheduleHintCycle();

    initAmbientToggle();



    resizeHandler = () => {

      const card = document.querySelector('.card.selected');

      if (card) positionSpotlight(card);

    };

    window.addEventListener('resize', resizeHandler);

  }



  function destroy() {

    pauseParallax();

    if (pointerMoveHandler) {

      document.removeEventListener('pointermove', pointerMoveHandler);

      pointerMoveHandler = null;

    }

    if (visibilityHandler) {

      document.removeEventListener('visibilitychange', visibilityHandler);

      visibilityHandler = null;

    }

    if (mobileChangeHandler) {

      window.removeEventListener('gobmobilechange', mobileChangeHandler);

      mobileChangeHandler = null;

    }

    if (resizeHandler) {

      window.removeEventListener('resize', resizeHandler);

      resizeHandler = null;

    }

    if (hintTimer) clearTimeout(hintTimer);

    hintTimer = null;

  }



  return { init, destroy, positionSpotlight, pause: pauseParallax, resume: resumeParallax };

})();

window.GobSceneLive = GobSceneLive;

