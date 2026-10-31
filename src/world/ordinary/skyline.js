import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEX, place, flat } from '../core/util.js';

/**
 * Jodhpur on the horizon: a Mehrangarh-style fort on a rocky ridge to the right of the tree,
 * and clusters of blue-city houses in the haze. Dusk turns them into warm silhouettes against
 * the sky (they skip fog so they read at distance); the Shift turns them to ink with lit windows.
 */
export function buildSkyline(ctx) {
  const { scene, swap, shiftOnly, R2, PAL, colorSwaps } = ctx;
  const FORT = new THREE.Vector3(74, 0, -128);

  /* ---------- the ridge and the fort ---------- */
  const rock = [], fort = [];
  {
    const ridge = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    ridge.scale(44, 19, 16); ridge.translate(FORT.x, -1, FORT.z); rock.push(ridge);
    const shoulder = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    shoulder.scale(26, 12, 13); shoulder.translate(FORT.x + 34, -1, FORT.z + 6); rock.push(shoulder);
  }
  const top = 16.5; // walls stand on the ridge's crown
  const box = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, y + h / 2, z); fort.push(g); };
  const burj = (r, h, x, y, z) => { const g = new THREE.CylinderGeometry(r * 0.92, r, h, 14); g.translate(x, y + h / 2, z); fort.push(g); };
  const dome = (r, x, y, z) => { const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(x, y, z); fort.push(g); };
  // long curtain wall following the crown, with round bastions
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = FORT.x - 34 + t * 68, y = top - 5.5 * Math.pow(Math.abs(t - 0.45) * 2, 2);
    box(9.2, 6.5, 2.2, x, y - 1, FORT.z + 4 + Math.sin(t * 5) * 1.5, Math.sin(t * 3) * 0.12);
    if (i % 2 === 0) burj(2.6, 8.5, x + 3, y - 1.5, FORT.z + 4.5);
  }
  // the palace blocks: stepped, tall, with jharokha boxes and chhatri domes
  const P = [[-10, 13, 9, 9], [-1, 17, 8, 10], [8, 14, 9, 8], [16, 10, 7, 7]];
  for (const [dx, h, w, d] of P) {
    const x = FORT.x + dx, z = FORT.z - 1;
    box(w, h, d, x, top, z);
    box(w * 0.7, 1.4, 1.2, x, top + h * 0.62, z + d / 2 + 0.5);
    box(w * 0.5, 1.2, 1.0, x, top + h * 0.36, z + d / 2 + 0.4);
    dome(1.3, x - w * 0.3, top + h, z); dome(1.0, x + w * 0.3, top + h, z);
  }
  burj(2.2, 22, FORT.x + 24, top - 2, FORT.z - 2);
  dome(2.1, FORT.x + 24, top + 20, FORT.z - 2);

  const fortGeo = mergeGeometries([...rock.map(flat), ...fort.map(flat)]);
  // Vertex shade: darker toward the ground, so the silhouette reads like dusk haze.
  {
    const pos = fortGeo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const v = 0.55 + 0.45 * Math.min(1, Math.max(0, pos.getY(i) / 40));
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
    }
    fortGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const fortDusk = new THREE.MeshBasicMaterial({ color: 0x4a2c1e, vertexColors: true, fog: false });
  const fortInk = new THREE.MeshBasicMaterial({ color: 0x24104a, vertexColors: true, fog: false });
  scene.add(swap(new THREE.Mesh(fortGeo, fortDusk), fortDusk, fortInk));

  // after the Shift: a neon line along the walls and lit windows
  {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(FORT.x - 34 + t * 68, top - 5.5 * Math.pow(Math.abs(t - 0.45) * 2, 2) + 5.6, FORT.z + 5.2 + Math.sin(t * 5) * 1.5)); }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.16, 5, false);
    shiftOnly.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: new THREE.Color(HEX.rani).multiplyScalar(2.6), fog: false })));
    const win = []; const wc = [];
    for (const [dx, h, w, d] of P) for (let k = 0; k < 14; k++) {
      win.push(FORT.x + dx + R2(-w / 2.4, w / 2.4), top + R2(1.5, h - 1.5), FORT.z - 1 + d / 2 + 0.15);
      const c = PAL[k % 3 === 0 ? 1 : 2]; wc.push(c.r * 2, c.g * 2, c.b * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(win, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
    shiftOnly.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, fog: false, sizeAttenuation: true })));
  }

  /* ---------- the blue city ---------- */
  {
    const spots = [];
    const cluster = (cx, cz, n, spread) => { for (let i = 0; i < n; i++) spots.push([cx + R2(-spread, spread), cz + R2(-spread * 0.5, spread * 0.5)]); };
    cluster(48, -98, 46, 22); cluster(-58, -96, 52, 26); cluster(-100, -120, 40, 24); cluster(104, -102, 30, 18); cluster(10, -112, 26, 14);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, envMapIntensity: 0.4 }), spots.length);
    const ca = new Float32Array(spots.length * 3), cb = new Float32Array(spots.length * 3);
    const blues = [new THREE.Color(0x4f6fb8), new THREE.Color(0x6a8ad0), new THREE.Color(0x3d5a9e), new THREE.Color(0xa9b4c8)];
    spots.forEach(([x, z], i) => {
      const w = R2(2.2, 4.6), h = R2(2.5, 7), d = R2(2.2, 4.6);
      place(im, i, x, 0, z, 0, R2(-0.3, 0.3), 0, w, h, d);
      const b = blues[i % 7 === 0 ? 3 : i % 3]; ca[i * 3] = b.r; ca[i * 3 + 1] = b.g; ca[i * 3 + 2] = b.b;
      const n = PAL[[2, 4, 0, 2, 1][i % 5]], k = R2(0.35, 0.7); cb[i * 3] = n.r * k; cb[i * 3 + 1] = n.g * k; cb[i * 3 + 2] = n.b * k;
    });
    im.instanceColor = new THREE.InstancedBufferAttribute(ca.slice(), 3);
    colorSwaps.push({ im, a: ca, b: cb });
    const shiftMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: ctx.gradientMap, emissive: 0x12062a });
    scene.add(swap(im, im.material, shiftMat));
  }

  /* ---------- birds over the dusk (ordinary realm only) ---------- */
  const birdMat = new THREE.ShaderMaterial({
    uniforms: { uTime: ctx.U.time, uColor: { value: new THREE.Color(0x1a110c) } },
    vertexShader: /* glsl */`
attribute vec4 aBird; // x: path radius, y: height, z: phase, w: speed
uniform float uTime; varying float vF;
void main(){
  float a = aBird.z + uTime * aBird.w;
  vec3 c = vec3(sin(a) * aBird.x + 10.0, aBird.y + sin(uTime * 0.7 + aBird.z * 3.0) * 1.5, -70.0 + cos(a) * aBird.x * 0.45);
  vec3 fwd = normalize(vec3(cos(a) * aBird.x, 0.0, -sin(a) * aBird.x * 0.45));
  vec3 side = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 p = position;
  float flap = sin(uTime * (7.0 + aBird.w * 20.0) + aBird.z * 11.0);
  p.y += abs(p.x) * flap * 0.9;
  vec3 wp = c + side * p.x + fwd * p.z + vec3(0.0, p.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vF = 1.0;
}`,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.DoubleSide,
  });
  {
    const N = ctx.small ? 18 : 34;
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -0.9, 0.12, -0.2, 0, 0, -0.25, 0, 0, 0.35, 0.9, 0.12, -0.2, 0, 0, -0.25].map((v) => v * 1.7), 3));
    const g = new THREE.InstancedBufferGeometry().copy(base); g.instanceCount = N;
    const seeds = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { const grp = i % 3; seeds[i * 4] = 40 + grp * 14 + R2(-4, 4); seeds[i * 4 + 1] = 26 + grp * 5 + R2(-2, 2); seeds[i * 4 + 2] = grp * 2.1 + R2(-0.08, 0.08); seeds[i * 4 + 3] = 0.045 + grp * 0.008 + R2(-0.002, 0.002); }
    g.setAttribute('aBird', new THREE.InstancedBufferAttribute(seeds, 4));
    const birds = new THREE.Mesh(g, birdMat); birds.frustumCulled = false;
    ctx.thresholdOnly.add(birds);
  }
}
