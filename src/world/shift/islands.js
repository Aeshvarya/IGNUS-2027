import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOISE, BASIC_VS } from '../shaders/chunks.js';
import { HEX, flat } from '../core/util.js';

/**
 * Floating islands of the Shift. Each carries a venue (they are the quest log's
 * "level arenas" made literal): a stage with an equaliser screen and sweeping lasers,
 * a pillar arena, a graffiti gallery, and a crystal shrine. Light pours off their edges.
 */
const ISLES = [
  { kind: 'stage', a: 24, r: 60, y: 15, s: 1.25 },
  { kind: 'arena', a: -40, r: 58, y: 18, s: 1.05 },
  { kind: 'gallery', a: 115, r: 58, y: 16, s: 1.0 },
  { kind: 'shrine', a: -170, r: 58, y: 21, s: 0.95 },
];

function rocky(geo, R2, amt) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amt * (Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.cos(z * 2.1 - y) * 0.5) + R2(-amt, amt) * 0.4;
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildIslands(ctx, mats, { graffitiTex }) {
  const { shiftOnly, R2, PAL, U, gradientMap, small } = ctx;
  const stoneMat = new THREE.MeshToonMaterial({ color: 0x5a4b8c, gradientMap });
  const darkMat = new THREE.MeshToonMaterial({ color: 0x2b1f4d, gradientMap });
  const isles = [];

  // light pouring off the island edges
  const fallMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uColor: { value: new THREE.Color(HEX.cyan) } },
    vertexShader: BASIC_VS,
    fragmentShader: /* glsl */`
uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
${NOISE}
void main(){
  float n = fbm(vec2(vUv.x * 9.0, vUv.y * 2.0 + uTime * 1.4));
  float streak = smoothstep(0.45, 0.8, n);
  float a = streak * smoothstep(0.0, 0.25, vUv.y) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  gl_FragColor = vec4(uColor * (0.6 + 1.6 * streak), a * 0.85);
}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });

  // equaliser screen for the stage
  const eqMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uAccent: U.accent },
    vertexShader: BASIC_VS,
    fragmentShader: /* glsl */`
uniform float uTime; uniform vec3 uAccent; varying vec2 vUv;
${NOISE}
void main(){
  float bars = 24.0; float b = floor(vUv.x * bars);
  float h = 0.15 + 0.8 * vnoise(vec2(b * 1.7, uTime * 3.0)) * (0.6 + 0.4 * sin(uTime * 4.0 + b));
  float on = step(vUv.y, h) * step(0.18, fract(vUv.x * bars));
  float seg = step(0.3, fract(vUv.y * 22.0));
  vec3 c = mix(vec3(0.37, 0.95, 1.0), uAccent, vUv.y);
  c = mix(c, vec3(0.86, 1.0, 0.24), step(0.8, vUv.y));
  vec3 bg = vec3(0.03, 0.01, 0.06);
  gl_FragColor = vec4(mix(bg, c * 2.2, on * seg), 1.0);
}`,
  });

  const laserMat = (c) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.4), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const lasers = [];

  ISLES.forEach((I, idx) => {
    const grp = new THREE.Group();
    const a = I.a * Math.PI / 180;
    grp.position.set(Math.sin(a) * I.r, I.y, -20 + Math.cos(a) * I.r);
    grp.rotation.y = a + Math.PI; // venue faces the circle
    grp.scale.setScalar(I.s);

    // the rock
    const topG = rocky(new THREE.CylinderGeometry(7, 6.3, 1.6, 22, 1), R2, 0.08);
    const under = rocky(new THREE.ConeGeometry(6.3, 10, 16, 3), R2, 0.16); under.rotateX(Math.PI); under.translate(0, -5.8, 0);
    const chunks = [];
    for (let k = 0; k < 3; k++) { const c = new THREE.DodecahedronGeometry(R2(0.8, 1.5), 0); c.translate(R2(-5, 5), R2(-14, -9), R2(-5, 5)); chunks.push(c); }
    grp.add(new THREE.Mesh(mergeGeometries([flat(topG), flat(under), ...chunks.map(flat)]), stoneMat));
    const rimC = PAL[[0, 2, 1, 3][idx]];
    const rim = new THREE.Mesh(new THREE.TorusGeometry(6.95, 0.09, 5, 64), new THREE.MeshBasicMaterial({ color: rimC.clone().multiplyScalar(2.4) }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.82; grp.add(rim);

    // light-falls
    const falls = small ? 1 : 2;
    for (let k = 0; k < falls; k++) {
      const m = fallMat.clone(); m.uniforms.uTime = U.time; m.uniforms.uColor.value.copy(rimC);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 26), m);
      const fa = (k ? 2.2 : -0.6) + idx; f.position.set(Math.sin(fa) * 6.9, -12.5, Math.cos(fa) * 6.9); f.rotation.y = fa;
      grp.add(f);
    }

    const top = 0.8;
    if (I.kind === 'stage') {
      const parts = [];
      const bx = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); parts.push(g); };
      bx(9, 0.9, 5, 0, top, -1);
      for (const x of [-4.4, 4.4]) bx(0.3, 7.5, 0.3, x, top, -3.2);
      bx(9.1, 0.35, 0.35, 0, top + 7.5, -3.2);
      for (const x of [-3, -1, 1, 3]) bx(0.5, 0.5, 0.5, x, top + 6.9, -2.6);
      grp.add(new THREE.Mesh(mergeGeometries(parts), darkMat));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 4.4), eqMat); screen.position.set(0, top + 4.2, -3.25); grp.add(screen);
      // lasers fanning out from the truss
      for (let k = 0; k < (small ? 3 : 6); k++) {
        const L = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 140, 5, 1, true).translate(0, 70, 0), laserMat(PAL[k % PAL.length]));
        const pivot = new THREE.Group(); pivot.position.set(-3 + (k % 4) * 2, top + 6.9, -2.6); pivot.add(L); grp.add(pivot);
        lasers.push({ pivot, phase: k * 1.3, speed: 0.4 + (k % 3) * 0.17 });
      }
    } else if (I.kind === 'arena') {
      const parts = [];
      for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; const g = new THREE.BoxGeometry(0.7, 4.2, 0.7); g.translate(Math.sin(t) * 5.2, top + 2.1, Math.cos(t) * 5.2); parts.push(g); const cap = new THREE.BoxGeometry(1.1, 0.4, 1.1); cap.translate(Math.sin(t) * 5.2, top + 4.4, Math.cos(t) * 5.2); parts.push(cap); }
      grp.add(new THREE.Mesh(mergeGeometries(parts), darkMat));
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.acid).multiplyScalar(2.2), side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = top + 0.03; grp.add(ring);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.acid).multiplyScalar(2.6) }));
      core.position.y = top + 2.6; core.userData.spin = 1.4; grp.add(core);
    } else if (I.kind === 'gallery') {
      for (let k = 0; k < 3; k++) {
        const fr = new THREE.Group();
        const border = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 0.25), darkMat);
        const art = new THREE.PlaneGeometry(3, 3); const uv = art.attributes.uv; const cell = [0, 3, 5][k]; const u0 = (cell % 4) / 4, v0 = 1 - (Math.floor(cell / 4) + 1) / 2;
        for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) * 0.25, v0 + uv.getY(j) * 0.5);
        const pic = new THREE.Mesh(art, new THREE.MeshBasicMaterial({ map: graffitiTex, transparent: true, color: new THREE.Color(1.6, 1.6, 1.6) })); pic.position.z = 0.14;
        fr.add(border, pic); fr.position.set((k - 1) * 3.9, top + 2.6, -1.8 + Math.abs(k - 1) * 1.2); fr.rotation.y = (1 - k) * 0.35;
        grp.add(fr);
      }
    } else {
      const crystals = [];
      for (let k = 0; k < 7; k++) { const c = new THREE.OctahedronGeometry(R2(0.6, 1.4), 0); c.scale(1, R2(1.8, 3.2), 1); c.rotateZ(R2(-0.35, 0.35)); c.translate(R2(-2.5, 2.5), top + 1.6, R2(-2.5, 2.5)); crystals.push(c); }
      grp.add(new THREE.Mesh(mergeGeometries(crystals), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.cyan).multiplyScalar(1.8) })));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.07, 5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.rani).multiplyScalar(2.4) }));
      halo.position.y = top + 4.5; halo.userData.spin = 0.6; halo.rotation.x = 1.2; grp.add(halo);
    }
    shiftOnly.add(grp);
    isles.push({ grp, baseY: I.y, phase: idx * 1.7 });
  });

  const spinners = [];
  isles.forEach((i) => i.grp.traverse((o) => { if (o.userData.spin) spinners.push(o); }));
  const tmpE = new THREE.Euler();

  return {
    update(t) {
      for (const i of isles) { i.grp.position.y = i.baseY + Math.sin(t * 0.42 + i.phase) * 0.8; i.grp.rotation.z = Math.sin(t * 0.3 + i.phase) * 0.02; }
      for (const o of spinners) o.rotation.y = t * o.userData.spin;
      for (const l of lasers) { tmpE.set(Math.sin(t * l.speed + l.phase) * 0.9, 0, Math.cos(t * l.speed * 0.8 + l.phase) * 0.55 - 0.25); l.pivot.rotation.copy(tmpE); }
    },
  };
}
