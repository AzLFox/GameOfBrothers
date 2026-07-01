/**
 * Import Steam profile frame (APNG/WebM) → resized assets for stat cells.
 *
 * Usage:
 *   npm run import:steam-frame -- --tier 1 --url "https://shared.fastly.steamstatic.com/..."
 *
 * Steam often serves animated frames as .png that are actually APNG (animated PNG).
 * This script downloads, scales to stat-cell size, and exports WebM + poster PNG.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseArgs } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'img', 'ui');
const TMP = join(__dirname, '..', '.tmp', 'steam-import');

// Steam 224×224 frames have ~18px transparent margin; crop so ring = canvas edge.
// Stat slot 128×128 @1x → export 256×256 @2x after ring crop.
const STEAM_SIZE = 224;
const RING_INSET = 18;
const CROP_SIZE = STEAM_SIZE - RING_INSET * 2;
const TARGET_W = 256;
const TARGET_H = 256;

const { values } = parseArgs({
  options: {
    tier: { type: 'string', short: 't' },
    url: { type: 'string', short: 'u' },
    width: { type: 'string', default: String(TARGET_W) },
    height: { type: 'string', default: String(TARGET_H) },
    apng: { type: 'boolean', default: false },
  },
});

const tier = values.tier;
const url = values.url;
const outW = parseInt(values.width, 10);
const outH = parseInt(values.height, 10);

if (!tier || !url) {
  console.error('Usage: npm run import:steam-frame -- --tier 1 --url "https://..."');
  process.exit(1);
}

function findFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return 'ffmpeg';
  } catch {
    const local = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
    if (existsSync(local)) return `"${local}"`;
    throw new Error('ffmpeg not found — install: winget install Gyan.FFmpeg');
  }
}

const ffmpeg = findFfmpeg();

mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log(`Downloading: ${url}`);
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

const buf = Buffer.from(await res.arrayBuffer());
const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'png';
const srcPath = join(TMP, `source.${ext}`);
writeFileSync(srcPath, buf);

const isApng = ext === 'png' && buf.includes(Buffer.from('acTL'));
const isWebm = ext === 'webm';

console.log(`Format: ${isApng ? 'APNG (animated PNG)' : isWebm ? 'WebM' : ext.toUpperCase()}`);
if (isApng) {
  console.log('Note: Steam uses .png extension but the file contains animation (APNG).');
}

const base = `stat-frame-t${tier}`;
const apngOut = join(OUT_DIR, `${base}.png`);
const posterOut = join(OUT_DIR, `${base}-poster.png`);
const webmOut = join(OUT_DIR, `${base}.webm`);

// Crop outer margin → gold ring on edge, then scale to slot @2x
const vf = `crop=${CROP_SIZE}:${CROP_SIZE}:${RING_INSET}:${RING_INSET},scale=${outW}:${outH}`;
console.log(`Export: crop ${CROP_SIZE}×${CROP_SIZE} (inset ${RING_INSET}) → ${outW}×${outH}`);

if (values.apng) {
  execSync(
    `${ffmpeg} -y -i "${srcPath.replace(/\\/g, '/')}" -vf "${vf}" -plays 0 -f apng "${apngOut.replace(/\\/g, '/')}"`,
    { stdio: 'inherit' },
  );
  console.log(`Wrote ${apngOut} (large — use WebM in production)`);
}

// Poster = first frame
execSync(
  `${ffmpeg} -y -i "${srcPath.replace(/\\/g, '/')}" -vf "${vf}" -frames:v 1 -update 1 `
  + `"${posterOut.replace(/\\/g, '/')}"`,
  { stdio: 'inherit' },
);
console.log(`Wrote ${posterOut}`);

// WebM VP9 + alpha (best compatibility, like Steam client)
execSync(
  `${ffmpeg} -y -i "${srcPath.replace(/\\/g, '/')}" -vf "${vf}" `
  + `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -auto-alt-ref 0 `
  + `"${webmOut.replace(/\\/g, '/')}"`,
  { stdio: 'pipe' },
);
console.log(`Wrote ${webmOut}`);

rmSync(TMP, { recursive: true, force: true });
console.log(`\nDone. Tier ${tier} → use in game as /img/ui/${base}.webm`);
