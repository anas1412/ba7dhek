// Draws the logo and writes every image file the app and the stores need.
// The design and its rules are in docs/06-design/logo.md.
// Run with: npm run icons

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as fontkit from 'fontkit';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const images = join(root, 'assets', 'images');
const brand = join(root, 'assets', 'brand');

// Must match src/theme/tokens.ts.
const BLUE = '#1557B8';
const BLUE_ON_DARK = '#6EA8FF';
const AMBER = '#FFD166';
const WHITE = '#FFFFFF';
const INK = '#14202E';

const SIZE = 1024;

// The letter comes from the app's own typeface, so the logo and the interface match.
const font = fontkit.openSync(
  join(root, 'node_modules', '@expo-google-fonts', 'readex-pro', '700Bold', 'ReadexPro_700Bold.ttf'),
);

const SVG_COMMAND = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' };

/** A glyph as its separate closed shapes, each with its extent. Font units, y pointing up. */
function shapesOf(glyph) {
  const shapes = [];
  let current;
  for (const { command, args } of glyph.path.commands) {
    if (command === 'moveTo') {
      current = { d: [], xs: [], ys: [] };
      shapes.push(current);
    }
    current.d.push(SVG_COMMAND[command] + args.map((n) => Number(n.toFixed(2))).join(' '));
    for (let i = 0; i < args.length; i += 2) {
      current.xs.push(args[i]);
      current.ys.push(args[i + 1]);
    }
  }
  return shapes.map((s) => ({
    d: s.d.join(' '),
    minX: Math.min(...s.xs),
    maxX: Math.max(...s.xs),
    minY: Math.min(...s.ys),
    maxY: Math.max(...s.ys),
  }));
}

function extent(boxes) {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

/** Wraps font-unit shapes so `box` sits centred on (cx, cy) with its longer side `size` pixels long. */
function fit(shapes, box, size, cx, cy) {
  const scale = size / Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;
  // The negative vertical scale turns the font's y-up into the image's y-down.
  return `<g transform="translate(${cx} ${cy}) scale(${scale} ${-scale}) translate(${-midX} ${-midY})">${shapes}</g>`;
}

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`;
}

/** A word set in the typeface, shaped properly (Arabic letters joined), as font-unit shapes. */
function wordShapes(text, colour, dotColour = colour) {
  const run = font.layout(text);
  const parts = [];
  const boxes = [];
  let x = 0;
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const dx = x + position.xOffset;
    const move = `transform="translate(${dx} ${position.yOffset})"`;
    const shapes = shapesOf(glyph);
    // Only the ب has its dot picked out, to echo the mark. Every other letter is drawn whole,
    // which keeps the holes in letters such as "B" and "d" open.
    const isBeh = glyph.codePoints.includes(0x0628);
    const body = isBeh ? shapes.filter((shape) => shape.maxY >= 0) : shapes;
    const below = isBeh ? shapes.filter((shape) => shape.maxY < 0) : [];
    if (body.length) parts.push(`<path ${move} d="${body.map((shape) => shape.d).join(' ')}" fill="${colour}"/>`);
    if (below.length) parts.push(`<path ${move} d="${below.map((shape) => shape.d).join(' ')}" fill="${dotColour}"/>`);
    for (const shape of shapes) boxes.push({ ...shape, minX: shape.minX + dx, maxX: shape.maxX + dx });
    x += position.xAdvance;
  });
  return { shapes: parts.join(''), box: extent(boxes) };
}

/**
 * The mark is the name itself, بحذاك, in the app's typeface. The dot under the
 * ب is picked out in amber, the colour the app keeps for distance.
 */
const NAME = 'بحذاك';
const MARK_BOX = wordShapes(NAME, WHITE).box;

/**
 * The mark in a square.
 * fill: how much of the square's width the word takes.
 * ground: a colour behind it; corner: rounded corners for the ground, as a share of the side.
 */
function markSvg({ letter, dot, ground, corner = 0, fill }) {
  const back = ground
    ? `<rect width="${SIZE}" height="${SIZE}" rx="${SIZE * corner}" fill="${ground}"/>`
    : '';
  return svg(SIZE, SIZE, back + fit(wordShapes(NAME, letter, dot).shapes, MARK_BOX, SIZE * fill, SIZE / 2, SIZE / 2));
}

/** The tile with the Latin spelling beside it, for a store listing or a presentation. */
function lockupSvg() {
  const height = 900;
  const tile = 620;
  const left = 140;
  const top = (height - tile) / 2;
  const latin = wordShapes('Ba7dhek', INK);
  const textLeft = left + tile + 120;
  const scale = 0.3;
  const width = Math.ceil(textLeft + (latin.box.maxX - latin.box.minX) * scale + left);
  // Centred on the tile's middle line by the height of the capital letters.
  const baseline = height / 2 + (latin.box.maxY * scale) / 2;
  return svg(
    width,
    height,
    `<rect x="${left}" y="${top}" width="${tile}" height="${tile}" rx="${tile * 0.225}" fill="${BLUE}"/>` +
      fit(wordShapes(NAME, WHITE, AMBER).shapes, MARK_BOX, tile * 0.72, left + tile / 2, height / 2) +
      `<g transform="translate(${textLeft - latin.box.minX * scale} ${baseline}) scale(${scale} ${-scale})">${latin.shapes}</g>`,
  );
}

async function png(file, source, size = SIZE, folder = images) {
  const image = sharp(Buffer.from(source));
  await (size ? image.resize(size, size) : image).png().toFile(join(folder, file));
  console.log(`wrote ${folder === images ? 'assets/images' : 'assets/brand'}/${file}`);
}

mkdirSync(images, { recursive: true });
mkdirSync(brand, { recursive: true });

const tileMark = markSvg({ letter: WHITE, dot: AMBER, ground: BLUE, corner: 0.225, fill: 0.72 });

// App icon: the ground runs edge to edge; the system cuts the corners.
await png('icon.png', markSvg({ letter: WHITE, dot: AMBER, ground: BLUE, fill: 0.7 }));
// Android adaptive icon: launchers crop to a circle two thirds wide, so the word stays inside it.
await png('android-icon-foreground.png', markSvg({ letter: WHITE, dot: AMBER, fill: 0.52 }));
await png('android-icon-monochrome.png', markSvg({ letter: WHITE, dot: WHITE, fill: 0.52 }));
// Splash: the plugin sets the ground colour and scales this image down.
await png('splash-icon.png', markSvg({ letter: WHITE, dot: AMBER, fill: 0.94 }));
await png('splash-icon-dark.png', markSvg({ letter: BLUE_ON_DARK, dot: AMBER, fill: 0.94 }));
await png('favicon.png', tileMark, 48);
// Inside the app: the mark in its blue tile, which sits well on the light and the dark ground.
await png('logo-mark.png', tileMark, 512);

// Android's status bar shows a small one-colour shape, where a five-letter word would be a smudge.
// So this one icon is the first letter alone: white on nothing, tinted brand blue by the system.
{
  const letter = shapesOf(font.glyphForCodePoint(0x0628));
  const body = `<path d="${letter.map((shape) => shape.d).join(' ')}" fill="${WHITE}"/>`;
  await png('notification-icon.png', svg(SIZE, SIZE, fit(body, extent(letter), SIZE * 0.84, SIZE / 2, SIZE / 2)), 96);
}

// For print, a store listing or a slide.
writeFileSync(join(brand, 'logo-mark.svg'), tileMark, 'utf8');
console.log('wrote assets/brand/logo-mark.svg');
writeFileSync(join(brand, 'logo-lockup.svg'), lockupSvg(), 'utf8');
console.log('wrote assets/brand/logo-lockup.svg');
await png('logo-lockup.png', lockupSvg(), null, brand);
