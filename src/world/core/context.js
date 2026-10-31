import * as THREE from 'three';
import { HEX, V, mulberry32 } from './util.js';

/**
 * Shared scene constants and the build context passed to every world module.
 * The seeded RNG is consumed in build order, so modules must keep being built
 * in the same order to keep the world identical between runs.
 */
export const PLINTH_TOP = 3.0;
export const TREE_S = 7.0;                       // the knowledge tree model is 2.34 units tall; ×7 in the scene
export const ZP = -20;                           // plane of the tree
export const ZF = ZP + 2.0;                      // the plasma circle stands in front of the trunk
export const RX = 3.5, RY = 3.2;                 // the round rift between the two faces
export const CENTER = V(0, 0, -20);
export const PORTAL = V(0, PLINTH_TOP + TREE_S * 0.447, -18);
export const SUN = V(0, 0.55, -1).normalize();
export const LV = 12;                            // plinth tiers
export const tierR = (i) => 17 - i * 8 / 11;
export const topY = (i) => (i + 1) * 0.25;
export const LAMPS = [[-26, -2, 9.5], [26, -2, 9.5], [-20, -31, 8.5], [20, -31, 8.5]];
export const WALLS = [[-28, 10], [28, 10]];

export function createContext({ scene, quality }) {
  const rnd = mulberry32(2027);
  const rnd2 = mulberry32(1999); // separate stream for Phase 4 additions, so the original world stays identical
  const ctx = {
    scene,
    quality,
    small: quality.small,
    rnd,
    R: (a, b) => a + (b - a) * rnd(),
    rnd2,
    R2: (a, b) => a + (b - a) * rnd2(),
    U: {
      time: { value: 0 }, pix: { value: 1 }, shift: { value: 0 }, accent: { value: new THREE.Color(HEX.rani) },
      wave: { value: new THREE.Vector2(0, 0) }, waveCol: { value: new THREE.Color(HEX.rani) }, // paint wave: (radius, strength)
      ripples: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, -99)) }, // (x, z, strength, birth time)
    },
    PAL: [HEX.rani, HEX.acid, HEX.cyan, HEX.saffron, HEX.blue].map((h) => new THREE.Color(h)),
    thresholdOnly: new THREE.Group(),
    shiftOnly: new THREE.Group(),
    swaps: [],
    colorSwaps: [], // instanced meshes whose instance colours change with the realm
    gradientMap: (() => {
      const t = new THREE.DataTexture(new Uint8Array([45, 120, 200, 255]), 4, 1, THREE.RedFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
    })(),
  };
  ctx.shiftOnly.visible = false;
  scene.add(ctx.thresholdOnly, ctx.shiftOnly);
  /** Registers a mesh whose material flips between the ordinary realm (a) and the Shift (b). */
  ctx.swap = (mesh, a, b) => { mesh.material = a; ctx.swaps.push({ mesh, a, b }); return mesh; };
  return ctx;
}
