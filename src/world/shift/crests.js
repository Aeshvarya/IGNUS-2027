import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEX } from '../core/util.js';
import { PLINTH_TOP, PORTAL, ZF, ZP } from '../core/context.js';

/**
 * The five class crests from Character select, orbiting the knowledge tree:
 * performer (mic), artist (brush), competitor (trophy), strategist (rook), spellcaster (star).
 * Toon-shaded with an ink outline (inverted hull) so they read like stickers come to life.
 */
const CLASSES = [
  ['performer', '#ff2e93'], ['artist', '#ff8a1f'], ['competitor', '#dcff3c'], ['strategist', '#6f8cff'], ['spellcaster', '#5ef2ff'],
];

function micGeo() {
  const handle = new THREE.CylinderGeometry(0.15, 0.22, 1.15, 16); handle.translate(0, -0.25, 0);
  const collar = new THREE.TorusGeometry(0.3, 0.07, 8, 24); collar.rotateX(Math.PI / 2); collar.translate(0, 0.38, 0);
  const head = new THREE.SphereGeometry(0.44, 20, 14); head.translate(0, 0.72, 0);
  return [handle, collar, head];
}
function brushGeo() {
  const handle = new THREE.CylinderGeometry(0.09, 0.14, 1.3, 12); handle.translate(0, -0.3, 0);
  const ferrule = new THREE.CylinderGeometry(0.18, 0.15, 0.3, 14); ferrule.translate(0, 0.48, 0);
  const tip = new THREE.ConeGeometry(0.19, 0.6, 14); tip.translate(0, 0.93, 0);
  const drop = new THREE.SphereGeometry(0.15, 12, 10); drop.scale(1, 1.4, 1); drop.translate(0.32, 1.25, 0);
  const g = [handle, ferrule, tip, drop]; g.forEach((x) => x.rotateZ(-0.5));
  return g;
}
function trophyGeo() {
  const prof = [[0, -0.75], [0.52, -0.75], [0.52, -0.6], [0.2, -0.52], [0.13, -0.15], [0.22, -0.05], [0.62, 0.1], [0.7, 0.72], [0.62, 0.74], [0.54, 0.22], [0, 0.18]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.LatheGeometry(prof, 24);
  const hands = [-1, 1].map((s) => { const h = new THREE.TorusGeometry(0.26, 0.06, 8, 16, Math.PI); h.rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2); h.translate(s * 0.68, 0.4, 0); return h; });
  return [cup, ...hands];
}
function rookGeo() {
  const prof = [[0, -0.8], [0.58, -0.8], [0.58, -0.62], [0.42, -0.5], [0.33, 0.25], [0.48, 0.38], [0.48, 0.62], [0, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(prof, 24);
  const crenels = [0, 1, 2, 3].map((k) => { const b = new THREE.BoxGeometry(0.24, 0.26, 0.24); const t = k / 4 * Math.PI * 2 + Math.PI / 4; b.translate(Math.sin(t) * 0.36, 0.75, Math.cos(t) * 0.36); return b; });
  return [body, ...crenels];
}
function starGeo() {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2; const r = k % 2 ? 0.36 : 0.85; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k) s.lineTo(x, y); else s.moveTo(x, y); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 });
  g.translate(0, 0, -0.12);
  return [g];
}
const BUILD = { performer: micGeo, artist: brushGeo, competitor: trophyGeo, strategist: rookGeo, spellcaster: starGeo };

export function buildCrests(ctx) {
  const { shiftOnly, gradientMap } = ctx;
  const root = new THREE.Group();
  root.position.set(0, PLINTH_TOP + 8.8, ZP + 1.0);
  root.scale.setScalar(1.9);
  shiftOnly.add(root);
  const ink = new THREE.MeshBasicMaterial({ color: HEX.ink, side: THREE.BackSide });
  const target = new THREE.Vector3(0, PORTAL.y, ZF).sub(root.position).divideScalar(1.9); // tree heart, in root space

  const crests = CLASSES.map(([key, hex], i) => {
    const geo = mergeGeometries(BUILD[key]().map((g) => (g.index ? g.toNonIndexed() : g)));
    geo.computeVertexNormals();
    const c = new THREE.Color(hex);
    const body = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: c, gradientMap, emissive: c.clone().multiplyScalar(0.35) }));
    const hull = new THREE.Mesh(geo, ink); hull.scale.setScalar(1.09);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.6, 6, 12, 1, true).translate(0, -3.6, 0), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const g = new THREE.Group(); g.add(hull, body, beam); g.scale.setScalar(0.001);
    root.add(g);
    return { key, g, beam, base: (i / CLASSES.length) * Math.PI * 2, hl: 0, fly: -1 };
  });

  let hover = null;
  const posTmp = new THREE.Vector3();

  return {
    hover(key) { hover = key; },
    /** Sends a crest into the tree; returns the delay (s) until it arrives. */
    choose(key) { const c = crests.find((x) => x.key === key); if (c) c.fly = 0; return 0.75; },
    update(vis, t, dt) {
      root.visible = vis > 0.001;
      if (!root.visible) return;
      const R = 4.6;
      for (const c of crests) {
        const want = hover === c.key ? 1 : 0;
        c.hl += (want - c.hl) * (1 - Math.exp(-dt * 9));
        const a = c.base + t * 0.22;
        posTmp.set(Math.sin(a) * R, Math.sin(t * 0.9 + c.base * 2) * 0.45 + c.hl * 0.8, Math.cos(a) * R * 0.55);
        if (c.fly >= 0) {
          c.fly += dt / 0.75;
          const f = Math.min(1, c.fly), e = f * f * (3 - 2 * f);
          posTmp.lerp(target, e);
          c.g.scale.setScalar(Math.max(0.001, vis * (1 + c.hl * 0.5) * (1 - e * 0.85)));
          c.g.rotation.y = t * 1.2 + e * 12;
          if (c.fly > 1.6) c.fly = -1; // back to orbit
        } else {
          c.g.scale.setScalar(Math.max(0.001, vis * (1 + c.hl * 0.5)));
          c.g.rotation.y = t * (0.6 + c.hl * 2.4) + c.base;
        }
        c.g.position.copy(posTmp);
        c.beam.material.opacity = c.hl * 0.55 * vis;
      }
    },
  };
}
