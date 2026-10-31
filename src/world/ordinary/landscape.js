import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tint, flat, jitteredBlob, place } from '../core/util.js';
import { LAMPS, WALLS } from '../core/context.js';

/** Lamps (two of them carry real point lights) and the low plaza walls. */
export function buildLampsAndWalls(ctx, mats) {
  const { scene, swap } = ctx;
  const lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff }), LAMPS.length);
  const lampLights = [];
  const geos = [];
  LAMPS.forEach(([x, z, h], i) => {
    const sx = x > 0 ? -1 : 1;
    const pole = new THREE.CylinderGeometry(0.09, 0.14, h, 8); pole.translate(x, h / 2, z); geos.push(pole);
    const arm = new THREE.BoxGeometry(0.9, 0.08, 0.08); arm.translate(x + sx * 0.42, h - 0.05, z); geos.push(arm);
    place(lampHeads, i, x + sx * 0.8, h - 0.16, z, 0, 0, 0, 1, 1, 1);
    lampHeads.setColorAt(i, new THREE.Color(1, 1, 1));
    if (i < 2) { const l = new THREE.PointLight(0xffb36b, 30, 24, 2); l.position.set(x + sx * 0.8, h - 0.5, z); scene.add(l); lampLights.push(l); }
  });
  scene.add(swap(new THREE.Mesh(mergeGeometries(geos)), mats.metalMat, mats.toonPlain));
  scene.add(lampHeads);

  const wallGeos = WALLS.map(([x, z]) => { const g = new THREE.BoxGeometry(0.7, 1.15, 30); g.translate(x, 0.575, z); return flat(tint(g, 0.85, 0, 1.15)); });
  scene.add(swap(new THREE.Mesh(mergeGeometries(wallGeos)), mats.stepMat, mats.toonStone));
  return { lampHeads, lampLights };
}

/** Tree line, distant hills, drifting mist (ordinary realm only) and leaves floating on the water. */
export function buildSurroundings(ctx, mats) {
  const { scene, swap, R, rnd, PAL, colorSwaps, thresholdOnly, gradientMap } = ctx;
  {
    const crowns = [], trunks = [];
    for (const sd of [-1, 1]) for (let k = 0; k < 11; k++) trunks.push([sd * R(31, 54), R(-44, 30), R(3, 6)]);
    for (let k = 0; k < 18; k++) trunks.push([R(-80, 80), R(-80, -56), R(4, 7)]);
    trunks.forEach(([x, z, h]) => { const n = 3 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) crowns.push([x + R(-1.5, 1.5), h + R(0.4, 2.6), z + R(-1.5, 1.5), R(1.7, 3.1)]); });
    const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.32, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x1b140e, roughness: 1, envMapIntensity: 0.15 }), trunks.length);
    trunks.forEach(([x, z, h], i) => place(tm, i, x, 0, z, 0, 0, 0, 1, h + 1, 1));
    scene.add(tm);
    const crownA = new THREE.MeshStandardMaterial({ color: 0x2b3a1c, roughness: 1, envMapIntensity: 0.18 });
    const crownB = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap, emissive: 0x14041e });
    const cm = new THREE.InstancedMesh(jitteredBlob(1, 0.2), crownA, crowns.length);
    const colA = new Float32Array(crowns.length * 3), colB = new Float32Array(crowns.length * 3);
    crowns.forEach(([x, y, z, s], i) => {
      place(cm, i, x, y, z, R(0, 3), R(0, 3), 0, s, s * R(0.8, 1.05), s);
      const l = R(0.6, 1.15); colA[i * 3] = l; colA[i * 3 + 1] = l; colA[i * 3 + 2] = l;
      const n = PAL[[1, 0, 2, 1, 3][i % 5]], dim = R(0.28, 0.45); colB[i * 3] = n.r * dim; colB[i * 3 + 1] = n.g * dim; colB[i * 3 + 2] = n.b * dim;
    });
    cm.instanceColor = new THREE.InstancedBufferAttribute(colA.slice(), 3);
    colorSwaps.push({ im: cm, a: colA, b: colB });
    scene.add(swap(cm, crownA, crownB));
    const hills = [];
    for (let k = 0; k < 8; k++) { const g = new THREE.SphereGeometry(1, 24, 12); g.scale(R(50, 95), R(9, 22), R(25, 40)); g.translate(R(-200, 200), -2, R(-215, -160)); hills.push(g); }
    scene.add(swap(new THREE.Mesh(mergeGeometries(hills)), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 1, envMapIntensity: 0.25 }), mats.toonDark));
  }

  const mistTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    for (let k = 0; k < 80; k++) {
      const x = R(0, 512), y = R(34, 110), r = R(22, 62);
      for (const ox of [0, -512, 512]) { const grd = g.createRadialGradient(x + ox, y, 0, x + ox, y, r); grd.addColorStop(0, 'rgba(255,255,255,0.2)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(x + ox - r, y - r, r * 2, r * 2); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
  })();
  {
    const mat = new THREE.MeshBasicMaterial({ map: mistTex, color: 0xb08a62, transparent: true, opacity: 0.22, depthWrite: false });
    [[-34, 2.6, -6, 0.35], [34, 2.6, -6, -0.35], [-42, 3, 12, 0.5], [42, 3, 12, -0.5], [-24, 2, -32, 0.2], [24, 2, -32, -0.2], [0, 2.2, -44, 0]].forEach(([x, y, z, ry]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), mat); m.position.set(x, y, z); m.rotation.y = ry; thresholdOnly.add(m);
    });
  }
  {
    const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.bezierCurveTo(0.3, 0.12, 0.24, 0.5, 0, 0.7); ls.bezierCurveTo(-0.24, 0.5, -0.3, 0.12, 0, 0);
    const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(ls, 4), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.2 }), 70);
    for (let i = 0; i < 70; i++) { const s = R(1.1, 2.1); place(im, i, R(-30, 30), 0.035, R(-6, 40), -Math.PI / 2, 0, R(0, 6.28), s, s, s); }
    scene.add(im);
  }
  return { mistTex };
}
