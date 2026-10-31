import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { state, applyRootState, setLite, avatarColor, isLite } from './state.js';
import { detectTier, qualityFor } from './quality.js';
import { mountHome } from './pages/home.js';
import { mountGeneric } from './pages/generic.js';

gsap.registerPlugin(ScrollTrigger);

let booted = false;
let lenis = null;
let controller = null;
let uS = null;
let tAcc = 0;
let worldLoading = null;

/* Ambient rendering for content pages: ~30 fps, frozen after a few idle seconds. */
const IDLE_FREEZE_S = 6;
let idleFor = 0;
let frameParity = 0;
const wake = () => { idleFor = 0; };

/** Fonts the world paints into canvas textures (graffiti, runes, labels). */
async function fontsReady() {
  if (!document.fonts?.load) return;
  const loads = [
    document.fonts.load('400 80px "Dela Gothic One"', 'IGNUS'),
    document.fonts.load('400 80px "Rubik Wet Paint"', 'SHIFT'),
    document.fonts.load('400 80px "Tiro Devanagari Hindi"', 'भावांतर अइग'),
  ];
  await Promise.race([Promise.all(loads).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
}

function hideLoader() { document.getElementById('loader')?.classList.add('done'); }

/** Lazy-loads three.js and builds the world. Never runs while Lite mode is active. */
function ensureWorld() {
  if (state.world || worldLoading || isLite()) return worldLoading;
  const loaderText = document.getElementById('loaderText');
  worldLoading = (async () => {
    const [{ createWorld }] = await Promise.all([import('../world/index.js'), fontsReady()]);
    try {
      const tier = state.tier === 'lite' ? 'low' : state.tier; // forced 3D on a "lite" device
      const world = await createWorld({
        canvas: document.getElementById('world'),
        quality: qualityFor(tier),
        reduceMotion: state.reduceMotion,
        onProgress: (f) => { if (loaderText) loaderText.textContent = 'Opening the rift · ' + Math.round(f * 100) + '%'; },
      });
      const c = avatarColor(); if (c) world.setAccent(c);
      state.world = world;
    } catch (e) {
      console.error(e);
      state.noWebgl = true;
      applyRootState();
    }
    wake();
    requestAnimationFrame(() => requestAnimationFrame(hideLoader));
  })();
  return worldLoading;
}

function mountPage() {
  controller?.destroy();
  const page = document.body.dataset.page || 'home';
  controller = page === 'home' ? mountHome(app) : mountGeneric(app, page);
  wake();
  ScrollTrigger.refresh();
}

/* One clock for everything: GSAP's ticker drives Lenis, the story position and the world. */
function tick(time, deltaMs) {
  const dt = Math.min(0.05, Math.max(0, deltaMs / 1000));
  tAcc += dt;
  lenis?.raf(time * 1000);
  if (!controller) return;
  const uT = controller.targetU();
  if (uS === null) uS = uT;
  const moving = Math.abs(uT - uS) > 1e-3;
  uS += (uT - uS) * (1 - Math.exp(-dt * (state.reduceMotion ? 14 : 3.4)));
  if (Math.abs(uT - uS) < 1e-4) uS = uT;
  let dist = Math.max(0, 40 * (1 - uS / 3));

  if (state.world && !isLite()) {
    const ambient = controller.ambient && !moving;
    idleFor = moving ? 0 : idleFor + dt;
    if (!ambient) {
      state.world.update(uS, dt, tAcc, true);
    } else if (idleFor < IDLE_FREEZE_S && (frameParity ^= 1)) {
      state.world.update(uS, dt * 2, tAcc, false); // half rate, not measured by the governor
    }
    dist = state.world.dist();
  }
  controller.frame(uS, dist);
}

const app = {
  scrollTo(y) {
    if (lenis) lenis.scrollTo(y, { immediate: state.reduceMotion });
    else scrollTo({ top: y, behavior: state.reduceMotion ? 'auto' : 'smooth' });
  },
};

function openMenu() { const d = document.getElementById('pause'); if (d && !d.open) { d.showModal(); lenis?.stop(); } }
function closeMenu() { document.getElementById('pause')?.close(); }

function bindGlobalUI() {
  // Delegated, so it survives router swaps of <body>.
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest('[data-menu-open]')) { openMenu(); return; }
    if (t.closest('[data-menu-close]') || t.closest('[data-menu-link]')) { closeMenu(); return; }
    if (t.closest('[data-lite-toggle]')) {
      setLite(!isLite());
      if (!isLite()) ensureWorld();
      return;
    }
    const pause = t.closest('dialog.pause');
    if (pause && t === pause) closeMenu(); // click on the backdrop
  });
  document.addEventListener('close', (e) => { if (e.target instanceof HTMLDialogElement) lenis?.start(); }, true);
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) addEventListener(ev, wake, { passive: true });
}

export function boot() {
  if (booted) return;
  booted = true;

  if (!state.reduceMotion && !state.coarse) {
    lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
  }
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  bindGlobalUI();
  applyRootState();
  mountPage();

  document.addEventListener('astro:before-swap', () => { controller?.destroy(); controller = null; ScrollTrigger.getAll().forEach((st) => st.kill()); });
  document.addEventListener('astro:after-swap', () => { applyRootState(); lenis?.scrollTo(0, { immediate: true, force: true }); lenis?.resize(); });
  document.addEventListener('astro:page-load', () => { if (!controller) mountPage(); });
  addEventListener('resize', () => { state.world?.resize(); wake(); });

  setTimeout(hideLoader, 25000); // failsafe
  detectTier().then((tier) => {
    state.tier = tier;
    document.documentElement.dataset.tier = tier;
    applyRootState();
    if (isLite()) hideLoader(); else ensureWorld();
  });

  // QA hook: window.__ignus.stats() in the console shows tier, pixel ratio and what the governor changed.
  window.__ignus = { stats: () => ({ tier: state.tier, lite: isLite(), ...(state.world?.stats() || {}) }) };
}
