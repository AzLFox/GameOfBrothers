/**
 * GoB shared motion layer (GSAP).
 * Import after gsap.min.js on any page that needs cinematic UI.
 */
const GobMotion = (() => {
  const hasGsap = typeof gsap !== 'undefined';

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reducedQuery.matches;

  reducedQuery.addEventListener?.('change', (e) => {
    reduced = e.matches;
    if (reduced && hasGsap) gsap.globalTimeline.pause();
  });

  const EASE = {
    cinematic: 'power3.out',
    snap: 'power2.inOut',
    soft: 'sine.inOut',
    enter: 'power2.out',
    exit: 'power2.in',
    elastic: 'back.out(1.35)',
    overshoot: 'back.out(2)',
  };

  const DUR = {
    fast: 0.35,
    normal: 0.6,
    slow: 0.9,
    cinematic: 1.4,
  };

  function dur(seconds) {
    return reduced ? 0.01 : seconds;
  }

  function isMobile() {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  function killAll() {
    if (!hasGsap) return;
    gsap.killTweensOf('*');
  }

  /** Set will-change temporarily during animation (performance). */
  function willChangeTemp(targets, props, ms = 900) {
    if (!hasGsap) return () => {};
    const list = gsap.utils.toArray(targets);
    list.forEach((el) => { el.style.willChange = props; });
    const id = window.setTimeout(() => {
      list.forEach((el) => { el.style.willChange = ''; });
    }, ms);
    return () => {
      clearTimeout(id);
      list.forEach((el) => { el.style.willChange = ''; });
    };
  }

  function pageEnter(target = document.body, opts = {}) {
    if (!hasGsap || reduced) return null;
    return from(target, {
      opacity: 0,
      duration: opts.duration ?? DUR.normal,
      ease: EASE.enter,
    });
  }

  function navigateTo(url, { animate } = {}) {
    killAll();
    window.SceneAtmosphere?.destroy?.();

    const go = () => { window.location.href = url; };

    if (!hasGsap || reduced) {
      go();
      return null;
    }

    if (typeof animate === 'function') {
      animate(go);
      return null;
    }

    return pageOut({ onComplete: go });
  }

  function timeline(vars = {}) {
    if (!hasGsap) return null;
    return gsap.timeline({ ...vars, defaults: { ease: EASE.cinematic, ...vars.defaults } });
  }

  function to(targets, vars) {
    if (!hasGsap) return null;
    return gsap.to(targets, { ease: EASE.cinematic, ...vars, duration: dur(vars.duration ?? DUR.normal) });
  }

  function from(targets, vars) {
    if (!hasGsap) return null;
    return gsap.from(targets, { ease: EASE.cinematic, ...vars, duration: dur(vars.duration ?? DUR.normal) });
  }

  function fromTo(targets, fromVars, toVars) {
    if (!hasGsap) return null;
    return gsap.fromTo(targets, fromVars, {
      ease: EASE.cinematic,
      ...toVars,
      duration: dur(toVars.duration ?? DUR.normal),
    });
  }

  function set(targets, vars) {
    if (!hasGsap) return null;
    return gsap.set(targets, vars);
  }

  function killOf(targets) {
    if (!hasGsap) return;
    gsap.killTweensOf(targets);
  }

  function fadeUp(targets, opts = {}) {
    return from(targets, {
      opacity: 0,
      y: opts.y ?? 24,
      duration: opts.duration ?? DUR.normal,
      ease: opts.ease ?? EASE.enter,
      stagger: reduced ? 0 : (opts.stagger ?? 0.08),
      ...opts,
    });
  }

  function staggerIn(targets, opts = {}) {
    return from(targets, {
      opacity: 0,
      scale: opts.scale ?? 0.92,
      duration: opts.duration ?? DUR.slow,
      ease: opts.ease ?? EASE.cinematic,
      stagger: reduced ? 0 : (opts.stagger ?? 0.12),
      ...opts,
    });
  }

  function pulseGlow(target, opts = {}) {
    return to(target, {
      opacity: opts.peak ?? 1,
      duration: opts.duration ?? 1.8,
      ease: EASE.soft,
      yoyo: true,
      repeat: -1,
      ...opts,
    });
  }

  /** Shortest-path rotation delta in degrees */
  function rotationDelta(from, to) {
    let delta = to - from;
    delta = ((delta + 180) % 360 + 360) % 360 - 180;
    return delta;
  }

  /**
   * Animate carousel Y rotation via proxy object.
   * onUpdate receives current rotation in degrees.
   */
  function animateRotation({ from, to, duration, ease, onUpdate, onComplete }) {
    if (!hasGsap) {
      onUpdate?.(to);
      onComplete?.();
      return null;
    }

    const delta = rotationDelta(from, to);
    const end = from + delta;
    const proxy = { r: from };

    return gsap.to(proxy, {
      r: end,
      duration: dur(duration ?? DUR.slow),
      ease: ease ?? EASE.cinematic,
      onUpdate: () => onUpdate?.(proxy.r),
      onComplete: () => {
        onUpdate?.(end);
        onComplete?.();
      },
    });
  }

  /**
   * Card flip with overshoot (front → back content).
   */
  function flipCard(inner, { fromRear = false, onPeak, onComplete } = {}) {
    if (!hasGsap) {
      inner.style.transform = 'rotateY(180deg)';
      onPeak?.();
      onComplete?.();
      return null;
    }

    killOf(inner);
    const from = fromRear ? 180 : 0;
    gsap.set(inner, { rotateY: from });

    return timeline({ onComplete })
      .to(inner, {
        rotateY: 200,
        duration: dur(0.75),
        ease: EASE.cinematic,
        onComplete: onPeak,
      })
      .to(inner, { rotateY: 180, duration: dur(0.35), ease: EASE.snap });
  }

  /** Flip back to card front (close). */
  function flipCardBack(inner, { onComplete } = {}) {
    if (!hasGsap) {
      inner.style.transform = '';
      onComplete?.();
      return null;
    }

    killOf(inner);
    gsap.set(inner, { rotateY: 180 });

    return timeline({ onComplete })
      .to(inner, { rotateY: -14, duration: dur(0.28), ease: EASE.snap })
      .to(inner, { rotateY: 0, duration: dur(0.5), ease: EASE.cinematic });
  }

  /**
   * Main page intro — orchestrates layered reveal.
   * Call once on DOMContentLoaded; pass onCardsReady when carousel cards exist.
   */
  function playMainIntro({ onCardsReady } = {}) {
    if (!hasGsap || reduced) {
      document.body.classList.add('motion-intro-done');
      onCardsReady?.();
      return null;
    }

    document.body.classList.add('motion-js');

    const mobile = isMobile();
    const m = mobile ? 0.62 : 1;
    const at = (t) => t * m;

    const tl = timeline({
      defaults: { ease: EASE.cinematic },
      onComplete: () => document.body.classList.add('motion-intro-done'),
    });

    const mountains = document.querySelectorAll('.mountains');
    const mists = document.querySelectorAll('.mist');
    const veils = document.querySelectorAll('.veil-side');
    const runes = document.querySelectorAll('.rune--veil');
    const header = document.querySelector('.page-header');
    const btnCreate = document.getElementById('btnCreate');
    const scene = document.getElementById('scene');
    const tree = document.getElementById('worldTree');
    const hint = document.getElementById('pageHint');

    gsap.set([mountains, mists, veils, runes, header, btnCreate, scene, tree, hint], { clearProps: 'animation' });

    gsap.set(mountains, { opacity: 0, y: 48 });
    gsap.set(mists, { opacity: 0 });
    gsap.set(veils, { opacity: 1, x: 0 });
    gsap.set(runes, { opacity: 0, scale: 0.6, filter: 'blur(8px)' });
    gsap.set([header, btnCreate, scene, tree, hint], { opacity: 0 });
    gsap.set(header, { y: -20 });
    gsap.set(btnCreate, { y: -12, scale: 0.96 });
    gsap.set(hint, { y: 16 });

    tl.to(mountains, { opacity: 1, y: 0, duration: 1.6 * m, stagger: 0.18 * m }, at(0.15))
      .to(mists, { opacity: 1, duration: 1.2 * m }, at(0.5))
      .to(veils, {
        opacity: 0,
        x: (i) => (i === 0 ? '-22%' : '22%'),
        duration: 1.8 * m,
        stagger: 0.06 * m,
        ease: EASE.snap,
      }, at(0.35))
      .to(runes, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.9 * m,
        stagger: 0.07 * m,
      }, at(0.9))
      .to(scene, { opacity: 1, duration: 0.8 * m }, at(0.55))
      .to(tree, { opacity: 1, duration: 1.2 * m, ease: EASE.enter }, at(0.65))
      .to(header, { opacity: 1, y: 0, duration: 0.85 * m }, at(1.1))
      .to(btnCreate, { opacity: 1, y: 0, scale: 1, duration: 0.75 * m, ease: EASE.elastic }, at(1.25))
      .to(hint, { opacity: 1, y: 0, duration: 0.65 * m }, at(1.5));

    tl.call(() => onCardsReady?.(), null, at(1.35));

    return tl;
  }

  function pageOut({ onComplete } = {}) {
    if (!hasGsap || reduced) {
      onComplete?.();
      return null;
    }
    return to(document.body, {
      opacity: 0,
      duration: DUR.fast,
      ease: EASE.exit,
      onComplete,
    });
  }

  return {
    EASE,
    DUR,
    dur,
    reduced: () => reduced,
    isMobile,
    killAll,
    willChangeTemp,
    timeline,
    to,
    from,
    fromTo,
    set,
    killOf,
    fadeUp,
    staggerIn,
    pulseGlow,
    rotationDelta,
    animateRotation,
    flipCard,
    flipCardBack,
    playMainIntro,
    pageEnter,
    pageOut,
    navigateTo,
  };
})();
