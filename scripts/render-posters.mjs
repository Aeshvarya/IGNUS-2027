/**
 * Renders Lite-mode posters from the real 3D scene into public/posters/ (WebP).
 * Needs the site running:  npm run build && npm run preview   (then, in another terminal)
 *                          node scripts/render-posters.mjs [baseUrl]
 * Uses Playwright's Chromium. Re-run whenever the world's look changes.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const BASE = process.argv[2] || 'http://localhost:4321';
const OUT = 'public/posters';
const SCENES = [['ordinary', 0.12], ['rift', 2.62], ['shift', 4.15], ['circle', 5.92]];
const SIZES = [['wide', 1600, 1000, 72], ['tall', 760, 1350, 68]];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
for (const [size, w, h, q] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?quality=high&governor=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#loader')?.classList.contains('done'), null, { timeout: 180000 });
  await page.addStyleTag({ content: 'main, .hud-top, .hud-realm, #loader, .skip { visibility: hidden !important; }' });
  for (const [name, u] of SCENES) {
    await page.evaluate((u) => {
      const vh = innerHeight, maxS = Math.max(1, document.documentElement.scrollHeight - vh);
      const top = (el) => el.getBoundingClientRect().top + scrollY, mid = (el) => top(el) + el.offsetHeight / 2 - vh / 2;
      const rift = document.querySelector('#rift');
      const a = [0, mid(document.querySelector('#theme')), top(rift), top(rift) + (rift.offsetHeight - vh) / 2, mid(document.querySelector('#avatars')), mid(document.querySelector('#quests')), maxS];
      const i = Math.floor(u), f = u - i; window.scrollTo(0, i >= 6 ? a[6] : a[i] + (a[i + 1] - a[i]) * f);
    }, u);
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__ignus?.settle());
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__ignus?.settle());
    const png = await page.screenshot({ timeout: 300000 });
    const file = `${OUT}/${name}-${size}.webp`;
    // a slight blur removes the halftone/grain noise that WebP spends most of its bytes on
    const soft = name === 'shift' || name === 'circle';
    const info = await sharp(png).blur(soft ? 0.9 : 0.3).webp({ quality: soft ? 58 : q, effort: 6 }).toFile(file);
    console.log(`${file}  ${(info.size / 1024).toFixed(0)} KB`);
  }
  await ctx.close();
}
await browser.close();
