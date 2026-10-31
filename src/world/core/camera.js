import * as THREE from 'three';
import { clamp, V } from './util.js';
import { PORTAL, ZF } from './context.js';

/**
 * Camera paths through the story. u runs 0 … 6:
 * 0 hero · 1 prologue · 2 rift start · 3 the crossing · 4 avatars · 5 quests · 6 magic circle.
 * Before u = 3 the camera follows PRE (toward and through the portal); after it, POST.
 */
const PY = PORTAL.y;
const PRE = [
  { u: 0, p: V(0, 2.2, 13), l: V(0, 5.4, -20) },
  { u: 1, p: V(0.9, 2.8, 4), l: V(0, 8.2, -20) },
  { u: 2, p: V(0, 4.8, -7), l: V(0, PY + 0.3, -20) },
  { u: 2.7, p: V(0, PY - 0.2, -14.6), l: V(0, PY, -26) },
  { u: 3, p: V(0, PY, ZF - 0.05), l: V(0, PY, -32) },
];
const POST = [
  { u: 3, p: V(0, PY, ZF + 0.5), l: V(0, 4.5, 2) },
  { u: 3.5, p: V(0, 9.5, -9.5), l: V(0, 2.0, 14) },
  { u: 4, p: V(-15, 6.5, 3), l: V(0, 8.5, -20) },
  { u: 5, p: V(19, 19, 8), l: V(0, 3.0, -18) },
  { u: 6, p: V(0, 98, -6), l: V(0, 0, -20) },
];
const mk = (keys) => ({
  keys,
  p: new THREE.CatmullRomCurve3(keys.map((k) => k.p), false, 'centripetal'),
  l: new THREE.CatmullRomCurve3(keys.map((k) => k.l), false, 'centripetal'),
});
const pre = mk(PRE), post = mk(POST);

function sample(path, u, outP, outL) {
  const k = path.keys, n = k.length; let i = 0;
  while (i < n - 2 && u > k[i + 1].u) i++;
  const f = clamp((u - k[i].u) / (k[i + 1].u - k[i].u), 0, 1); const t = (i + f) / (n - 1);
  path.p.getPoint(t, outP); path.l.getPoint(t, outL);
}

/** Camera position and look-at target for story position u. */
export function sampleStory(u, outP, outL) {
  if (u < 3) sample(pre, u, outP, outL); else sample(post, u, outP, outL);
}
