/**
 * Pixi.js atmosphere for the main page — particles, god-rays, root glow.
 * Mobile budgets via GobMobile.getDeviceTier(): low=off, mid≤40, high≤80.
 */
import { Application, Container, Graphics, Sprite, Texture } from '/vendor/pixi/pixi.min.mjs';

const reduced = () => window.GobMobile.isReducedMotion();
const isMobile = () => window.GobMobile.isMobile();
const getTier = () => window.GobMobile.getDeviceTier();

function pixiEnabled() {
  return !isMobile() || getTier() !== 'low';
}

function usePixiGodRays() {
  if (reduced()) return false;
  if (!isMobile()) return true;
  return getTier() === 'high';
}

let targetIntensity = 0;
let currentIntensity = 0;
let time = 0;
let parallaxX = 0;
let parallaxY = 0;

let app = null;
let host = null;
let fxLayer = null;
let glowTeal = null;
let glowWarm = null;
let godRays = null;
let particleGfx = null;
let particles = [];
let paused = false;
let visibilityHandler = null;
let tierChangeHandler = null;
let imgLoadHandler = null;
let destroyed = false;
let lastPixiTier = null;
let lastPixiEnabled = null;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function particleCaps() {
  if (reduced()) return { cap: 0, base: 0 };
  if (!isMobile()) return { cap: 120, base: 72 };
  const tier = getTier();
  if (tier === 'high') return { cap: 80, base: 48 };
  if (tier === 'mid') return { cap: 40, base: 24 };
  return { cap: 0, base: 0 };
}

function canvasResolution() {
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, isMobile() ? 1.5 : 2);
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
  const { cap, base } = particleCaps();
  if (!cap) return 0;
  return Math.min(cap, Math.round(lerp(base, cap, intensity)));
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

function buildGodRays() {
  const rays = new Container();
  const rayCount = 6;

  for (let i = 0; i < rayCount; i++) {
    const g = new Graphics();
    const spread = (i / (rayCount - 1) - 0.5) * 1.1;
    g.moveTo(0, 0);
    g.lineTo(-28 + spread * 18, -160);
    g.lineTo(28 + spread * 18, -160);
    g.closePath();
    g.fill({ color: 0xffe8b0, alpha: 0.14 });
    g.rotation = spread * 0.35;
    g.blendMode = 'add';
    rays.addChild(g);
  }

  rays.pivot.set(0, 0);
  return rays;
}

function updateGlow(intensity) {
  if (!glowTeal || !glowWarm) return;

  const anchorScreen = getTreeAnchor();
  const anchor = toLocal(
    anchorScreen.x + parallaxX * 0.35,
    anchorScreen.y + parallaxY * 0.25,
  );
  const pulse = reduced() ? 0.6 : 0.55 + Math.sin(time * 1.15) * 0.14;

  glowTeal.position.set(anchor.x, anchor.y);
  glowWarm.position.set(anchor.x, anchor.y - 8);

  const scale = lerp(1.6, 2.35, intensity) + pulse * 0.14;
  glowTeal.scale.set(scale);
  glowWarm.scale.set(scale * lerp(0.85, 1.12, intensity));

  glowTeal.alpha = lerp(0.32, 0.5, intensity) * pulse;
  glowWarm.alpha = lerp(0, 0.38, intensity) * pulse;

  if (godRays) {
    godRays.position.set(anchor.x, anchor.y + 6);
    const animateRays = usePixiGodRays();
    godRays.alpha = animateRays
      ? lerp(0.1, 0.38, intensity) * (0.72 + Math.sin(time * 0.95) * 0.28)
      : lerp(0.1, 0.32, intensity) * 0.85;
    godRays.rotation = animateRays ? Math.sin(time * 0.18) * 0.05 : 0;
    godRays.scale.set(lerp(0.9, 1.18, intensity));
  }
}

function tick(ticker) {
  const dt = Math.min(0.05, ticker.deltaMS / 1000);
  time += dt;

  currentIntensity = lerp(currentIntensity, targetIntensity, reduced() ? 1 : 0.06);
  syncParticleCount(currentIntensity);
  updateGlow(currentIntensity);

  if (!reduced() && particles.length) {
    updateParticles(dt, currentIntensity);
  }

  if (fxLayer) {
    fxLayer.position.set(parallaxX * 0.2, parallaxY * 0.15);
  }
}

function teardownPixi() {
  if (!app) return;

  app.ticker.remove(tick);
  app.destroy(true, { children: true });
  app = null;
  fxLayer = null;
  glowTeal = null;
  glowWarm = null;
  godRays = null;
  particleGfx = null;
  particles = [];
  paused = false;
  api.ready = false;
  if (host) {
    host.replaceChildren();
  }
}

async function boot() {
  if (destroyed || !pixiEnabled() || app) return;

  host = document.getElementById('scene-atmosphere');
  if (!host) return;

  app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: !isMobile(),
    resolution: canvasResolution(),
    autoDensity: true,
    preference: 'webgl',
  });

  if (destroyed) {
    if (app) {
      app.destroy(true, { children: true });
      app = null;
    }
    return;
  }

  host.appendChild(app.canvas);
  app.canvas.style.display = 'block';
  app.canvas.style.pointerEvents = 'none';

  fxLayer = new Container();
  app.stage.addChild(fxLayer);

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

  godRays = usePixiGodRays() ? buildGodRays() : null;

  particleGfx = new Graphics();
  const children = [glowTeal, glowWarm];
  if (godRays) children.push(godRays);
  children.push(particleGfx);
  fxLayer.addChild(...children);

  syncParticleCount(0);
  updateGlow(0);
  drawParticles(0);

  app.ticker.add(tick);
  if (paused || document.hidden) {
    app.ticker.stop();
    paused = true;
  }

  api.ready = true;
}

function pause() {
  if (!app || paused) return;
  app.ticker.stop();
  paused = true;
}

function resume() {
  if (!app || !paused || document.hidden) return;
  app.ticker.start();
  paused = false;
}

function onVisibilityChange() {
  if (document.hidden) pause();
  else resume();
}

function onTierChange() {
  const enabled = pixiEnabled();
  const tier = getTier();

  if (enabled === lastPixiEnabled && tier === lastPixiTier) return;

  const prevEnabled = lastPixiEnabled;
  const prevTier = lastPixiTier;
  lastPixiEnabled = enabled;
  lastPixiTier = tier;

  if (!enabled) {
    teardownPixi();
    return;
  }

  if (!app) {
    boot().catch(() => {});
    return;
  }

  const godRaysChanged = isMobile()
    && ((prevTier === 'mid' && tier === 'high') || (prevTier === 'high' && tier === 'mid'));

  if (!prevEnabled || godRaysChanged) {
    teardownPixi();
    boot().catch(() => {});
  } else {
    syncParticleCount(currentIntensity);
  }
}

const api = {
  ready: false,
  setCardActive(active) {
    targetIntensity = active ? 1 : 0;
    document.body.classList.toggle('scene-card-active', active);
  },
  setParallax(x, y) {
    parallaxX = x;
    parallaxY = y;
  },
  pause,
  resume,
  destroy() {
    destroyed = true;
    teardownPixi();
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (tierChangeHandler) {
      window.removeEventListener('gobmobilechange', tierChangeHandler);
      tierChangeHandler = null;
    }
    if (imgLoadHandler) {
      const img = document.querySelector('#worldTree img');
      if (img) img.removeEventListener('load', imgLoadHandler);
      imgLoadHandler = null;
    }
    window.SceneAtmosphere = null;
  },
};

window.SceneAtmosphere = api;

visibilityHandler = onVisibilityChange;
document.addEventListener('visibilitychange', visibilityHandler);

tierChangeHandler = onTierChange;
window.addEventListener('gobmobilechange', tierChangeHandler);

function startWhenReady() {
  lastPixiEnabled = pixiEnabled();
  lastPixiTier = getTier();

  if (!pixiEnabled()) {
    api.ready = true;
    return;
  }

  const img = document.querySelector('#worldTree img');
  if (!img) {
    boot().catch(() => {});
    return;
  }
  if (img.complete) boot().catch(() => {});
  else {
    imgLoadHandler = () => boot().catch(() => {});
    img.addEventListener('load', imgLoadHandler, { once: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startWhenReady);
} else {
  startWhenReady();
}
