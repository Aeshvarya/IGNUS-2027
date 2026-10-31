import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { state } from '../state.js';

gsap.registerPlugin(Flip);

/** Quest board filters: type × day × class, mirrored in the URL (?category=boss&day=2&avatar=artist). */
export function mountEventFilters() {
  const root = document.querySelector('[data-filters]');
  const grid = document.querySelector('[data-ev-grid]');
  if (!root || !grid) return () => {};
  const items = [...grid.querySelectorAll('.ev')];
  const count = root.querySelector('[data-count]');
  const empty = document.querySelector('[data-empty]');
  const params = new URLSearchParams(location.search);
  const sel = { category: params.get('category') || 'all', day: params.get('day') || 'all', avatar: params.get('avatar') || 'all' };

  function apply(animate) {
    root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(sel[b.dataset.filter] === b.dataset.value)));
    const flipState = animate && !state.reduceMotion ? Flip.getState(items) : null;
    let n = 0;
    for (const el of items) {
      const ok = (sel.category === 'all' || el.dataset.category === sel.category)
        && (sel.day === 'all' || el.dataset.day === sel.day)
        && (sel.avatar === 'all' || el.dataset.avatars.split(' ').includes(sel.avatar));
      el.hidden = !ok; if (ok) n++;
    }
    if (count) count.textContent = `${n} quest${n === 1 ? '' : 's'}`;
    if (empty) empty.hidden = n > 0;
    if (flipState) Flip.from(flipState, { duration: 0.5, ease: 'power3.inOut', absolute: true, scale: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4 }), onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.3 }) });
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sel)) if (v !== 'all') q.set(k, v);
    history.replaceState(history.state, '', q.toString() ? `?${q}` : location.pathname);
  }
  // unknown values from the URL fall back to "all"
  for (const k of Object.keys(sel)) if (!root.querySelector(`[data-filter="${k}"][data-value="${sel[k]}"]`)) sel[k] = 'all';
  apply(false);

  const onClick = (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-filter]') : null;
    if (!b) return;
    sel[b.dataset.filter] = b.dataset.value;
    apply(true);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
