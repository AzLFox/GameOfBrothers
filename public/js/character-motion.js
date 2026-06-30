/**
 * Character sheet motion layer (uses GobMotion + GSAP).
 */
const CharMotion = (() => {
  const hasGsap = () => typeof gsap !== 'undefined' && typeof GobMotion !== 'undefined';
  const reduced = () => !hasGsap() || GobMotion.reduced();

  let scrollParallaxBound = false;

  function bindScrollParallax() {
    if (scrollParallaxBound || reduced()) return;
    scrollParallaxBound = true;

    const panels = document.querySelectorAll(
      '.stats-panel, .combat-panel, .equipment-panel, .backpack-panel, .lore-panel',
    );
    if (!panels.length) return;

    const factors = [0.12, -0.08, 0.1, -0.06, 0.08, -0.1];
    let currentY = 0;
    let targetY = 0;
    let scrollIdleTimer = null;

    const setParallaxActive = (active) => {
      panels.forEach((panel) => {
        panel.classList.toggle('is-scroll-parallax', active);
      });
    };

    const tick = () => {
      currentY += (targetY - currentY) * 0.12;
      panels.forEach((panel, i) => {
        const shift = currentY * (factors[i % factors.length] || 0.08);
        panel.style.setProperty('--scroll-shift', `${shift.toFixed(2)}px`);
      });
      requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', () => {
      targetY = Math.min(window.scrollY, 480);
      setParallaxActive(true);
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => setParallaxActive(false), 180);
    }, { passive: true });

    requestAnimationFrame(tick);
  }

  function pageEnter() {
    document.body.classList.add('char-motion-js');

    const header = document.querySelector('.char-header');
    const portraitFrame = document.querySelector('.portrait-frame');
    const nameLabel = document.querySelector('label[for="char-name"]');
    const nameInput = document.getElementById('char-name');
    const descLabel = document.querySelector('label[for="char-desc"]');
    const descInput = document.getElementById('char-desc');
    const zones = [
      document.querySelector('.stats-panel'),
      document.querySelector('.combat-panel'),
      document.querySelector('.equipment-panel'),
      document.querySelector('.backpack-panel'),
      document.querySelector('.lore-panel'),
      document.getElementById('spellbook-btn'),
    ].filter(Boolean);

    const portraitBits = [portraitFrame, nameLabel, nameInput, descLabel, descInput].filter(Boolean);

    if (reduced()) {
      document.body.classList.add('char-motion-ready');
      return null;
    }

    GobMotion.set(header, { opacity: 0, y: -14 });
    GobMotion.set(portraitBits, { opacity: 0, y: 18 });
    GobMotion.set(zones, { opacity: 0, y: 22 });

    const tl = GobMotion.timeline({
      onComplete: () => {
        document.body.classList.add('char-motion-ready');
        bindScrollParallax();
      },
    });

    tl.to(header, { opacity: 1, y: 0, duration: 0.5, ease: GobMotion.EASE.enter }, 0)
      .to(portraitFrame, { opacity: 1, y: 0, duration: 0.5, ease: GobMotion.EASE.cinematic }, 0.1)
      .to([nameLabel, nameInput].filter(Boolean), {
        opacity: 1,
        y: 0,
        duration: 0.48,
        stagger: 0.06,
        ease: GobMotion.EASE.cinematic,
      }, 0.2)
      .to(zones, {
        opacity: 1,
        y: 0,
        duration: 0.52,
        stagger: 0.1,
        ease: GobMotion.EASE.cinematic,
      }, 0.32)
      .to([descLabel, descInput].filter(Boolean), {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: GobMotion.EASE.cinematic,
      }, 0.38);

    return tl;
  }

  function openSidePanel(el, onComplete) {
    if (!el) {
      onComplete?.();
      return null;
    }
    el.hidden = false;

    if (reduced()) {
      onComplete?.();
      return null;
    }

    GobMotion.killOf(el);
    return GobMotion.fromTo(el, {
      opacity: 0,
      x: -32,
    }, {
      opacity: 1,
      x: 0,
      duration: GobMotion.DUR.normal,
      ease: GobMotion.EASE.cinematic,
      onComplete,
    });
  }

  function closeSidePanel(el, onComplete) {
    if (!el) {
      onComplete?.();
      return null;
    }

    if (reduced()) {
      el.hidden = true;
      onComplete?.();
      return null;
    }

    GobMotion.killOf(el);
    return GobMotion.to(el, {
      opacity: 0,
      x: -28,
      duration: GobMotion.DUR.fast,
      ease: GobMotion.EASE.exit,
      onComplete: () => {
        el.hidden = true;
        gsap.set(el, { clearProps: 'opacity,transform' });
        onComplete?.();
      },
    });
  }

  function openSpellEditorSlide(el, onComplete) {
    if (!el) {
      onComplete?.();
      return null;
    }
    el.hidden = false;

    if (reduced()) {
      onComplete?.();
      return null;
    }

    GobMotion.killOf(el);
    gsap.set(el, {
      left: 'auto',
      right: '3%',
      top: '50%',
      xPercent: 0,
      yPercent: -50,
    });

    return GobMotion.fromTo(el, {
      opacity: 0,
      x: 72,
      rotateY: -8,
    }, {
      opacity: 1,
      x: 0,
      rotateY: 0,
      duration: GobMotion.DUR.normal,
      ease: GobMotion.EASE.cinematic,
      transformPerspective: 900,
      onComplete,
    });
  }

  function closeSpellEditorSlide(el, onComplete) {
    if (!el) {
      onComplete?.();
      return null;
    }

    if (reduced()) {
      el.hidden = true;
      onComplete?.();
      return null;
    }

    GobMotion.killOf(el);
    return GobMotion.to(el, {
      opacity: 0,
      x: 56,
      rotateY: -6,
      duration: GobMotion.DUR.fast,
      ease: GobMotion.EASE.exit,
      transformPerspective: 900,
      onComplete: () => {
        el.hidden = true;
        gsap.set(el, { clearProps: 'opacity,transform' });
        onComplete?.();
      },
    });
  }

  function openCenterEditor(el, onComplete) {
    return openSpellEditorSlide(el, onComplete);
  }

  function closeCenterEditor(el, onComplete) {
    return closeSpellEditorSlide(el, onComplete);
  }

  function openSpellbook(modal, onReady) {
    if (!modal) return;

    modal.showModal();
    const shell = modal.querySelector('.spellbook-gold-shell');
    if (typeof GobSound !== 'undefined') {
      GobSound.playLeather?.();
      window.setTimeout(() => GobSound.playOpen?.(), 120);
    }

    if (reduced() || !shell) {
      onReady?.();
      return null;
    }

    GobMotion.killOf(shell);
    return GobMotion.fromTo(shell, {
      opacity: 0,
      scale: 0.88,
      rotateY: -14,
    }, {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      duration: GobMotion.DUR.slow,
      ease: GobMotion.EASE.cinematic,
      transformPerspective: 1200,
      onComplete: () => onReady?.(),
    });
  }

  function closeSpellbook(modal, onComplete) {
    if (!modal) {
      onComplete?.();
      return null;
    }

    const shell = modal.querySelector('.spellbook-gold-shell');

    if (reduced() || !shell) {
      if (typeof GobSound !== 'undefined') GobSound.playClose();
      modal.close();
      onComplete?.();
      return null;
    }

    if (typeof GobSound !== 'undefined') GobSound.playClose();

    GobMotion.killOf(shell);
    return GobMotion.to(shell, {
      opacity: 0,
      scale: 0.92,
      rotateY: 10,
      duration: GobMotion.DUR.fast,
      ease: GobMotion.EASE.exit,
      transformPerspective: 1200,
      onComplete: () => {
        gsap.set(shell, { clearProps: 'opacity,transform' });
        modal.close();
        onComplete?.();
      },
    });
  }

  function flashSpine() {
    const spine = document.querySelector('.spellbook-spine-overlay');
    if (!spine) return;
    spine.classList.remove('is-flash');
    void spine.offsetWidth;
    spine.classList.add('is-flash');
    window.setTimeout(() => spine.classList.remove('is-flash'), 500);
  }

  function fadeTooltipIn(tip) {
    if (!tip || reduced()) return null;
    GobMotion.killOf(tip);
    const below = tip.classList.contains('combat-tooltip--below')
      || tip.classList.contains('spell-tooltip--below');
    return GobMotion.fromTo(tip, {
      opacity: 0,
      y: below ? -6 : 6,
      scale: 0.96,
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.24,
      ease: GobMotion.EASE.enter,
    });
  }

  function fadeTooltipOut(tip, onComplete) {
    if (!tip) {
      onComplete?.();
      return null;
    }
    if (reduced()) {
      onComplete?.();
      return null;
    }
    GobMotion.killOf(tip);
    return GobMotion.to(tip, {
      opacity: 0,
      duration: 0.14,
      ease: GobMotion.EASE.exit,
      onComplete: () => {
        gsap.set(tip, { clearProps: 'opacity,transform' });
        onComplete?.();
      },
    });
  }

  function flashCombatValue(el) {
    if (!el || reduced()) return null;
    const input = el.classList?.contains('combat-input')
      ? el
      : el.querySelector?.('.combat-input') || el;
    if (!input) return null;
    GobMotion.killOf(input);
    return GobMotion.fromTo(input, {
      backgroundColor: 'rgba(62, 196, 168, 0.35)',
    }, {
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      duration: 0.28,
      ease: GobMotion.EASE.soft,
    });
  }

  function bindBackLink() {
    const link = document.querySelector('.char-back');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      GobMotion.navigateTo(href);
    });

    link.addEventListener('mouseenter', () => {
      if (typeof GobSound !== 'undefined') GobSound.playHover();
    });
  }

  return {
    pageEnter,
    bindScrollParallax,
    openSidePanel,
    closeSidePanel,
    openCenterEditor,
    closeCenterEditor,
    openSpellEditorSlide,
    closeSpellEditorSlide,
    openSpellbook,
    closeSpellbook,
    flashSpine,
    fadeTooltipIn,
    fadeTooltipOut,
    flashCombatValue,
    bindBackLink,
  };
})();
