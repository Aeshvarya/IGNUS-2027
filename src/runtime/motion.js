import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { state } from './state.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Page-level motion, mounted on every page load and reverted before the router swaps the page:
 * heading reveals, sticker slap-ins, card entrances, the Coleridge quote lighting up word by
 * word, and magnetic buttons. Everything is skipped under prefers-reduced-motion.
 */
export function mountMotion() {
  if (state.reduceMotion) return () => {};
  const ctx = gsap.context(() => {});
  const splits = [];
  const cleanups = [];

  ctx.add(() => {
    // headings: masked line reveal
    document.querySelectorAll('main .h2:not([data-no-split]), main [data-reveal="lines"]').forEach((el) => {
      const sp = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl' });
      splits.push(sp);
      gsap.from(sp.lines, {
        yPercent: 110, rotate: 2, duration: 0.9, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    // stickers slap on
    document.querySelectorAll('main .sticker').forEach((el) => {
      gsap.from(el, {
        scale: 1.9, rotation: '-=14', autoAlpha: 0, duration: 0.55, ease: 'back.out(2.4)',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
    // cards rise in
    document.querySelectorAll('main .card, main [data-reveal="card"]').forEach((el) => {
      gsap.from(el, {
        y: 70, rotation: 1.5, autoAlpha: 0, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
    // lists stagger in
    document.querySelectorAll('main [data-stagger]').forEach((list) => {
      gsap.from(list.children, {
        y: 26, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05,
        scrollTrigger: { trigger: list, start: 'top 88%', once: true },
      });
    });
    // the Coleridge quote lights up as you approach the rift
    const quote = document.querySelector('.coleridge p');
    if (quote) {
      const sp = SplitText.create(quote, { type: 'words', wordsClass: 'qw' });
      splits.push(sp);
      gsap.fromTo(sp.words, { opacity: 0.18 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: '#rift', start: 'top 60%', end: '+=' + Math.round(innerHeight * 0.9), scrub: true },
      });
    }
  });

  // magnetic buttons (mouse only)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn, .nav-cta').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      const move = (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.22); yTo((e.clientY - r.top - r.height / 2) * 0.3); };
      const leave = () => { xTo(0); yTo(0); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { x: 0, y: 0 }); });
    });
  }

  return () => { cleanups.forEach((f) => f()); splits.forEach((s) => s.revert()); ctx.revert(); };
}

/** A ring that trails the mouse and throws sparks. Desktop with a fine pointer only; the native cursor stays. */
export function initCursor() {
  if (state.reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const el = document.getElementById('cursor');
  if (!el) return;
  document.documentElement.classList.add('has-cursor');
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
  const sparks = Array.from({ length: 14 }, () => { const s = document.createElement('span'); s.className = 'spark'; el.appendChild(s); return s; });
  let si = 0, lx = 0, ly = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    xTo(e.clientX); yTo(e.clientY);
    const dx = e.clientX - lx, dy = e.clientY - ly;
    if (dx * dx + dy * dy > 500) {
      lx = e.clientX; ly = e.clientY;
      const s = sparks[si = (si + 1) % sparks.length];
      const cols = ['var(--accent)', 'var(--portal)', 'var(--acid)'];
      gsap.killTweensOf(s);
      gsap.fromTo(s, { x: e.clientX - gsap.getProperty(el, 'x'), y: e.clientY - gsap.getProperty(el, 'y'), opacity: 1, scale: 1, background: cols[si % 3] },
        { x: `+=${gsap.utils.random(-30, 30)}`, y: `+=${gsap.utils.random(10, 46)}`, opacity: 0, scale: 0.2, duration: 0.7, ease: 'power2.out' });
    }
  }, { passive: true });
  const isUi = (t) => t instanceof Element && t.closest('a, button, label, input, select, [role="button"]');
  addEventListener('pointerover', (e) => el.classList.toggle('big', !!isUi(e.target)), { passive: true });
}

/** Ticks every [data-countdown] on the page (runs regardless of reduced motion). */
export function mountCountdowns() {
  const els = [...document.querySelectorAll('[data-countdown]')];
  if (!els.length) return () => {};
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const now = Date.now();
    for (const el of els) {
      const start = Date.parse(el.dataset.countdown), end = Date.parse(el.dataset.countdownEnd || el.dataset.countdown);
      const label = el.querySelector('.cd-label'), clock = el.querySelector('[data-cd-clock]');
      if (now >= end) { if (label) label.textContent = 'IGNUS ’27 is over · see you next year'; if (clock) clock.hidden = true; continue; }
      if (now >= start) { const day = Math.floor((now - start) / 864e5) + 1; if (label) label.textContent = `Live now · Day ${day}`; if (clock) clock.hidden = true; continue; }
      let s = Math.floor((start - now) / 1000);
      const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
      const set = (k, v) => { const n = el.querySelector(`[data-cd="${k}"]`); if (n && n.textContent !== v) n.textContent = v; };
      set('d', String(d)); set('h', pad(h)); set('m', pad(m)); set('s', pad(s));
    }
  }
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
