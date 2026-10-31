import { AVATARS } from '../../config/site';
import { state, setAvatar, avatarName } from '../state.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Home page controller: maps scroll to the story position u (0 … 6) and keeps the
 * HUD, realm flip, avatar picker and quest highlights in sync with it.
 * Ported from the handoff's measure / scrollToU / updateUI.
 */
export function mountHome(app) {
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const cleanups = [];
  const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); cleanups.push(() => el.removeEventListener(ev, fn, opts)); };

  /* ---------- scroll → story position u ---------- */
  let anchors = [0, 1, 2, 3, 4, 5, 6];
  function measure() {
    const vh = innerHeight;
    const maxS = Math.max(1, document.documentElement.scrollHeight - vh);
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    const mid = (el) => top(el) + el.offsetHeight / 2 - vh / 2;
    const rift = $('#rift');
    const a = [0, mid($('#theme')), top(rift), top(rift) + (rift.offsetHeight - vh) / 2, mid($('#avatars')), mid($('#quests')), maxS];
    for (let i = 1; i < a.length; i++) a[i] = Math.max(a[i], a[i - 1] + 1);
    anchors = a;
  }
  function scrollToU(s) {
    for (let i = 0; i < anchors.length - 1; i++) {
      if (s <= anchors[i + 1]) return i + clamp((s - anchors[i]) / (anchors[i + 1] - anchors[i]), 0, 1);
    }
    return anchors.length - 1;
  }
  measure();
  document.fonts?.ready.then(measure);
  on(window, 'resize', measure);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => measure()) : null;
  ro?.observe($('main'));
  cleanups.push(() => ro?.disconnect());

  /* ---------- HUD + realm flip ---------- */
  const hudBox = $('.hud-realm');
  const hudRealm = $('#hudRealm'), hudLine = $('#hudLine'), hudBar = $('#hudBar'), riftSync = $('#riftSync');
  let lastShift = null, lastLine = '', lastSync = '', joltTimer = 0;
  function frame(u, dist) {
    const s = u >= 3;
    if (s !== lastShift) {
      body.classList.toggle('is-shift', s);
      body.dataset.realm = s ? 'shift' : 'ordinary';
      hudRealm.textContent = s ? 'Realm · Ignus' : 'Realm · Ordinary';
      if (lastShift !== null) {
        body.classList.add('just-shifted');
        clearTimeout(joltTimer);
        joltTimer = setTimeout(() => body.classList.remove('just-shifted'), 700);
      }
      lastShift = s;
    }
    const scene = u < 2 ? 'ordinary' : u < 3 ? 'rift' : u < 5.5 ? 'shift' : 'circle';
    if (body.dataset.scene !== scene) body.dataset.scene = scene; // Lite mode posters follow the story
    hudBar.style.transform = `scaleX(${(u / 6).toFixed(4)})`;
    hudBox.classList.toggle('is-hidden', u > 3.55 && u < 5.6);
    const line = s ? `Lvl 27 · ${avatarName() || 'New player'}` : `Rift ${dist.toFixed(1)} m`;
    if (line !== lastLine) { hudLine.textContent = line; lastLine = line; }
    const sync = Math.round(clamp(u - 2, 0, 1) * 100) + '%';
    if (sync !== lastSync) { riftSync.textContent = sync; lastSync = sync; }
  }

  /* ---------- avatar picker ---------- */
  if (state.avatar) { const el = document.getElementById('av-' + state.avatar); if (el) el.checked = true; }
  document.querySelectorAll('input[name="avatar"]').forEach((inp) => on(inp, 'change', () => { if (AVATARS[inp.value]) { setAvatar(inp.value); lastLine = ''; } }));

  /* ---------- quests ↔ world markers ---------- */
  document.querySelectorAll('.quest').forEach((li) => {
    on(li, 'mouseenter', () => state.world?.highlight(+li.dataset.q));
    on(li, 'mouseleave', () => state.world?.highlight(-1));
    on(li, 'focusin', () => state.world?.highlight(+li.dataset.q));
    on(li, 'focusout', () => state.world?.highlight(-1));
  });

  on($('#backBtn'), 'click', () => app.scrollTo(0));

  return {
    targetU: () => scrollToU(scrollY),
    frame,
    destroy() { clearTimeout(joltTimer); cleanups.forEach((f) => f()); state.world?.highlight(-1); body.classList.remove('just-shifted'); },
  };
}
