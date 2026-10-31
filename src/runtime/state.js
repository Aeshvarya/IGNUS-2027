import { AVATARS } from '../config/site';

const AV_KEY = 'ignus27-avatar';
const LITE_KEY = 'ignus27-lite';

const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };

/** Shared client state. Survives page navigations (the runtime module runs once). */
export const state = {
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  coarse: matchMedia('(pointer: coarse)').matches,
  avatar: (() => { const k = read(AV_KEY); return k && AVATARS[k] ? k : null; })(),
  lite: read(LITE_KEY) === '1',
  noWebgl: false,
  world: null,
};

export const avatarColor = () => (state.avatar ? AVATARS[state.avatar].color : null);
export const avatarName = () => (state.avatar ? AVATARS[state.avatar].name : null);

/** Re-applies runtime state to <html>/<body>. Needed after every router swap, which resets both. */
export function applyRootState() {
  const d = document.documentElement;
  const c = avatarColor();
  if (c) d.style.setProperty('--accent', c); else d.style.removeProperty('--accent');
  d.classList.toggle('lite', state.lite);
  document.body.classList.toggle('no-webgl', state.lite || state.noWebgl);
  document.querySelectorAll('[data-lite-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(state.lite)));
}

export function setAvatar(key) {
  if (!AVATARS[key]) return;
  state.avatar = key;
  write(AV_KEY, key);
  applyRootState();
  state.world?.setAccent(AVATARS[key].color);
}

export function setLite(on) {
  state.lite = on;
  write(LITE_KEY, on ? '1' : null);
  applyRootState();
}
