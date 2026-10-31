import { AVATARS, FEATURES } from '../config/site';

const AV_KEY = 'ignus27-avatar';
const LITE_KEY = 'ignus27-lite';

const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };

/** Shared client state. Survives page navigations (the runtime module runs once). */
export const state = {
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  coarse: matchMedia('(pointer: coarse)').matches,
  avatar: (() => { const k = read(AV_KEY); return k && AVATARS[k] ? k : null; })(),
  /** Lite preference: '1' forced on, '0' forced off (3D even on weak devices), null = automatic. */
  litePref: (() => { const v = read(LITE_KEY); return v === '1' || v === '0' ? v : null; })(),
  /** Detected device tier (see quality.js); null until detection finishes. */
  tier: null,
  noWebgl: false,
  world: null,
};

/** True when the page should run without WebGL right now. */
export function isLite() {
  if (state.noWebgl) return true;
  if (state.litePref === '1') return true;
  if (state.litePref === '0') return false;
  return state.tier === 'lite';
}

export const avatarColor = () => (state.avatar ? AVATARS[state.avatar].color : null);
export const avatarName = () => (state.avatar ? AVATARS[state.avatar].name : null);

/** Re-applies runtime state to <html>/<body>. Needed after every router swap, which resets both. */
export function applyRootState() {
  const d = document.documentElement;
  const c = avatarColor();
  if (c) d.style.setProperty('--accent', c); else d.style.removeProperty('--accent');
  const lite = isLite();
  d.classList.toggle('lite', lite);
  d.classList.toggle('has-posters', FEATURES.posters);
  document.body.classList.toggle('no-webgl', lite);
  document.querySelectorAll('[data-lite-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(lite)));
}

export function setAvatar(key) {
  if (!AVATARS[key]) return;
  state.avatar = key;
  write(AV_KEY, key);
  applyRootState();
  state.world?.setAccent(AVATARS[key].color);
}

/** User toggled Lite mode: remember the explicit choice. */
export function setLite(on) {
  state.litePref = on ? '1' : '0';
  write(LITE_KEY, state.litePref);
  applyRootState();
}
