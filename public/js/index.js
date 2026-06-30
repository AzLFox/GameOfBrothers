const carousel = document.getElementById('carousel');
const overlay = document.getElementById('overlay');
const cardSpotlight = document.getElementById('cardSpotlight');
const scene = document.getElementById('scene');

let cards = [];
let step = 0;
let rotation = 0;
let activeCard = null;
let rotationTween = null;
let introDone = false;
let cardBusy = false;

const RING_RADIUS = 380;
const SELECTED_RADIUS = 560;
const HOVER_Z_BONUS = 48;

let autoSpin = true;
let idleTimer = null;
let carouselWillChangeClear = null;

const SKELETON_COUNT = 6;

/* ====== DRAG ====== */
let dragging = false;
let lastX = 0;

function applyCardTransform(card, index, z = RING_RADIUS, hoverBoost = 0, scale = 1) {
  card.style.setProperty('--card-angle', `${index * step}deg`);
  card.style.setProperty('--card-z', `${z}px`);
  card.style.setProperty('--card-z-hover', `${hoverBoost}px`);
  card.style.setProperty('--card-scale', String(scale));
}

function setCardRingTransform(card, index) {
  applyCardTransform(card, index, RING_RADIUS, 0, 1);
}

function applyCarouselRotation() {
  carousel.style.transition = '';
  carousel.style.transform = `rotateY(${rotation}deg)`;
  updateCardSides();
}

const FACE_ARC_DEG = 70;

/** Угол карточки на кольце относительно зрителя: 0° = центр экрана (+Z). */
function cardSignedAngleDeg(index) {
  return ((rotation + index * step + 180) % 360) - 180;
}

function updateCardSides() {
  cards.forEach((card, i) => {
    if (card.classList.contains('flipped') || card.classList.contains('selected')) return;

    const inFaceArc = Math.abs(cardSignedAngleDeg(i)) <= FACE_ARC_DEG;

    card.classList.toggle('is-locked', !inFaceArc);
    card.style.setProperty('--card-flip', inFaceArc ? '0deg' : '180deg');
  });
}

function getRotationToCenterCard(index) {
  const cardAngle = index * step;
  const normalized = ((rotation % 360) + 360) % 360;
  let delta = -cardAngle - normalized;
  delta = ((delta + 180) % 360 + 360) % 360 - 180;
  return rotation + delta;
}

function animateCarouselTo(targetRotation, durationMs, onComplete) {
  if (rotationTween) rotationTween.kill();
  if (carouselWillChangeClear) carouselWillChangeClear();
  carouselWillChangeClear = GobMotion.willChangeTemp(carousel, 'transform', durationMs + 120);

  const from = rotation;
  rotationTween = GobMotion.animateRotation({
    from,
    to: targetRotation,
    duration: durationMs / 1000,
    onUpdate: (r) => {
      rotation = r;
      carousel.style.transform = `rotateY(${rotation}deg)`;
      updateCardSides();
    },
    onComplete: () => {
      rotationTween = null;
      carouselWillChangeClear?.();
      carouselWillChangeClear = null;
      onComplete?.();
    },
  });
}

function bindCardHover(card) {
  card.addEventListener('pointerenter', () => {
    if (activeCard || cardBusy || dragging || card.classList.contains('is-locked')) return;
    card.classList.add('is-hover');
    if (typeof GobSound !== 'undefined') GobSound.playHover();
    if (GobMotion.reduced() || typeof gsap === 'undefined') return;
    GobMotion.killOf(card);
    GobMotion.to(card, {
      '--card-z-hover': `${HOVER_Z_BONUS}px`,
      duration: 0.38,
      ease: GobMotion.EASE.enter,
    });
  });

  card.addEventListener('pointerleave', () => {
    if (activeCard || card.classList.contains('selected')) return;
    card.classList.remove('is-hover');
    if (GobMotion.reduced() || typeof gsap === 'undefined') return;
    GobMotion.killOf(card);
    GobMotion.to(card, {
      '--card-z-hover': '0px',
      duration: 0.42,
      ease: GobMotion.EASE.soft,
    });
  });
}

function revealCards() {
  if (!cards.length) return;

  cards.forEach((c) => c.classList.add('is-visible'));

  if (GobMotion.reduced() || typeof gsap === 'undefined') {
    cards.forEach((c) => { c.style.opacity = '1'; });
    return;
  }

  GobMotion.killOf(cards);
  GobMotion.to(cards, {
    opacity: 1,
    duration: GobMotion.DUR.slow,
    stagger: 0.1,
    ease: GobMotion.EASE.cinematic,
  });
}

function resetCardInstant(card, index, inner) {
  card.classList.remove('selected', 'flipped', 'flip-done', 'is-hover', 'is-locked');
  inner.style.transform = '';
  if (typeof gsap !== 'undefined') gsap.set(inner, { clearProps: 'transform' });
  setCardRingTransform(card, index);
  overlay.classList.remove('active');
  cardSpotlight.classList.remove('active');
  overlay.style.opacity = '';
  cardSpotlight.style.opacity = '';
  document.body.classList.remove('card-open');
  activeCard = null;
  cardBusy = false;
  applyCarouselRotation();
  startIdleTimer();
}

function navigateToCharacter(href, card) {
  if (cardBusy) return;
  cardBusy = true;

  GobMotion.navigateTo(href, {
    animate(finish) {
      finish();
    },
  });
}

function showLoadingHint(visible) {
  const hint = document.getElementById('carousel-loading-hint');
  if (hint) hint.hidden = !visible;
}

function hideCarouselSkeleton() {
  carousel.querySelectorAll('.card--skeleton').forEach((el) => el.remove());
  carousel.classList.remove('is-loading');
  showLoadingHint(false);
}

function showCarouselSkeleton(count = SKELETON_COUNT) {
  hideCarouselSkeleton();
  carousel.classList.add('is-loading');
  showLoadingHint(true);
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'card card--skeleton';
    sk.setAttribute('aria-hidden', 'true');
    sk.style.setProperty('--card-angle', `${i * angleStep}deg`);
    sk.style.setProperty('--card-z', `${RING_RADIUS}px`);
    sk.innerHTML = `
      <div class="card-skeleton-mist">
        <div class="card-skeleton-silhouette" aria-hidden="true"></div>
        <div class="card-skeleton-fog"></div>
      </div>
    `;
    carousel.appendChild(sk);
  }
}

function buildCards(data) {
  hideCarouselSkeleton();
  step = 360 / data.length;
  carousel.innerHTML = '';
  cards = [];

  data.forEach((char, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front" style="background-image:url(/characters/${char.id}.jpg)"></div>
        <div class="card-face card-back">
          <img src="/characters/card_back.jpg" alt="" draggable="false">
        </div>
        <div class="card-face card-content gob-parchment-bg">
          <h3>${char.name}</h3>
          <p>${char.description}</p>
          <a href="/character?id=${char.id}" class="open-btn">Открыть</a>
        </div>
      </div>
    `;

    setCardRingTransform(card, i);
    bindCardHover(card);

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCard || cardBusy) return;
      openCard(card);
    });

    const openBtn = card.querySelector('.open-btn');
    openBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateToCharacter(openBtn.getAttribute('href'), card);
    });

    carousel.appendChild(card);
    cards.push(card);
  });

  applyCarouselRotation();
  document.body.classList.add('loaded');

  if (introDone) revealCards();
}

carousel.addEventListener('pointerdown', (e) => {
  if (activeCard || cardBusy || e.target.closest('.card')) return;
  dragging = true;
  lastX = e.clientX;
  stopAutoSpin();
});

window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  rotation += dx * 0.3;
  applyCarouselRotation();
});

window.addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false;
  startIdleTimer();
});

window.addEventListener('wheel', (e) => {
  if (activeCard || cardBusy) return;
  e.preventDefault();
  stopAutoSpin();
  rotation += e.deltaY * 0.15;
  applyCarouselRotation();
  startIdleTimer();
}, { passive: false });

showCarouselSkeleton();

fetch('/api/characters')
  .then((r) => r.json())
  .then((data) => {
    buildCards(data);
    requestAnimationFrame(spinLoop);
  })
  .catch(() => {
    hideCarouselSkeleton();
    document.body.classList.add('loaded');
    requestAnimationFrame(spinLoop);
  });

function spinLoop() {
  if (autoSpin && !activeCard && !rotationTween && !dragging && !cardBusy) {
    rotation += 0.05;
    applyCarouselRotation();
  }
  requestAnimationFrame(spinLoop);
}

function stopAutoSpin() {
  autoSpin = false;
  clearTimeout(idleTimer);
}

function startIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    autoSpin = true;
  }, 2000);
}

function setAtmosphereActive(active) {
  window.SceneAtmosphere?.setCardActive?.(active);
}

function openCard(card) {
  if (cardBusy) return;
  cardBusy = true;
  card.classList.remove('is-hover');
  stopAutoSpin();
  if (rotationTween) rotationTween.kill();

  activeCard = card;
  document.body.classList.add('card-open');

  const index = Number(card.dataset.index);
  const targetRotation = getRotationToCenterCard(index);
  const inner = card.querySelector('.card-inner');
  const others = cards.filter((c) => c !== card);

  GobMotion.killOf([overlay, cardSpotlight, card, inner, ...others]);
  overlay.classList.add('active');
  GobMotion.fromTo(overlay, { opacity: 0 }, {
    opacity: 1,
    duration: 0.55,
    ease: GobMotion.EASE.cinematic,
  });

  GobMotion.to(others, {
    opacity: 0.22,
    duration: 0.5,
    ease: GobMotion.EASE.soft,
  });

  setAtmosphereActive(true);

  animateCarouselTo(targetRotation, 800, () => {
    const fromRear = card.classList.contains('is-locked');
    card.classList.remove('is-locked');
    card.style.setProperty('--card-flip', '0deg');
    card.classList.add('selected', 'flipped');
    applyCardTransform(card, index, SELECTED_RADIUS, 0, 1);

    const inner = card.querySelector('.card-inner');
    const clearWillChange = GobMotion.willChangeTemp(inner, 'transform', 1200);

    GobMotion.flipCard(inner, {
      fromRear,
      onPeak: () => {
        if (typeof GobSound !== 'undefined') GobSound.playOpen();
      },
      onComplete: () => {
        clearWillChange();
        card.classList.add('flip-done');
        cardSpotlight.classList.add('active');
        GobMotion.to(cardSpotlight, { opacity: 1, duration: 0.55, ease: GobMotion.EASE.soft });
        cardBusy = false;
      },
    });
  });
}

function closeCard() {
  if (!activeCard || cardBusy) return;
  cardBusy = true;
  stopAutoSpin();

  const card = activeCard;
  const index = Number(card.dataset.index);
  const inner = card.querySelector('.card-inner');
  const others = cards.filter((c) => c !== card);

  setAtmosphereActive(false);
  if (typeof GobSound !== 'undefined') GobSound.playClose();

  if (GobMotion.reduced() || typeof gsap === 'undefined') {
    resetCardInstant(card, index, inner);
    return;
  }

  GobMotion.killOf([card, inner, cardSpotlight, overlay, ...others]);

  const zProxy = { z: SELECTED_RADIUS };
  const flipTl = GobMotion.flipCardBack(inner);

  const tl = GobMotion.timeline({
    onComplete: () => {
      activeCard = null;
      cardBusy = false;
      applyCarouselRotation();
      startIdleTimer();
    },
  });

  tl.to(cardSpotlight, { opacity: 0, duration: 0.38, ease: GobMotion.EASE.exit }, 0)
    .to(overlay, { opacity: 0, duration: 0.48, ease: GobMotion.EASE.exit }, 0.1)
    .add(() => card.classList.remove('flip-done'), 0)
    .add(flipTl, 0.14)
    .to(others, { opacity: 1, duration: 0.45, ease: GobMotion.EASE.soft }, 0.32)
    .add(() => document.body.classList.remove('card-open'), 0.38)
    .to(zProxy, {
      z: RING_RADIUS,
      duration: 0.88,
      ease: GobMotion.EASE.cinematic,
      onUpdate: () => {
        applyCardTransform(card, index, zProxy.z, 0, 1);
      },
    }, 0.5)
    .add(() => {
      card.classList.remove('selected', 'flipped', 'is-locked');
      inner.style.transform = '';
      gsap.set(inner, { clearProps: 'transform' });
      setCardRingTransform(card, index);
      overlay.classList.remove('active');
      cardSpotlight.classList.remove('active');
      gsap.set([overlay, cardSpotlight], { clearProps: 'opacity' });
    });
}

document.body.addEventListener('click', (e) => {
  if (!activeCard || cardBusy) return;
  if (e.target.closest('.card')) return;
  closeCard();
});

function initCreateButton() {
  const btn = document.getElementById('btnCreate');
  const shine = btn?.querySelector('.btn-create-shine');
  if (!btn || !shine) return;

  btn.addEventListener('mouseenter', () => {
    if (typeof GobSound !== 'undefined') GobSound.playHover();
    if (GobMotion.reduced() || typeof gsap === 'undefined') return;
    GobMotion.killOf([btn, shine]);
    GobMotion.fromTo(shine, { x: '-160%' }, {
      x: '280%',
      duration: 0.62,
      ease: 'power2.out',
    });
    GobMotion.to(btn, {
      scale: 1.05,
      duration: 0.28,
      ease: GobMotion.EASE.elastic,
    });
  });

  btn.addEventListener('mouseleave', () => {
    if (GobMotion.reduced() || typeof gsap === 'undefined') return;
    GobMotion.to(btn, { scale: 1, duration: 0.32, ease: GobMotion.EASE.soft });
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const href = btn.getAttribute('href');
    GobMotion.navigateTo(href);
  });
}

function bootstrapMainPage() {
  initCreateButton();

  document.body.classList.remove('motion-intro-done', 'motion-js');
  introDone = false;

  GobMotion.playMainIntro({
    onCardsReady: () => {
      introDone = true;
      revealCards();
    },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  GobMotion.initPageTransitionEnter?.({
    onComplete: bootstrapMainPage,
  });
});
