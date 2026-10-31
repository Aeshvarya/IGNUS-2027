/**
 * Smoke + accessibility test for every page (Lite mode, so it runs fast anywhere).
 * Needs the site running (npm run build && npm run preview) and Playwright's Chromium.
 *   node scripts/smoke.mjs [baseUrl]
 * Fails on: console errors, page errors, horizontal overflow, serious/critical axe violations.
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.argv[2] || 'http://localhost:4321';
const events = readdirSync('src/content/events').filter((f) => f.endsWith('.md')).map((f) => `/events/${f.replace(/\.md$/, '')}/`);
const PAGES = ['/', '/events/', events[0], '/schedule/', '/pronites/', '/passes/', '/sponsors/', '/team/', '/faq/'];
const problems = [];

const browser = await chromium.launch();
for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${tag}] ${page.url()} console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${tag}] ${page.url()} pageerror: ${e.message}`));
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}?quality=lite`, { waitUntil: 'networkidle' });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) problems.push(`[${tag}] ${p} overflows horizontally by ${over}px`);
    await page.addScriptTag({ content: AXE });
    const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') })));
    for (const v of res) problems.push(`[${tag}] ${p} axe ${v.impact} ${v.id} ×${v.n} e.g. ${v.sample}`);
    console.log(`${tag.padEnd(7)} ${p.padEnd(32)} ${res.length ? res.length + ' axe issue(s)' : 'ok'}`);
  }
  await ctx.close();
}
await browser.close();
if (problems.length) { console.error('\n' + problems.join('\n')); process.exit(1); }
console.log('\nAll pages pass.');
