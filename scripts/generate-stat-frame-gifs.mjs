/**
 * Generates Steam-style stat tier frame overlays from authored SVG + edge animation.
 * Outputs: WebM (primary), GIF (fallback), PNG (poster).
 * Run: npm run generate:stat-frames
 */
import {
  mkdirSync, writeFileSync, rmSync, existsSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { createFrameRenderer } from './stat-frame-draw.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'img', 'ui');
const TMP_DIR = join(__dirname, '..', '.tmp', 'stat-frames');

const W = 256;
const H = 280;

const TIERS = [
  { tier: 1, frames: 24, delay: 80, fps: 24 },
  { tier: 2, frames: 30, delay: 66, fps: 30 },
  { tier: 3, frames: 36, delay: 66, fps: 30 },
  { tier: 4, frames: 30, delay: 80, fps: 24 },
];

mkdirSync(OUT_DIR, { recursive: true });

function findFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return 'ffmpeg';
  } catch {
    const local = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
    if (existsSync(local)) return `"${local}"`;
    return null;
  }
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) console.warn('ffmpeg not found — WebM will be skipped');

function canvasToRgba(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function encodeGif(frames, width, height, delay) {
  const gif = GIFEncoder();
  frames.forEach((rgba) => {
    const palette = quantize(rgba, 256, { format: 'rgba4444' });
    const index = applyPalette(rgba, palette, 'rgba4444');
    const transparentIndex = palette.findIndex(
      (c) => c[0] === 0 && c[1] === 0 && c[2] === 0 && c[3] === 0,
    );
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0,
      ...(transparentIndex >= 0 ? { transparent: true, transparentIndex } : {}),
    });
  });
  gif.finish();
  return Buffer.from(gif.bytes());
}

function encodeWebm(pngDir, outPath, fps) {
  if (!ffmpeg) return false;
  const input = join(pngDir, 'frame_%04d.png').replace(/\\/g, '/');
  const output = outPath.replace(/\\/g, '/');
  try {
    execSync(
      `${ffmpeg} -y -framerate ${fps} -i "${input}" `
      + '-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 32 -auto-alt-ref 0 '
      + `"${output}"`,
      { stdio: 'pipe' },
    );
    return true;
  } catch (e) {
    console.warn(`WebM encode failed for ${outPath}:`, e.message?.slice(0, 120));
    return false;
  }
}

for (const { tier, frames: frameCount, delay, fps } of TIERS) {
  const svgPath = join(OUT_DIR, `stat-overlay-t${tier}.svg`);
  const frameImage = await loadImage(svgPath);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const draw = createFrameRenderer(tier, W, H, frameImage);

  const tierTmp = join(TMP_DIR, `t${tier}`);
  rmSync(tierTmp, { recursive: true, force: true });
  mkdirSync(tierTmp, { recursive: true });

  const rgbaFrames = [];
  for (let f = 0; f < frameCount; f++) {
    draw(ctx, f);
    const pngBuf = canvas.toBuffer('image/png');
    writeFileSync(join(tierTmp, `frame_${String(f).padStart(4, '0')}.png`), pngBuf);
    rgbaFrames.push(canvasToRgba(canvas));
  }

  const webmPath = join(OUT_DIR, `stat-frame-t${tier}.webm`);
  if (encodeWebm(tierTmp, webmPath, fps)) {
    console.log(`Wrote ${webmPath}`);
  }

  const gifPath = join(OUT_DIR, `stat-frame-t${tier}.gif`);
  writeFileSync(gifPath, encodeGif(rgbaFrames, W, H, delay));
  console.log(`Wrote ${gifPath} (${frameCount} frames, ${W}×${H})`);

  draw(ctx, 0);
  const pngPath = join(OUT_DIR, `stat-frame-t${tier}.png`);
  writeFileSync(pngPath, canvas.toBuffer('image/png'));
  console.log(`Wrote ${pngPath}`);
}

rmSync(TMP_DIR, { recursive: true, force: true });
console.log('Done.');
