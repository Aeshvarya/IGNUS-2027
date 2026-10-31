import * as THREE from 'three';
import { NOISE } from '../shaders/chunks.js';
import { V } from './util.js';
import { SUN } from './context.js';

/** Sky dome for both realms, plus a prefiltered environment map per realm. */
export function buildSky(ctx, renderer) {
  const { U, scene } = ctx;
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uShift: U.shift, uTime: U.time, uAccent: U.accent, uSun: { value: SUN.clone() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
uniform float uShift; uniform float uTime; uniform vec3 uAccent; uniform vec3 uSun; varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir); float h = d.y; vec3 col;
  if (uShift < 0.5) {
    float sd = max(dot(d, uSun), 0.0);
    vec3 base = mix(vec3(0.85, 0.42, 0.16), vec3(0.06, 0.065, 0.08), smoothstep(0.0, 0.22, h));
    base = mix(base, vec3(0.025, 0.02, 0.015), smoothstep(0.0, -0.25, h));
    base += vec3(1.25, 0.8, 0.4) * pow(sd, 14.0) * 0.9 + vec3(2.2, 1.7, 1.0) * pow(sd, 90.0);
    vec2 cuv = d.xz / (max(h, 0.0) + 0.16);
    float w = fbm(cuv * 0.7 + uTime * 0.004);
    float c = fbm(cuv * 1.5 + vec2(w * 1.7, -w * 1.2) - uTime * 0.006);
    float dens = smoothstep(0.34, 0.6, c) * smoothstep(-0.03, 0.08, h);
    dens *= 1.0 - smoothstep(0.9, 0.985, sd) * 0.85;
    float thin = 1.0 - smoothstep(0.5, 0.8, c);
    vec3 cDark = vec3(0.035, 0.035, 0.042) + vec3(0.22, 0.12, 0.06) * (1.0 - smoothstep(0.0, 0.25, h));
    vec3 cLit = vec3(1.25, 0.78, 0.36);
    vec3 cloud = mix(cDark, cLit, clamp(pow(sd, 6.0) * 1.6 * thin + pow(sd, 20.0), 0.0, 1.0));
    float edge = smoothstep(0.34, 0.42, c) * (1.0 - smoothstep(0.42, 0.52, c));
    cloud += cLit * edge * pow(sd, 4.0) * 1.2;
    col = mix(base, cloud, dens);
    vec3 t1 = normalize(cross(uSun, vec3(0.0, 1.0, 0.0))); vec3 t2 = cross(t1, uSun);
    vec3 rel = d - uSun * dot(d, uSun);
    float ang = atan(dot(rel, t2), dot(rel, t1));
    float rays = pow(vnoise(vec2(ang * 22.0, 1.0)), 3.0) + 0.6 * pow(vnoise(vec2(ang * 57.0, 5.0)), 4.0);
    col += vec3(1.3, 0.9, 0.45) * rays * smoothstep(0.75, 0.985, sd) * (1.0 - dens * 0.5) * 0.7;
  } else {
    col = mix(vec3(0.32, 0.02, 0.22), vec3(0.018, 0.004, 0.05), smoothstep(-0.05, 0.55, h));
    float aur = fbm(vec2(atan(d.z, d.x) * 3.0, h * 4.0 - uTime * 0.03));
    col += uAccent * smoothstep(0.55, 0.85, aur) * smoothstep(0.05, 0.4, h) * (1.0 - smoothstep(0.5, 0.9, h)) * 0.5;
    vec3 sc = floor(d * 180.0); float s = hash12(sc.xy + sc.z * 17.0);
    col += vec3(step(0.9965, s) * (0.6 + 0.4 * sin(uTime * 2.0 + s * 100.0)) * smoothstep(0.0, 0.2, h)) * 2.0;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat);
  sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  U.shift.value = 0; const envA = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
  U.shift.value = 1; const envB = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
  U.shift.value = 0; pmrem.dispose();
  scene.environment = envA;
  return { sky, envA, envB };
}

/** Sun rays in the ordinary realm, swinging stage lights after the Shift. */
export function buildRays(ctx) {
  const { U, scene, R } = ctx;
  const RAY_FS = /* glsl */`
uniform vec3 uColor; uniform float uInt; uniform float uTime; uniform float uSeed;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${NOISE}
void main(){
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(facing, 3.0);
  a *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  a *= 0.6 + 0.6 * vnoise(vec2(vUv.x * 18.0 + uSeed, vUv.y * 2.0 - uTime * 0.04));
  gl_FragColor = vec4(uColor, a * uInt);
}`;
  const rays = [];
  const S0 = V(0, 75, -100), UPN = V(0, -1, 0);
  for (let i = 0; i < 7; i++) {
    const end = V(-40 + i * 80 / 6 + R(-4, 4), 0, R(-32, 6));
    const dir = end.clone().sub(S0); const L = dir.length(); dir.normalize();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uInt: { value: 0.1 }, uTime: U.time, uSeed: { value: i * 13.7 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: RAY_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(R(1.0, 2.0), R(5, 9), L, 20, 1, true), mat);
    mesh.position.y = -L / 2;
    const pivot = new THREE.Group(); pivot.position.copy(S0); pivot.quaternion.setFromUnitVectors(UPN, dir); pivot.add(mesh); scene.add(pivot);
    rays.push({ pivot, mat, base: pivot.quaternion.clone() });
  }
  return rays;
}

/** Floating motes: warm dust and fireflies before the Shift, neon diamonds after. */
export function buildMotes(ctx) {
  const { U, scene, R, rnd, PAL, quality } = ctx;
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uPix: U.pix, uShift: U.shift },
    vertexShader: /* glsl */`
attribute vec3 aColor; attribute vec3 aColor2; attribute float aSize; attribute float aSeed;
uniform float uTime; uniform float uPix; uniform float uShift; varying vec3 vC; varying float vTw;
void main(){ vec3 p = position;
  p.x += sin(uTime * 0.13 + aSeed * 12.0) * 0.9;
  p.y += sin(uTime * 0.11 + aSeed * 7.0) * 0.6 + uShift * sin(uTime * 0.5 + aSeed * 3.0) * 0.5;
  p.z += cos(uTime * 0.09 + aSeed * 5.0) * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPix * (14.0 / max(0.5, -mv.z)) * mix(1.0, 2.2, uShift);
  vTw = 0.55 + 0.45 * sin(uTime * 1.7 + aSeed * 30.0); vC = mix(aColor, aColor2, uShift); }`,
    fragmentShader: /* glsl */`
uniform float uShift; varying vec3 vC; varying float vTw;
void main(){ vec2 c = gl_PointCoord * 2.0 - 1.0; float a;
  if (uShift > 0.5) { a = smoothstep(1.0, 0.7, abs(c.x) + abs(c.y)); } else { a = smoothstep(1.0, 0.0, length(c)); a *= a; }
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC * vTw, a * vTw); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const N = quality.motes; const pos = [], c1 = [], c2 = [], sz = [], sd = [];
  for (let i = 0; i < N; i++) {
    const fly = rnd() < 0.06;
    pos.push(R(-26, 26), fly ? R(3, 9) : R(0.3, 24), R(-36, 24));
    if (fly) { c1.push(0.4, 1.4, 1.7); sz.push(R(3.5, 5.5)); } else { const l = R(0.5, 1.3); c1.push(l, l * 0.8, l * 0.5); sz.push(R(1.2, 2.6)); }
    const n = PAL[i % PAL.length]; c2.push(n.r * 1.6, n.g * 1.6, n.b * 1.6); sd.push(rnd());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.Float32BufferAttribute(c1, 3));
  g.setAttribute('aColor2', new THREE.Float32BufferAttribute(c2, 3)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(sz, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
  const pts = new THREE.Points(g, dustMat); pts.frustumCulled = false; scene.add(pts);
}
