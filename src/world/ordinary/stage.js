import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE, MAGIC, WORLD_VS } from '../shaders/chunks.js';
import { HEX, tint, flat, worldShade, paint } from '../core/util.js';
import { LV, tierR, topY, ZP } from '../core/context.js';

/** Shared surface materials: stone in the ordinary realm, toon in the Shift. */
export function createMaterials(ctx) {
  const STONE_CODE = `
  float sn1 = vnoise(vWPos.xz * 1.3 + vec2(vWPos.y * 2.0));
  float sn2 = fbm(vWPos.xz * 0.15 + vec2(vWPos.y * 0.3));
  diffuseColor.rgb *= 0.78 + 0.35 * sn1 + 0.25 * (sn2 - 0.5);`;
  const PAVE_CODE = `
  vec2 tp = vWPos.xz / 2.6; vec2 tf = abs(fract(tp) - 0.5);
  float grout = smoothstep(0.46, 0.5, max(tf.x, tf.y));
  float tileV = 0.72 + 0.5 * hash12(floor(tp));
  float farF = smoothstep(52.0, 66.0, length(vWPos.xz - vec2(0.0, -20.0)));
  vec3 paved = diffuseColor.rgb * tileV * (1.0 - grout * 0.55);
  vec3 grass = vec3(0.035, 0.05, 0.025) * (0.7 + 0.6 * fbm(vWPos.xz * 0.08));
  diffuseColor.rgb = mix(paved, grass, farF);`;
  const { gradientMap } = ctx;
  return {
    stepMat: worldShade(new THREE.MeshStandardMaterial({ color: 0x70665b, roughness: 0.45, metalness: 0.05, vertexColors: true, envMapIntensity: 0.22 }), STONE_CODE, 'stone'),
    pavingMat: worldShade(new THREE.MeshStandardMaterial({ color: 0x4e453c, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.18 }), PAVE_CODE, 'pave'),
    metalMat: new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.8, roughness: 0.4, envMapIntensity: 0.5 }),
    toonStone: new THREE.MeshToonMaterial({ color: 0x6d6690, gradientMap, vertexColors: true }),
    toonPlain: new THREE.MeshToonMaterial({ color: 0x3c3458, gradientMap }),
    toonDark: new THREE.MeshToonMaterial({ color: 0x302848, gradientMap }),
  };
}

/** The stepped plinth: concentric rings, like the campus plan. Neon nosing on every ring after the Shift. */
export function buildPlinth(ctx, mats) {
  const { R, PAL, scene, swap, shiftOnly } = ctx;
  const geos = [];
  for (let i = 0; i < LV; i++) {
    const g = new THREE.CylinderGeometry(tierR(i), tierR(i), 0.25, 112, 1);
    g.translate(0, i * 0.25 + 0.125, -20); tint(g, R(0.86, 1.0), i * 0.25 - 0.02, topY(i));
    geos.push(flat(g));
  }
  scene.add(swap(new THREE.Mesh(mergeGeometries(geos)), mats.stepMat, mats.toonStone));
  const rings = [];
  for (let i = 0; i < LV; i++) {
    const g = new THREE.TorusGeometry(tierR(i) + 0.012, 0.045, 5, 200); g.rotateX(Math.PI / 2); g.translate(0, topY(i) + 0.015, -20);
    rings.push(paint(g, PAL[i % PAL.length]));
  }
  shiftOnly.add(new THREE.Mesh(mergeGeometries(rings), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.9, 1.9, 1.9) })));
}

/** The glowing rivulet down the steps. Returns its two materials so the palette can recolour them. */
export function buildRivulet(ctx) {
  const WATER_FS = /* glsl */`
uniform float uTime; uniform float uFall; uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uHi; uniform vec3 uGlow;
varying vec3 vWPos; varying vec2 vUv;
#include <fog_pars_fragment>
${NOISE}
void main(){
  vec2 q = uFall > 0.5 ? vec2(vWPos.x * 1.6, vWPos.y * 3.0 + uTime * 2.2) : vec2(vWPos.x * 1.2, vWPos.z * 0.9 - uTime * 0.9);
  float n = fbm(q); float n2 = fbm(q * 2.3 + 7.1 + uTime * 0.15);
  float glow = exp(-distance(vWPos, vec3(0.0, 3.0, -20.0)) / 7.0);
  vec3 col = mix(uDeep, uMid, smoothstep(0.3, 0.75, n));
  col += uHi * smoothstep(0.62, 0.8, n2) * (0.35 + 1.6 * glow);
  col += uGlow * (0.35 + glow * 0.9);
  if (uFall > 0.5) col += vec3(0.85) * smoothstep(0.55, 0.85, n) * 0.5;
  col *= mix(0.55, 1.0, smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x));
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;
  function waterMat(fall) {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uFall: { value: fall ? 1 : 0 }, uDeep: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHi: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() } }]),
      vertexShader: WORLD_VS, fragmentShader: WATER_FS, fog: true, side: THREE.DoubleSide,
    });
    m.uniforms.uTime = ctx.U.time;
    return m;
  }
  const flatMat = waterMat(false), fallMat = waterMat(true);
  const CH = 0.38;
  class GeoB {
    constructor() { this.p = []; this.u = []; this.i = []; }
    v(x, y, z, u, w) { this.p.push(x, y, z); this.u.push(u, w); return this.p.length / 3 - 1; }
    quad(a, b, c, d) { this.i.push(a, c, b, b, c, d); }
    h(z0, z1, y) { this.quad(this.v(-CH, y, z0, 0, 0), this.v(CH, y, z0, 1, 0), this.v(-CH, y, z1, 0, 1), this.v(CH, y, z1, 1, 1)); }
    vert(z, yT, yB) { this.quad(this.v(-CH, yT, z, 0, 0), this.v(CH, yT, z, 1, 0), this.v(-CH, yB, z, 0, 1), this.v(CH, yB, z, 1, 1)); }
    build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setIndex(this.i); g.computeVertexNormals(); return g; }
  }
  const fl = new GeoB(), fa = new GeoB(); const e = 0.016;
  fl.h(ZP + 1.5, -20 + tierR(LV - 1), topY(LV - 1) + e);
  for (let i = LV - 1; i >= 1; i--) {
    const z = -20 + tierR(i) + 0.01;
    fa.vert(z, topY(i) + e, topY(i - 1) + e);
    fl.h(-20 + tierR(i), -20 + tierR(i - 1), topY(i - 1) + e);
  }
  fa.vert(-20 + tierR(0) + 0.01, topY(0) + e, 0.025);
  ctx.scene.add(new THREE.Mesh(fl.build(), flatMat), new THREE.Mesh(fa.build(), fallMat));
  return { waterFlatMat: flatMat, waterFallMat: fallMat };
}

/**
 * The wet, reflecting plaza. On the low tier the Reflector (which re-renders the whole scene)
 * is replaced by a fake: sky gradient plus a glow streak where the portal and rivulet would reflect.
 * Returns { pool, reflect } where reflect.set(n) renders the mirror every n-th frame (0 = freeze).
 */
export function buildPool(ctx) {
  const { U, scene, quality } = ctx;
  const REFL = quality.reflection;
  const POOL_SHADER = {
    name: 'IgnusPool',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      uShift: { value: 0 }, uTint: { value: new THREE.Color(0.9, 0.85, 0.8) }, uStone: { value: new THREE.Color(0.06, 0.05, 0.045) },
      uAccent: { value: new THREE.Color() }, uPink: { value: new THREE.Color(HEX.rani) }, uCyan: { value: new THREE.Color(HEX.cyan) }, uAcid: { value: new THREE.Color(HEX.acid) }, uTime: { value: 0 },
      uSkyLo: { value: new THREE.Color(1.0, 0.5, 0.2) }, uSkyHi: { value: new THREE.Color(0.08, 0.07, 0.08) }, uGlowC: { value: new THREE.Color(0.2, 0.8, 1.0) },
      uWave: { value: new THREE.Vector2() }, uWaveCol: { value: new THREE.Color() }, uRip: { value: [] },
    },
    vertexShader: /* glsl */`
uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vWPos;
#include <fog_pars_vertex>
void main(){ vUvR = textureMatrix * vec4(position, 1.0); vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */`
uniform vec3 color; uniform sampler2D tDiffuse; uniform float uShift; uniform vec3 uTint; uniform vec3 uStone;
uniform vec3 uSkyLo; uniform vec3 uSkyHi; uniform vec3 uGlowC; uniform vec4 uRip[6];
varying vec4 vUvR; varying vec3 vWPos;
#include <fog_pars_fragment>
${NOISE}
${MAGIC}
void main(){
  vec2 p = vWPos.xz;
  float n = fbm(p * 0.22 + 3.0);
  float streak = vnoise(vec2(p.x * 3.2, p.y * 0.35 + uTime * 0.25)) - 0.5;
  float rip = vnoise(p * vec2(1.8, 4.5) + vec2(uTime * 0.35, -uTime * 0.5)) - 0.5;
  // rings from the visitor's cursor (uRip: x, z, strength, birth time)
  float rw = 0.0;
  for (int i = 0; i < 6; i++) {
    float age = uTime - uRip[i].w;
    if (age < 0.0 || age > 3.2) continue;
    float d = distance(p, uRip[i].xy); float front = age * 5.5;
    rw += sin((d - front) * 4.5) * exp(-abs(d - front) * 0.9) * exp(-age * 1.2) * uRip[i].z;
  }
  rip += rw * 0.9;
  vec4 uvr = vUvR;
  uvr.x += rip * 0.006 * uvr.w;
  uvr.y += (streak * 0.05 + rip * 0.01) * uvr.w;
  vec3 refl = texture2DProj(tDiffuse, uvr).rgb;
  float wet = smoothstep(0.3, 0.52, n);
  vec2 tp = p / 2.6; vec2 f = abs(fract(tp) - 0.5); float grout = smoothstep(0.46, 0.5, max(f.x, f.y));
  vec3 stone = uStone * (0.7 + 0.5 * hash12(floor(tp))) * (1.0 - grout * 0.5);
  vec3 col = mix(stone + refl * 0.22, refl * uTint, wet);
  if (uShift > 0.5) col += magicCircle(vWPos) * mix(0.9, 0.55, wet);
  col += uGlowC * max(rw, 0.0) * 0.22;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`,
  };
  let pool;
  const reflect = { every: REFL > 0 ? quality.reflectEvery : 0, set(n) { this.every = n; } };
  if (REFL > 0) {
    pool = new Reflector(new THREE.PlaneGeometry(84, 54), {
      textureWidth: Math.round(innerWidth * ctx.pr * REFL), textureHeight: Math.round(innerHeight * ctx.pr * REFL),
      clipBias: 0.003, color: 0xffffff, multisample: 0, shader: POOL_SHADER,
    });
    // Throttle the mirror pass: render it every n-th frame, or freeze it (n = 0).
    const renderMirror = pool.onBeforeRender;
    let frame = 0, primed = false;
    pool.onBeforeRender = function (...args) {
      frame++;
      if (!primed || (reflect.every > 0 && frame % reflect.every === 0)) { primed = true; renderMirror.apply(this, args); }
    };
    Object.assign(pool.material.uniforms, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
  } else {
    const FAKE = `
  float zf = smoothstep(46.0, -8.0, p.y);
  vec3 refl = mix(uSkyHi, uSkyLo, zf * zf);
  refl += uGlowC * exp(-abs(p.x + rip * 0.8) / 2.2) * (0.55 + 1.6 * max(streak, 0.0)) * (0.4 + 0.6 * zf);
  refl *= 0.85 + rip * 0.5;`;
    const frag = POOL_SHADER.fragmentShader.replace('vec3 refl = texture2DProj(tDiffuse, uvr).rgb;', FAKE);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, POOL_SHADER.uniforms, { textureMatrix: { value: new THREE.Matrix4() } }]),
      vertexShader: POOL_SHADER.vertexShader, fragmentShader: frag, fog: true,
    });
    pool = new THREE.Mesh(new THREE.PlaneGeometry(84, 54), mat);
    pool.getRenderTarget = () => ({ setSize() {} });
  }
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.02, 19);
  pool.material.fog = true;
  const pu = pool.material.uniforms;
  pu.uTime = U.time; pu.uAccent = U.accent; pu.uWave = U.wave; pu.uWaveCol = U.waveCol; pu.uRip = U.ripples;
  scene.add(pool);
  return { pool, reflect };
}

/** The ground: paving in the ordinary realm, a neon grid with the magic circle after the Shift. */
export function buildGround(ctx, mats) {
  const { U, scene, swap } = ctx;
  const groundGeo = new THREE.PlaneGeometry(520, 520); groundGeo.rotateX(-Math.PI / 2);
  const neonGroundMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uAccent: { value: new THREE.Color() }, uPink: { value: new THREE.Color(HEX.rani) }, uCyan: { value: new THREE.Color(HEX.cyan) }, uAcid: { value: new THREE.Color(HEX.acid) }, uWave: { value: new THREE.Vector2() }, uWaveCol: { value: new THREE.Color() } }]),
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */`
varying vec3 vWPos; varying vec2 vUv;
#include <fog_pars_fragment>
${NOISE}
${MAGIC}
void main(){
  float r = length(vWPos.xz - vec2(0.0, -20.0));
  vec3 col = vec3(0.010, 0.004, 0.026) + vec3(0.05, 0.0, 0.07) * exp(-r / 26.0);
  vec2 gc = vWPos.xz / 4.0;
  vec2 gd = abs(fract(gc - 0.5) - 0.5) / fwidth(gc);
  col += uPink * (1.0 - min(min(gd.x, gd.y), 1.0)) * 0.28 * exp(-r / 70.0);
  col += magicCircle(vWPos);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`,
    fog: true,
  });
  Object.assign(neonGroundMat.uniforms, { uTime: U.time, uAccent: U.accent, uWave: U.wave, uWaveCol: U.waveCol });
  scene.add(swap(new THREE.Mesh(groundGeo), mats.pavingMat, neonGroundMat));
}
