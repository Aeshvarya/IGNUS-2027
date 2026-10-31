import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { state, applyRootState, setLite, avatarColor } from './state.js';
import { detectQuality } from './quality.js';
import { mountHome } from './pages/home.js';
import { mountGeneric } from './pages/generic.js';

gsap.registerPlugin(ScrollTrigger);

let booted = false;
let lenis = null;
let controller = null;
let uS = null;
let tAcc = 0;
let worldLoading = null;

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

/** Lazy-loads three.js and builds the world. Never runs in Lite mode. */
function ensureWorld() {
  if (state.world || worldLoading || state.lite || state.noWebgl) return worldLoading;
  const loaderText = document.getElementById('loaderText');
  worldLoading = (async () => {
    await fontsReady();
    try {
      const { createWorld } = await import('../world/index.js');
      const world = await createWorld({
        canvas: document.getElementById('world'),
        quality: detectQuality(),
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
    requestAnimationFrame(() => requestAnimationFrame(hideLoader));
  })();
  return worldLoading;
}

function mountPage() {
  controller?.destroy();
  const page = document.body.dataset.page || 'home';
  controller = page === 'home' ? mountHome(app) : mountGeneric(app, page);
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
  uS += (uT - uS) * (1 - Math.exp(-dt * (state.reduceMotion ? 14 : 3.4)));
  if (Math.abs(uT - uS) < 1e-4) uS = uT;
  let dist = Math.max(0, 40 * (1 - uS / 3));
  if (state.world && !state.lite) { state.world.update(uS, dt, tAcc); dist = state.world.dist(); }
  controller.frame(uS, dist);
}

const app = {
  scrollTo(y) {
    if (lenis) lenis.scrollTo(y, { immediate: state.reduceMotion });
    else scrollTo({ top: y, behavior: state.reduceMotion ? 'auto' : 'smooth' });
  },
};

function bindGlobalUI() {
  // Delegated, so it survives router swaps of <body>.
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest('[data-menu-open]')) { const d = document.getElementById('pause'); if (d && !d.open) { d.showModal(); lenis?.stop(); } return; }
    if (t.closest('[data-menu-close]')) { document.getElementById('pause')?.close(); return; }
    if (t.closest('[data-menu-link]')) { document.getElementById('pause')?.close(); return; }
    if (t.closest('[data-lite-toggle]')) {
      setLite(!state.lite);
      if (!state.lite) { ensureWorld(); }
      return;
    }
    const pause = t.closest('dialog.pause');
    if (pause && t === pause) pause.close(); // click on the backdrop
  });
  document.addEventListener('close', (e) => { if (e.target instanceof HTMLDialogElement) lenis?.start(); }, true);
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

  setTimeout(hideLoader, 25000); // failsafe
  if (state.lite) hideLoader(); else ensureWorld();
  addEventListener('resize', () => state.world?.resize());
}
