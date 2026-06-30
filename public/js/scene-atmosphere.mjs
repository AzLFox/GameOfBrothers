/**
 * Pixi.js atmosphere for the main page — particles + root glow around world tree.
 */
import { Application, Container, Graphics, Sprite, Texture } from '/vendor/pixi/pixi.min.mjs';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 640;

let targetIntensity = 0;
let currentIntensity = 0;
let time = 0;

let app = null;
let host = null;
let glowTeal = null;
let glowWarm = null;
let particleGfx = null;
let particles = [];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makeGlowTexture(inner, mid, outer) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

function getTreeAnchor() {
  const img = document.querySelector('#worldTree img');
  if (!img) {
    return {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.58,
    };
  }
  const rect = img.getBoundingClientRect();
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.82,
  };
}

function toLocal(screenX, screenY) {
  const bounds = host.getBoundingClientRect();
  return {
    x: screenX - bounds.left,
    y: screenY - bounds.top,
  };
}

function particleBudget(intensity) {
  if (reduced) return 0;
  const base = isMobile() ? 58 : 90;
  const selected = isMobile() ? 95 : 140;
  return Math.round(lerp(base, selected, intensity));
}

function spawnParticle(anchor, intensity) {
  const spreadX = lerp(120, 170, intensity);
  const spreadY = lerp(90, 130, intensity);
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.pow(Math.random(), 0.65);
  const goldChance = lerp(0.28, 0.48, intensity);

  return {
    x: anchor.x + Math.cos(angle) * spreadX * dist,
    y: anchor.y + Math.sin(angle) * spreadY * dist * 0.55 - Math.random() * 40,
    vx: (Math.random() - 0.5) * lerp(12, 22, intensity),
    vy: -lerp(8, 18, intensity) - Math.random() * 10,
    life: 2.5 + Math.random() * 3.5,
    maxLife: 5,
    size: lerp(1.1, 2.2, intensity) + Math.random() * 1.4,
    color: Math.random() < goldChance ? 0xf0d98a : 0x5ef0c8,
    twinkle: Math.random() * Math.PI * 2,
  };
}

function resetParticle(p, anchor, intensity) {
  Object.assign(p, spawnParticle(anchor, intensity));
  p.maxLife = p.life;
}

function syncParticleCount(intensity) {
  const budget = particleBudget(intensity);

  const screen = getTreeAnchor();
  const anchor = toLocal(screen.x, screen.y);

  while (particles.length < budget) {
    particles.push(spawnParticle(anchor, intensity));
  }
  if (particles.length > budget) {
    particles.length = budget;
  }
}

function drawParticles(intensity) {
  if (!particleGfx || !particles.length) return;

  particleGfx.clear();

  for (const p of particles) {
    const tw = 0.45 + Math.sin(time * 3 + p.twinkle) * 0.35;
    const alpha = Math.min(1, (p.life / p.maxLife) * 1.2) * tw * lerp(0.55, 0.95, intensity);
    particleGfx.circle(p.x, p.y, p.size).fill({ color: p.color, alpha });
  }
}

function updateParticles(dt, intensity) {
  if (!particles.length) return;

  const anchorScreen = getTreeAnchor();
  const anchor = toLocal(anchorScreen.x, anchorScreen.y);

  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx += (Math.random() - 0.5) * dt * 6;
    p.vy += Math.sin(time * 2 + p.twinkle) * dt * 3;

    if (p.life <= 0) resetParticle(p, anchor, intensity);
  }

  drawParticles(intensity);
}

function updateGlow(intensity) {
  if (!glowTeal || !glowWarm) return;

  const anchorScreen = getTreeAnchor();
  const anchor = toLocal(anchorScreen.x, anchorScreen.y);
  const pulse = reduced ? 0.6 : 0.55 + Math.sin(time * 1.15) * 0.14;

  glowTeal.position.set(anchor.x, anchor.y);
  glowWarm.position.set(anchor.x, anchor.y - 8);

  const scale = lerp(1.6, 2.15, intensity) + pulse * 0.12;
  glowTeal.scale.set(scale);
  glowWarm.scale.set(scale * lerp(0.85, 1.05, intensity));

  glowTeal.alpha = lerp(0.32, 0.42, intensity) * pulse;
  glowWarm.alpha = lerp(0, 0.28, intensity) * pulse;
}

function tick(ticker) {
  const dt = Math.min(0.05, ticker.deltaMS / 1000);
  time += dt;

  currentIntensity = lerp(currentIntensity, targetIntensity, reduced ? 1 : 0.06);
  syncParticleCount(currentIntensity);
  updateGlow(currentIntensity);

  if (!reduced && particles.length) {
    updateParticles(dt, currentIntensity);
  }
}

async function boot() {
  host = document.getElementById('scene-atmosphere');
  if (!host || reduced === undefined) return;

  app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
  });

  host.appendChild(app.canvas);
  app.canvas.style.display = 'block';

  const layer = new Container();
  app.stage.addChild(layer);

  const tealTex = makeGlowTexture(
    'rgba(94, 240, 200, 0.55)',
    'rgba(60, 200, 160, 0.18)',
    'rgba(0, 0, 0, 0)',
  );
  const warmTex = makeGlowTexture(
    'rgba(255, 210, 130, 0.5)',
    'rgba(240, 180, 80, 0.15)',
    'rgba(0, 0, 0, 0)',
  );

  glowTeal = new Sprite(tealTex);
  glowWarm = new Sprite(warmTex);
  glowTeal.anchor.set(0.5, 0.5);
  glowWarm.anchor.set(0.5, 0.5);
  glowTeal.blendMode = 'add';
  glowWarm.blendMode = 'add';

  particleGfx = new Graphics();
  layer.addChild(glowTeal, glowWarm, particleGfx);

  syncParticleCount(0);
  updateGlow(0);
  drawParticles(0);

  app.ticker.add(tick);
  window.SceneAtmosphere.ready = true;
}

const api = {
  ready: false,
  setCardActive(active) {
    targetIntensity = active ? 1 : 0;
  },
  destroy() {
    app?.destroy(true, { children: true });
    app = null;
    particles = [];
    window.SceneAtmosphere = null;
  },
};

window.SceneAtmosphere = api;

function startWhenReady() {
  const img = document.querySelector('#worldTree img');
  if (!img) {
    boot().catch(() => {});
    return;
  }
  if (img.complete) boot().catch(() => {});
  else img.addEventListener('load', () => boot().catch(() => {}), { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startWhenReady);
} else {
  startWhenReady();
}
