/**
 * Performance budget for 10–15k visitors on phones: fails (exit 1) if the build grows past it.
 * Run after `npm run build`:  npm run budget
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const KB = 1024;
const BUDGET = {
  initialKB: 120,      // HTML + CSS + JS needed before anything 3D (gzip)
  worldKB: 260,        // the lazy 3D chunk (gzip)
  modelDesktopKB: 1500,
  modelMobileKB: 750,
  posterKB: 120,       // each Lite-mode poster
};
const gz = (file) => gzipSync(readFileSync(file)).length;
const fails = [];
const check = (label, value, limit) => {
  const ok = value <= limit * KB;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)} ${(value / KB).toFixed(1).padStart(8)} KB  (budget ${limit} KB)`);
  if (!ok) fails.push(label);
};

const html = readFileSync('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
let initial = gzipSync(html).length;
const seen = new Set();
for (const a of assets) { if (seen.has(a)) continue; seen.add(a); initial += gz(join('dist', a)); }
// modules the entry imports statically are fetched up front too
for (const f of readdirSync('dist/_astro')) {
  if (!f.endsWith('.js') || seen.has('/_astro/' + f) || /^world\.|detect-gpu/.test(f)) continue;
  const used = [...seen].some((a) => a.endsWith('.js') && readFileSync(join('dist', a), 'utf8').includes(`./${f}`));
  if (used) { seen.add('/_astro/' + f); initial += gz(join('dist/_astro', f)); }
}
check('initial HTML+CSS+JS (home)', initial, BUDGET.initialKB);
const world = readdirSync('dist/_astro').find((f) => /^world\..*\.js$/.test(f));
if (world) check('3D world chunk (lazy)', gz(join('dist/_astro', world)), BUDGET.worldKB);
check('tree.glb (desktop)', statSync('dist/models/tree.glb').size, BUDGET.modelDesktopKB);
check('tree-lite.glb (phones)', statSync('dist/models/tree-lite.glb').size, BUDGET.modelMobileKB);
for (const p of readdirSync('dist/posters')) check(`poster ${p}`, statSync(join('dist/posters', p)).size, BUDGET.posterKB);

if (fails.length) { console.error(`\nOver budget: ${fails.join(', ')}`); process.exit(1); }
console.log('\nAll within budget.');
