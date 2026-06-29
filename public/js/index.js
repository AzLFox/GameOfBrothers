const carousel = document.getElementById('carousel');
const overlay = document.getElementById('overlay');

let cards = [];
let step = 0;
let rotation = 0;
let activeCard = null;

const RING_RADIUS = 380;
const SELECTED_RADIUS = 560;

let autoSpin = true;
let idleTimer = null;
let carouselAnimFrame = null;

const selectSound = new Audio('../sounds/card-select.mp3');
selectSound.volume = 0.5;

/* ====== DRAG ====== */
let dragging = false;
let lastX = 0;

function applyCarouselRotation() {
  carousel.style.transition = '';
  carousel.style.transform = `rotateY(${rotation}deg)`;
  updateCardSides();
}

function updateCardSides() {
  cards.forEach((card, i) => {
    if (card.classList.contains('flipped') || card.classList.contains('selected')) return;

    let angle = rotation + i * step;
    angle = ((angle % 360) + 360) % 360;
    const isRear = angle > 90 && angle < 270;
    card.classList.toggle('rear', isRear);
  });
}

function getRotationToCenterCard(index) {
  const cardAngle = index * step;
  const normalized = ((rotation % 360) + 360) % 360;
  let delta = -cardAngle - normalized;
  delta = ((delta + 180) % 360 + 360) % 360 - 180;
  return rotation + delta;
}

function animateCarouselTo(targetRotation, duration, onComplete) {
  if (carouselAnimFrame) cancelAnimationFrame(carouselAnimFrame);

  const from = rotation;
  let delta = targetRotation - from;
  delta = ((delta + 180) % 360 + 360) % 360 - 180;
  const to = from + delta;
  const startTime = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    rotation = from + delta * eased;
    carousel.style.transition = '';
    carousel.style.transform = `rotateY(${rotation}deg)`;
    updateCardSides();

    if (t < 1) {
      carouselAnimFrame = requestAnimationFrame(frame);
      return;
    }

    rotation = to;
    carousel.style.transform = `rotateY(${rotation}deg)`;
    updateCardSides();
    carouselAnimFrame = null;
    onComplete?.();
  }

  requestAnimationFrame(frame);
}

function setCardRingTransform(card, index) {
  card.style.transform = `rotateY(${index * step}deg) translateZ(${RING_RADIUS}px)`;
}

carousel.addEventListener('pointerdown', e => {
  if (activeCard || e.target.closest('.card')) return;
  dragging = true;
  lastX = e.clientX;
  stopAutoSpin();
});

window.addEventListener('pointermove', e => {
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

/* ====== WHEEL ====== */
window.addEventListener('wheel', e => {
  if (activeCard) return;
  e.preventDefault();
  stopAutoSpin();
  rotation += e.deltaY * 0.15;
  applyCarouselRotation();
  startIdleTimer();
}, { passive: false });

/* ===== FETCH CARDS ===== */
fetch('/api/characters')
  .then(r => r.json())
  .then(data => {
    step = 360 / data.length;

    data.forEach((char, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.index = i;
      card.style.setProperty('--enter-delay', `${i * 0.12}s`);

      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front" style="background-image:url(/characters/${char.id}.jpg)"></div>
          <div class="card-face card-back">
            <img src="/characters/card_back.jpg" alt="" draggable="false">
          </div>
          <div class="card-face card-content">
            <h3>${char.name}</h3>
            <p>${char.description}</p>
            <a href="/character?id=${char.id}" class="open-btn">Открыть</a>
          </div>
        </div>
      `;

      setCardRingTransform(card, i);

      card.addEventListener('click', e => {
        e.stopPropagation();
        if (activeCard) return;
        openCard(card);
      });

      carousel.appendChild(card);
      cards.push(card);
    });

    applyCarouselRotation();
    document.body.classList.add('loaded');
    requestAnimationFrame(spinLoop);
  })
  .catch(() => {
    document.body.classList.add('loaded');
  });

/* ===== AUTO SPIN ===== */
function spinLoop() {
  if (autoSpin && !activeCard) {
    rotation += 0.05;
    applyCarouselRotation();
  }
  requestAnimationFrame(spinLoop);
}

/* ===== STOP AUTO ===== */
function stopAutoSpin() {
  autoSpin = false;
  clearTimeout(idleTimer);
}

/* ===== START AUTO AFTER IDLE ====== */
function startIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    autoSpin = true;
  }, 2000);
}

/* ===== CENTER CARD ON SCREEN ===== */
function centerCarouselOnCard(index) {
  rotation = getRotationToCenterCard(index);
}

function flipCardWithOvershoot(card, fromRear = false) {
  const inner = card.querySelector('.card-inner');
  const from = fromRear ? 180 : 0;
  const peak = from === 0 ? 200 : 198;
  const end = 180;
  const duration = 1100;
  const startTime = performance.now();

  return new Promise(resolve => {
    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);

      let angle;
      if (t < 0.72) {
        const p = t / 0.72;
        const eased = 1 - Math.pow(1 - p, 3);
        angle = from + (peak - from) * eased;
      } else {
        const p = (t - 0.72) / 0.28;
        const eased = 1 - Math.pow(1 - p, 2);
        angle = peak + (end - peak) * eased;
      }

      inner.style.transform = `rotateY(${angle}deg)`;

      if (t < 1) requestAnimationFrame(frame);
      else {
        inner.style.transform = `rotateY(${end}deg)`;
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

/* ===== OPEN CARD ===== */
function openCard(card) {
  stopAutoSpin();
  if (carouselAnimFrame) cancelAnimationFrame(carouselAnimFrame);

  activeCard = card;
  selectSound.currentTime = 0;
  selectSound.play();
  document.body.classList.add('card-open');
  overlay.classList.add('active');

  const index = Number(card.dataset.index);
  const targetRotation = getRotationToCenterCard(index);

  animateCarouselTo(targetRotation, 800, () => {
    const fromRear = card.classList.contains('rear');
    card.classList.remove('rear');
    card.classList.add('selected', 'flipped');
    card.style.transform = `rotateY(${index * step}deg) translateZ(${SELECTED_RADIUS}px)`;

    flipCardWithOvershoot(card, fromRear).then(() => {
      card.classList.add('flip-done');
      document.getElementById('cardSpotlight').classList.add('active');
    });
  });
}

/* ===== CLOSE ===== */
document.body.addEventListener('click', e => {
  if (!activeCard) return;
  if (e.target.closest('.card')) return;

  const index = Number(activeCard.dataset.index);
  activeCard.classList.remove('selected', 'flipped', 'flip-done');
  const inner = activeCard.querySelector('.card-inner');
  inner.style.transform = '';
  setCardRingTransform(activeCard, index);

  activeCard = null;
  document.body.classList.remove('card-open');
  overlay.classList.remove('active');
  document.getElementById('cardSpotlight').classList.remove('active');

  applyCarouselRotation();
  startIdleTimer();
});
