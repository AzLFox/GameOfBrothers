/**
 * Убирает светлый/шахматный фон у PNG-монет, сохраняет альфа.
 * Запуск: node scripts/process-coin-images.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(__dirname, '..', 'public', 'img', 'ui');
const COINS = ['coin-gold', 'coin-silver', 'coin-bronze'];
const POUCHES = ['coin-pouch-closed', 'coin-pouch-open'];

function isDarkBackground(r, g, b, a) {
  if (a < 8) return true;
  const lum = luminance(r, g, b);
  if (lum < 0.06) return true;
  if (lum < 0.12 && Math.max(r, g, b) - Math.min(r, g, b) < 18) return true;
  return false;
}

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isBackground(r, g, b, a) {
  if (a < 8) return true;
  const lum = luminance(r, g, b);
  const sat = saturation(r, g, b);
  if (lum > 0.82 && sat < 0.12) return true;
  if (lum > 0.68 && sat < 0.08) return true;
  const avg = (r + g + b) / 3;
  if (Math.abs(r - avg) < 12 && Math.abs(g - avg) < 12 && Math.abs(b - avg) < 12 && lum > 0.55) {
    return true;
  }
  return false;
}

async function processCoin(name) {
  const input = path.join(UI_DIR, `${name}.png`);
  if (!fs.existsSync(input)) {
    console.warn(`skip ${name}: file not found`);
    return;
  }

  const img = await loadImage(input);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (isBackground(r, g, b, a)) {
      data[i + 3] = 0;
    }
  }

  // лёгкое размытие альфы по краям монеты
  const alpha = new Uint8ClampedArray(width * height);
  for (let p = 0; p < width * height; p++) alpha[p] = data[p * 4 + 3];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      let transparentNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (alpha[(y + dy) * width + (x + dx)] === 0) transparentNeighbors++;
        }
      }
      if (transparentNeighbors >= 4 && isBackground(data[i], data[i + 1], data[i + 2], 255)) {
        data[i + 3] = Math.max(0, data[i + 3] - 80);
      }
    }
  }

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  const out = path.join(UI_DIR, `${name}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`processed ${name}.png`);
}

async function processPouch(name) {
  const input = path.join(UI_DIR, `${name}.png`);
  if (!fs.existsSync(input)) {
    console.warn(`skip ${name}: file not found`);
    return;
  }

  const img = await loadImage(input);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (isDarkBackground(r, g, b, a)) {
      data[i + 3] = 0;
    } else if (luminance(r, g, b) < 0.18) {
      const fade = Math.round(((luminance(r, g, b) - 0.06) / 0.12) * 255);
      data[i + 3] = Math.min(a, Math.max(0, fade));
    }
  }

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  fs.writeFileSync(input, canvas.toBuffer('image/png'));
  console.log(`processed ${name}.png (dark bg removed)`);
}

for (const name of COINS) {
  await processCoin(name);
}

for (const name of POUCHES) {
  await processPouch(name);
}
