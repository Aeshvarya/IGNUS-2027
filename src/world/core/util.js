import * as THREE from 'three';
import { NOISE } from '../shaders/chunks.js';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const HEX = { rani: '#ff2e93', acid: '#dcff3c', cyan: '#5ef2ff', saffron: '#ff8a1f', blue: '#3d63ff', ink: '#0d0618', paper: '#fff4e2' };

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Vertex colours: a stone tone, optionally darkening toward y0. */
export function tint(geo, tone, y0 = null, y1 = null) {
  const pos = geo.attributes.position; const n = pos.count; const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let v = tone;
    if (y0 !== null) v *= 0.5 + 0.5 * clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1);
    col[i * 3] = v; col[i * 3 + 1] = v * 0.97; col[i * 3 + 2] = v * 0.93;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export const flat = (g) => (g.index ? g.toNonIndexed() : g);

/** Injects world-position-based GLSL into a built-in material's colour stage. */
export function worldShade(mat, code, key) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + code);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export function jitteredBlob(detail, amt) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amt * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - y * 1.9);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals(); return g;
}

const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), sc3 = new THREE.Vector3(), vv = new THREE.Vector3();
/** Sets instance i of an InstancedMesh from position / euler / scale. */
export function place(im, i, x, y, z, rx, ry, rz, sx, sy, sz) {
  ee.set(rx, ry, rz); qq.setFromEuler(ee); sc3.set(sx, sy, sz); vv.set(x, y, z); m4.compose(vv, qq, sc3); im.setMatrixAt(i, m4);
}

/** Paints a flat colour into every vertex of a geometry (for merged multi-colour meshes). */
export function paint(geo, c) {
  const n = geo.attributes.position.count; const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/* ---------- 2D canvas helpers (graffiti, labels) ---------- */
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function fitFont(g, lines, family, maxW, maxH) {
  let size = 220;
  while (size > 18) { g.font = `${size}px ${family}`; const w = Math.max(...lines.map((l) => g.measureText(l).width)); if (w <= maxW && size * lines.length <= maxH) break; size -= 6; }
  return size;
}
export function sparkle(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const r = k % 2 ? s * 0.22 : s; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.fill();
}
