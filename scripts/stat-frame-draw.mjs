/**
 * Steam-style stat frame animation — authored SVG base + edge glow/particles.
 */

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = {
  teal: [94, 240, 200],
  gold: [240, 217, 138],
  goldLight: [255, 248, 220],
  goldDeep: [212, 179, 106],
  white: [255, 252, 240],
};

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** Punch transparent hole in center (Steam avatar cutout). */
export function centerClear(ctx, w, h, strength = 0.4) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * strength);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.92)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function clipEdgeRing(ctx, w, h, innerW = 0.48, innerH = 0.5) {
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  ctx.rect(cx - (w * innerW) / 2, cy - (h * innerH) / 2, w * innerW, h * innerH);
  ctx.clip('evenodd');
}

function cornerGlow(ctx, x, y, rgb, r, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(rgb, alpha));
  g.addColorStop(0.6, rgba(rgb, alpha * 0.25));
  g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function gemPulse(ctx, x, y, t, phase, rgb, baseR) {
  const p = 0.55 + Math.sin(t * 0.11 + phase) * 0.45;
  cornerGlow(ctx, x, y, rgb, baseR * (0.9 + p * 0.5), 0.22 * p);
}

function edgeSweep(ctx, w, h, t, rgb, band = 28) {
  const pos = ((t * 3.2) % (w + band * 2)) - band;
  const g = ctx.createLinearGradient(pos - band, 0, pos + band, 0);
  g.addColorStop(0, rgba(rgb, 0));
  g.addColorStop(0.5, rgba(rgb, 0.35));
  g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function createOrbiters(count, w, h, rand) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      angle: rand() * Math.PI * 2,
      speed: 0.025 + rand() * 0.04,
      size: 0.8 + rand() * 1.6,
      gold: rand() > 0.35,
    });
  }
  return items;
}

function drawOrbiterRing(ctx, w, h, items, t, rand, rx, ry) {
  const cx = w / 2;
  const cy = h / 2;
  items.forEach((p) => {
    p.angle += p.speed;
    const x = cx + Math.cos(p.angle) * rx;
    const y = cy + Math.sin(p.angle) * ry;
    const rgb = p.gold ? C.gold : C.teal;
    const a = 0.35 + Math.sin(t * 0.08 + p.angle) * 0.2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = rgba(rgb, 0.6);
    ctx.fillStyle = rgba(rgb, a);
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
    if (rand() < 0.04) {
      ctx.strokeStyle = rgba(C.white, a * 0.5);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;
}

const GEM_SPOTS = {
  1: [[7, 7], [113, 7], [7, 125], [113, 125]],
  2: [[9, 9], [111, 9], [9, 123], [111, 123]],
  3: [[15, 11], [111, 11], [15, 121], [111, 121]],
  4: [[13, 13], [107, 13], [13, 119], [107, 119]],
};

export function createFrameRenderer(tier, w, h, frameImage) {
  const rand = mulberry32((tier + 1) * 7919);
  const orbiters = tier >= 3 ? createOrbiters(tier === 4 ? 14 : 9, w, h, rand) : [];
  const sx = w / 120;
  const sy = h / 132;
  const gems = (GEM_SPOTS[tier] || []).map(([x, y]) => [x * sx, y * sy]);

  const orbitRx = w * 0.46;
  const orbitRy = h * 0.47;

  function drawTier1(ctx, t) {
    const pulse = 0.6 + Math.sin(t * 0.09) * 0.25;
    gems.forEach(([x, y], i) => gemPulse(ctx, x, y, t, i * 1.2, C.teal, 14));
    cornerGlow(ctx, 4, 4, C.teal, 20, 0.1 * pulse);
    cornerGlow(ctx, w - 4, h - 4, C.teal, 20, 0.1 * pulse);
    edgeSweep(ctx, w, h, t, C.teal, 20);
    ctx.strokeStyle = rgba(C.teal, 0.12 + pulse * 0.08);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  function drawTier2(ctx, t) {
    gems.forEach(([x, y], i) => gemPulse(ctx, x, y, t, i, C.gold, 16));
    edgeSweep(ctx, w, h, t, C.gold, 24);
    edgeSweep(ctx, w, h, t + 40, C.gold, 16);
    const pulse = 0.65 + Math.sin(t * 0.07) * 0.2;
    [[4, 4], [w - 4, 4], [4, h - 4], [w - 4, h - 4]].forEach(([x, y], i) => {
      cornerGlow(ctx, x, y, C.gold, 18, 0.12 * pulse);
    });
  }

  function drawTier3(ctx, t) {
    gems.forEach(([x, y], i) => {
      gemPulse(ctx, x, y, t, i, C.teal, 18);
      gemPulse(ctx, x, y, t + 2, i, C.gold, 12);
    });
    drawOrbiterRing(ctx, w, h, orbiters, t, rand, orbitRx, orbitRy);
    edgeSweep(ctx, w, h, t * 0.8, C.goldLight, 30);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(C.gold, 0.15 + Math.sin(t * 0.06) * 0.06);
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTier4(ctx, t) {
    gems.forEach(([x, y], i) => {
      gemPulse(ctx, x, y, t, i, C.goldLight, 22);
      gemPulse(ctx, x, y, t + 1.5, i + 2, C.teal, 14);
    });

    const flick = 0.75 + Math.sin(t * 0.1) * 0.2;
    const drawSideWisp = (left) => {
      const x0 = left ? 0 : w;
      const x1 = left ? w * 0.28 : w * 0.72;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      if (left) {
        g.addColorStop(0, rgba(C.white, 0.28 * flick));
        g.addColorStop(0.5, rgba(C.gold, 0.18 * flick));
        g.addColorStop(1, rgba(C.teal, 0));
      } else {
        g.addColorStop(0, rgba(C.teal, 0));
        g.addColorStop(0.5, rgba(C.gold, 0.18 * flick));
        g.addColorStop(1, rgba(C.white, 0.28 * flick));
      }
      ctx.fillStyle = g;
      ctx.fillRect(left ? 0 : w * 0.72, 0, w * 0.28, h);
    };
    drawSideWisp(true);
    drawSideWisp(false);

    drawOrbiterRing(ctx, w, h, orbiters, t, rand, orbitRx, orbitRy);
    edgeSweep(ctx, w, h, t * 1.1, C.goldLight, 34);

    [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]].forEach(([x, y], i) => {
      const sc = 0.5 + Math.sin(t * 0.12 + i * 1.5) * 0.5;
      cornerGlow(ctx, x, y, i % 2 ? C.teal : C.goldLight, 12, 0.2 * sc);
    });
  }

  return function drawFrame(ctx, frameIndex) {
    ctx.clearRect(0, 0, w, h);

    // Authored ornate frame (static art layer)
    ctx.drawImage(frameImage, 0, 0, w, h);

    // Animated glow / particles (edge only)
    ctx.save();
    clipEdgeRing(ctx, w, h);
    switch (tier) {
      case 1: drawTier1(ctx, frameIndex); break;
      case 2: drawTier2(ctx, frameIndex); break;
      case 3: drawTier3(ctx, frameIndex); break;
      case 4: drawTier4(ctx, frameIndex); break;
      default: break;
    }
    ctx.restore();

    // Transparent center cutout like Steam profile frame
    centerClear(ctx, w, h, tier <= 2 ? 0.34 : 0.36);
  };
}
