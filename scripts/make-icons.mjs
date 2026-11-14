// Draws the logo and writes every image file the app and the stores need.
// The design and its rules are in docs/06-design/logo.md.
// Run with: npm run icons

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const images = join(root, 'assets', 'images');
const brand = join(root, 'assets', 'brand');

// Must match src/theme/tokens.ts.
const BLUE = '#1557B8';
const BLUE_ON_DARK = '#6EA8FF';
const AMBER = '#FFD166';
const WHITE = '#FFFFFF';
const DARK_GROUND = '#0F141B';

const SIZE = 1024;

// The pin: a round head that narrows to a point, with a round hole.
const HEAD = { x: 432, y: 400, r: 220 };
const TIP_Y = 780;
const HOLE_R = 86;
// The dot: beside the foot of the pin, close but not touching.
const DOT = { x: 717, y: 735, r: 95 };

function pinPath() {
  const drop = TIP_Y - HEAD.y;
  // Where the straight sides leave the head: the tangent points from the tip.
  const angle = Math.acos(HEAD.r / drop);
  const dx = HEAD.r * Math.sin(angle);
  const dy = HEAD.r * Math.cos(angle);
  const left = `${(HEAD.x - dx).toFixed(1)} ${(HEAD.y + dy).toFixed(1)}`;
  const right = `${(HEAD.x + dx).toFixed(1)} ${(HEAD.y + dy).toFixed(1)}`;
  const outline = `M ${HEAD.x} ${TIP_Y} L ${left} A ${HEAD.r} ${HEAD.r} 0 1 1 ${right} Z`;
  // The hole is a second ring in the same path; "evenodd" cuts it out, so it is truly see-through.
  const hole =
    `M ${HEAD.x - HOLE_R} ${HEAD.y} a ${HOLE_R} ${HOLE_R} 0 1 0 ${HOLE_R * 2} 0 ` +
    `a ${HOLE_R} ${HOLE_R} 0 1 0 ${-HOLE_R * 2} 0 Z`;
  return `${outline} ${hole}`;
}

/**
 * The whole picture as SVG text.
 * scale: how much of the square the mark fills (1 = its natural size).
 */
function logoSvg({ pin, dot, ground, scale = 1 }) {
  const centre = SIZE / 2;
  const transform = `translate(${centre} ${centre}) scale(${scale}) translate(${-centre} ${-centre})`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
    ground ? `  <rect width="${SIZE}" height="${SIZE}" fill="${ground}"/>` : '',
    `  <g transform="${transform}">`,
    // The thin outline in the pin's own colour rounds off the sharp tip.
    `    <path d="${pinPath()}" fill="${pin}" fill-rule="evenodd" stroke="${pin}" stroke-width="20" stroke-linejoin="round"/>`,
    `    <circle cx="${DOT.x}" cy="${DOT.y}" r="${DOT.r}" fill="${dot}"/>`,
    '  </g>',
    '</svg>',
    '',
  ]
    .filter((line, index, all) => line !== '' || index === all.length - 1)
    .join('\n');
}

async function png(file, options, size = SIZE) {
  await sharp(Buffer.from(logoSvg(options))).resize(size, size).png().toFile(join(images, file));
  console.log(`wrote assets/images/${file} (${size} px)`);
}

mkdirSync(images, { recursive: true });
mkdirSync(brand, { recursive: true });

writeFileSync(join(brand, 'logo-mark.svg'), logoSvg({ pin: BLUE, dot: AMBER }), 'utf8');
console.log('wrote assets/brand/logo-mark.svg');

// App icon: the ground runs edge to edge; the system cuts the corners.
await png('icon.png', { pin: WHITE, dot: AMBER, ground: BLUE, scale: 0.8 });
// Android adaptive icon: launchers crop to the middle two thirds, so the mark stays inside it.
await png('android-icon-foreground.png', { pin: WHITE, dot: AMBER, scale: 0.58 });
await png('android-icon-monochrome.png', { pin: WHITE, dot: WHITE, scale: 0.58 });
// Splash: the plugin sets the ground colour and scales this image down.
await png('splash-icon.png', { pin: WHITE, dot: AMBER, scale: 0.9 });
await png('splash-icon-dark.png', { pin: BLUE_ON_DARK, dot: AMBER, scale: 0.9 });
await png('favicon.png', { pin: WHITE, dot: AMBER, ground: BLUE, scale: 0.8 }, 48);
// Inside the app.
await png('logo-mark.png', { pin: BLUE, dot: AMBER }, 512);
await png('logo-mark-dark.png', { pin: BLUE_ON_DARK, dot: AMBER }, 512);

// Not written to the project: a look at the dark splash, for checking by eye.
export const previewDarkSplash = () => logoSvg({ pin: BLUE_ON_DARK, dot: AMBER, ground: DARK_GROUND, scale: 0.4 });
