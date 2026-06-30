/**
 * Character sheet motion layer (uses GobMotion + GSAP).
 */
const CharMotion = (() => {
  const hasGsap = () => typeof gsap !== 'undefined' && typeof GobMotion !== 'undefined';
  const reduced = () => !hasGsap() || GobMotion.reduced();

  function pageEnter() {
    document.body.classList.add('char-motion-js');

    const header = document.querySelector('.char-header');
    const panels = [
      document.querySelector('.portrait-panel'),
      document.querySelector('.stats-panel'),
      document.querySelector('.combat-panel'),
      document.querySelector('.equipment-panel'),
      document.querySelector('.backpack-panel'),
      document.querySelector('.lore-panel'),
      document.getElementById('spellbook-btn'),
    ].filter(Boolean);

    if (reduced()) {
      document.body.classList.add('char-motion-ready');
      return null;
    }

    GobMotion.set([header, ...panels], { opacity: 0 });
    GobMotion.set(header, { y: -14 });
    GobMotion.set(panels, { y: 22 });

    return GobMotion.timeline({
      onComplete: () => document.body.classList.add('char-motion-ready'),
    })
      .to(header, { opacity: 1, y: 0, duration: 0.5, ease: GobMotion.EASE.enter }, 0)
      .to(panels, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.1,
        ease: GobMotion.EASE.cinematic,
      }, 0.12);
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

  function openCenterEditor(el, onComplete) {
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
    gsap.set(el, { left: '50%', top: '50%', xPercent: -50, yPercent: -50 });
    return GobMotion.fromTo(el, {
      opacity: 0,
      scale: 0.92,
      yPercent: -46,
    }, {
      opacity: 1,
      scale: 1,
      yPercent: -50,
      duration: GobMotion.DUR.normal,
      ease: GobMotion.EASE.cinematic,
      onComplete,
    });
  }

  function closeCenterEditor(el, onComplete) {
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
      scale: 0.94,
      yPercent: -48,
      duration: GobMotion.DUR.fast,
      ease: GobMotion.EASE.exit,
      onComplete: () => {
        el.hidden = true;
        gsap.set(el, { clearProps: 'opacity,transform' });
        onComplete?.();
      },
    });
  }

  function openSpellbook(modal, onReady) {
    if (!modal) return;

    modal.showModal();
    const shell = modal.querySelector('.spellbook-gold-shell');
    if (typeof GobSound !== 'undefined') GobSound.playOpen();
    onReady?.();

    if (reduced() || !shell) return null;

    GobMotion.killOf(shell);
    return GobMotion.fromTo(shell, {
      opacity: 0,
      scale: 0.9,
      rotateY: -10,
    }, {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      duration: GobMotion.DUR.slow,
      ease: GobMotion.EASE.cinematic,
      transformPerspective: 1200,
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
      scale: 0.94,
      rotateY: 8,
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

  function pageShadow(progress) {
    const blur = 4 + Math.sin(progress * Math.PI) * 24;
    const spread = 2 + Math.sin(progress * Math.PI) * 14;
    const ox = -6 + progress * 12;
    return `drop-shadow(${ox}px 6px ${blur}px rgba(0,0,0,${0.2 + progress * 0.35}))`;
  }

  function turnSpellPage(sheet, direction, onComplete) {
    if (!sheet) {
      onComplete?.();
      return null;
    }

    if (reduced()) {
      onComplete?.();
      return null;
    }

    if (typeof GobSound !== 'undefined') GobSound.playPageFlip();

    const forward = direction === 'next';
    const end = forward ? -180 : 180;
    const origin = forward ? 'left center' : 'right center';

    GobMotion.killOf(sheet);
    sheet.style.transformOrigin = origin;
    gsap.set(sheet, { rotateY: 0, transformPerspective: 900 });

    const proxy = { r: 0 };
    return gsap.to(proxy, {
      r: end,
      duration: 0.85,
      ease: 'power2.inOut',
      onUpdate: () => {
        const progress = Math.abs(proxy.r / end);
        sheet.style.transform = `rotateY(${proxy.r}deg)`;
        sheet.style.filter = pageShadow(progress);
      },
      onComplete: () => {
        sheet.style.transform = '';
        sheet.style.filter = '';
        onComplete?.();
      },
    });
  }

  function fadeTooltipIn(tip) {
    if (!tip || reduced()) return null;
    GobMotion.killOf(tip);
    const below = tip.classList.contains('combat-tooltip--below')
      || tip.classList.contains('spell-tooltip--below');
    return GobMotion.fromTo(tip, {
      opacity: 0,
      y: below ? -6 : 6,
    }, {
      opacity: 1,
      y: 0,
      duration: 0.22,
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
    GobMotion.killOf(el);
    return GobMotion.fromTo(el, {
      backgroundColor: 'rgba(62, 196, 168, 0.42)',
    }, {
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      duration: 0.3,
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
    openSidePanel,
    closeSidePanel,
    openCenterEditor,
    closeCenterEditor,
    openSpellbook,
    closeSpellbook,
    turnSpellPage,
    fadeTooltipIn,
    fadeTooltipOut,
    flashCombatValue,
    bindBackLink,
  };
})();
