/**
 * Pack multiple PNGs into a single favicon.ico (PNG-compressed ICO entries).
 *
 * Why: the shipped favicon.ico contained ONLY a 16x16 image, so Google's
 * favicon service (used by the Claude Connector Directory at sz=64) had
 * nothing >=48px and fell back to the generic globe. ICO has supported
 * embedded PNG entries since Vista; every modern parser (incl. Google's
 * crawler) reads them.
 *
 * Usage: node scripts/build-favicon-ico.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(__dirname, '..', 'packages', 'web', 'public');

// size 0 in the ICO directory means 256; entries must be <= 256px
const entries = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'icon-192.png', size: 192 },
];

const pngs = entries.map((e) => ({ ...e, data: readFileSync(path.join(PUB, e.file)) }));

// Verify each file really is a PNG with the expected dimensions
for (const p of pngs) {
  if (p.data.readUInt32BE(0) !== 0x89504e47) throw new Error(`${p.file}: not a PNG`);
  const w = p.data.readUInt32BE(16);
  const h = p.data.readUInt32BE(20);
  if (w !== p.size || h !== p.size) throw new Error(`${p.file}: expected ${p.size}px, got ${w}x${h}`);
}

const HEADER = 6;
const DIRENTRY = 16;
let offset = HEADER + DIRENTRY * pngs.length;

const header = Buffer.alloc(HEADER);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4);

const dir = Buffer.alloc(DIRENTRY * pngs.length);
pngs.forEach((p, i) => {
  const o = i * DIRENTRY;
  dir.writeUInt8(p.size >= 256 ? 0 : p.size, o); // width
  dir.writeUInt8(p.size >= 256 ? 0 : p.size, o + 1); // height
  dir.writeUInt8(0, o + 2); // palette
  dir.writeUInt8(0, o + 3); // reserved
  dir.writeUInt16LE(1, o + 4); // planes
  dir.writeUInt16LE(32, o + 6); // bpp
  dir.writeUInt32LE(p.data.length, o + 8); // bytes
  dir.writeUInt32LE(offset, o + 12); // offset
  offset += p.data.length;
});

const out = Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
const dest = path.join(PUB, 'favicon.ico');
writeFileSync(dest, out);
console.log(`Wrote ${dest}: ${out.length} bytes, ${pngs.length} sizes (${pngs.map((p) => p.size).join(', ')})`);
