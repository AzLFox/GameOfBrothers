const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, '../public/characters/world-tree.png');
const output = path.join(__dirname, '../public/characters/world-tree.png');

sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const { width, height, channels } = info;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      const isChecker =
        luminance > 145 &&
        saturation < 0.18 &&
        Math.abs(r - g) < 25 &&
        Math.abs(g - b) < 25;

      const isNearWhite = luminance > 235 && saturation < 0.12;

      if (isChecker || isNearWhite) {
        data[i + 3] = 0;
      }
    }

    return sharp(data, { raw: { width, height, channels } })
      .png()
      .toFile(output);
  })
  .then(() => console.log('Processed:', output))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
