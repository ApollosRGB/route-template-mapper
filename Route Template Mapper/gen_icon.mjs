/* Generate the app icon (concept B — map + route, indigo) as build/icon.png + build/icon.ico.
 * Run: node gen_icon.mjs   (requires sharp + png-to-ico, dev-only) */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect x="0" y="0" width="96" height="96" rx="20" fill="#3b5bdb"/>
  <g fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.5">
    <path d="M21 36 L39 27 L57 36 L75 27 V66 L57 75 L39 66 L21 75 Z"/>
    <path d="M39 27 V66"/><path d="M57 36 V75"/>
  </g>
  <path d="M32 63 L48 43 L64 57" fill="none" stroke="#fbbf24" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="32" cy="63" r="5.5" fill="#ffffff"/>
  <circle cx="48" cy="43" r="5.5" fill="#fbbf24"/>
  <circle cx="64" cy="57" r="5.5" fill="#ffffff"/>
</svg>`;

const buf = Buffer.from(svg);
const render = (size) => sharp(buf, { density: 384 }).resize(size, size).png().toBuffer();

await sharp(buf, { density: 384 }).resize(256, 256).png().toFile('build/icon.png');

const sizes = [256, 128, 64, 48, 32, 16];
const pngs = [];
for (const s of sizes) pngs.push(await render(s));
fs.writeFileSync('build/icon.ico', await pngToIco(pngs));

console.log('Wrote build/icon.png (256) and build/icon.ico (' + sizes.join(',') + ')');
