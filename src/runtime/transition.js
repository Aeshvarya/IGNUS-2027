import gsap from 'gsap';
import { state } from './state.js';

/**
 * Page transitions: a rift opens from where you clicked and swallows the page, the router swaps
 * it, then the rift closes onto the new page. The persistent 3D camera flies to the new page's
 * location underneath. Reduced motion: a short fade.
 */
export function initTransitions({ onLeave } = {}) {
  const wipe = () => document.getElementById('rift-wipe');
  let lastX = innerWidth / 2, lastY = innerHeight / 2;
  addEventListener('pointerdown', (e) => { lastX = e.clientX; lastY = e.clientY; }, { passive: true });

  document.addEventListener('astro:before-preparation', (ev) => {
    const w = wipe();
    if (!w) return;
    const original = ev.loader;
    ev.loader = async () => {
      onLeave?.();
      w.style.setProperty('--wx', `${(lastX / innerWidth) * 100}%`);
      w.style.setProperty('--wy', `${(lastY / innerHeight) * 100}%`);
      w.classList.add('on');
      const anim = state.reduceMotion
        ? gsap.fromTo(w, { opacity: 0, '--wipe': '160%' }, { opacity: 1, duration: 0.15 })
        : gsap.fromTo(w, { opacity: 1, '--wipe': '0%' }, { '--wipe': '160%', duration: 0.55, ease: 'expo.in' });
      await Promise.all([anim.then(), original()]);
    };
  });

  document.addEventListener('astro:after-swap', () => {
    const w = wipe();
    if (!w || !w.classList.contains('on')) return;
    w.style.setProperty('--wx', '50%'); w.style.setProperty('--wy', '50%');
    const done = () => w.classList.remove('on');
    if (state.reduceMotion) gsap.to(w, { opacity: 0, duration: 0.2, onComplete: done });
    else gsap.fromTo(w, { '--wipe': '160%', opacity: 1 }, { '--wipe': '0%', duration: 0.7, ease: 'expo.out', delay: 0.05, onComplete: done, onStart() { w.style.setProperty('--wipe-dir', 'in'); } });
  });
}
