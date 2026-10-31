import * as THREE from 'three';
import { NOISE, BASIC_VS } from '../shaders/chunks.js';
import { V } from '../core/util.js';
import { PORTAL, RX, RY, ZF, ZP } from '../core/context.js';

/** The portal: oval plasma, rim tubes, an additive halo and particles flowing in. */
export function buildPortal(ctx) {
  const { U, scene, R, rnd, small } = ctx;
  const PORTAL_FS = /* glsl */`
uniform float uTime; uniform float uPower; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
  float ang = a + (1.0 - r) * 2.4 + uTime * (0.22 + 0.9 * uPower);
  vec2 sp = vec2(cos(ang), sin(ang)) * r;
  vec2 q = vec2(fbm(sp * 2.6 + uTime * 0.18), fbm(sp * 2.6 - uTime * 0.15 + 4.3));
  float n = fbm(sp * 3.6 + q * 2.4);
  float vein = 1.0 - smoothstep(0.0, 0.05 + 0.05 * uPower, abs(n - 0.5));
  float vein2 = 1.0 - smoothstep(0.0, 0.025, abs(fbm(sp * 6.5 - q * 1.6 + 2.0) - 0.5));
  float rim = smoothstep(0.62, 1.0, r);
  float core = 1.0 - smoothstep(0.0, 0.6, r);
  vec3 col = uA * (0.4 + 1.0 * n);
  col = mix(col, uB * 1.1, vein * 0.85);
  col += uB * vein2 * 0.45;
  col += uB * rim * rim * 1.4;
  col += uC * pow(vein, 6.0) * (0.55 + 2.0 * uPower);
  col *= mix(1.0, 0.45, core * (1.0 - uPower));
  col += uC * pow(core, 1.5) * uPower * 2.2;
  gl_FragColor = vec4(col * (0.75 + uPower * 1.3), 1.0);
}`;
  const discMat = new THREE.ShaderMaterial({ uniforms: { uTime: U.time, uPower: { value: 0 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() } }, vertexShader: BASIC_VS, fragmentShader: PORTAL_FS, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), discMat); disc.scale.set(RX, RY, 1); disc.position.set(0, PORTAL.y, ZF); scene.add(disc);

  const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color() });
  const e = new THREE.EllipseCurve(0, 0, RX + 0.04, RY + 0.04).getPoints(160);
  for (const dz of [0.12, -0.12]) {
    const pts = e.slice(0, -1).map((p) => V(p.x, PORTAL.y + p.y, ZF + dz));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 220, 0.05, 6, true), rimMat));
  }

  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uInt: { value: 1 } }, vertexShader: BASIC_VS,
    fragmentShader: `uniform vec3 uColor; uniform float uInt; varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); float a = pow(1.0 - smoothstep(0.18, 1.0, r), 2.2) * uInt; gl_FragColor = vec4(uColor, a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), haloMat); halo.position.set(0, PORTAL.y, ZP - 0.7); scene.add(halo);

  const inflowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uPix: U.pix, uPower: { value: 0 }, uColor: { value: new THREE.Color() } },
    vertexShader: /* glsl */`
uniform float uTime; uniform float uPix; uniform float uPower; attribute vec4 aSeed; varying float vA;
void main(){
  float t = fract(aSeed.w + uTime * aSeed.z * (0.6 + uPower * 1.5));
  float r = mix(aSeed.y, 0.25, t * t);
  float ang = aSeed.x + t * 6.0 + uTime * 0.3;
  vec3 p = vec3(cos(ang) * r, sin(ang) * r, (1.0 - t) * mix(1.5, 4.5, fract(aSeed.x * 7.0)));
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + 2.5 * (1.0 - t)) * uPix * (30.0 / max(0.5, -mv.z));
  vA = sin(t * 3.14159);
}`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord * 2.0 - 1.0); float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(uColor, a * a * vA); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  {
    const N = small ? 220 : 420; const g = new THREE.BufferGeometry(); const seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { seed[i * 4] = R(0, Math.PI * 2); seed[i * 4 + 1] = R(4.2, 9); seed[i * 4 + 2] = R(0.05, 0.16); seed[i * 4 + 3] = rnd(); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const pts = new THREE.Points(g, inflowMat); pts.frustumCulled = false; pts.position.set(0, PORTAL.y, ZF); pts.scale.set(RX / 4.2, RY / 4.2, 1); scene.add(pts);
  }

  return { discMat, rimMat, haloMat, inflowMat };
}
