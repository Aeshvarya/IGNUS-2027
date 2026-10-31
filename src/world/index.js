import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp, smooth } from './core/util.js';
import { createContext, LAMPS, PORTAL, ZF, SUN } from './core/context.js';
import { createMaterials, buildPlinth, buildRivulet, buildPool, buildGround } from './ordinary/stage.js';
import { createTree } from './ordinary/tree.js';
import { buildPortal } from './ordinary/portal.js';
import { buildLampsAndWalls, buildSurroundings } from './ordinary/landscape.js';
import { buildSky, buildRays, buildMotes } from './core/atmosphere.js';
import { buildShiftLayer } from './shift/layer.js';
import { buildPost } from './core/post.js';
import { sampleStory } from './core/camera.js';

const MODEL_URL = '/models/knowledge-tree.glb';

/**
 * Builds the IGNUS world into `canvas`.
 * @param {{ canvas: HTMLCanvasElement, quality: object, reduceMotion: boolean, onProgress?: (f:number)=>void }} opts
 * @returns world API: update(u, dt, t), resize(), dist(), setAccent(hex), highlight(i), setPointer(x, y)
 */
export async function createWorld({ canvas, quality, reduceMotion, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
  let pr = Math.min(window.devicePixelRatio || 1, quality.maxDpr);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x4a3324, 0.0085);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 900);

  // Build order matters: the seeded RNG is consumed in this exact sequence.
  const ctx = createContext({ scene, quality });
  ctx.pr = pr;
  const { U, PAL } = ctx;
  const mats = createMaterials(ctx);
  buildPlinth(ctx, mats);
  const { waterFlatMat, waterFallMat } = buildRivulet(ctx);
  const pool = buildPool(ctx);
  buildGround(ctx, mats);
  const tree = createTree(ctx);
  const { discMat, rimMat, haloMat, inflowMat } = buildPortal(ctx);
  const { lampHeads, lampLights } = buildLampsAndWalls(ctx, mats);
  const { mistTex } = buildSurroundings(ctx, mats);
  const { sky, envA, envB } = buildSky(ctx, renderer);
  const rays = buildRays(ctx);
  buildMotes(ctx);
  const { runes, markers, planet, burstMat } = buildShiftLayer(ctx, mats);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffcf9a, 0x24180f, 0.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc787, 2.2); sun.position.copy(SUN).multiplyScalar(100); scene.add(sun);
  const pLight = new THREE.PointLight(0x55ddff, 26, 30, 2); pLight.position.set(0, PORTAL.y - 1.2, ZF + 2.4); scene.add(pLight);
  const fill = new THREE.DirectionalLight(0xffb27a, 1.8); fill.position.set(8, 16, 40); scene.add(fill);
  const stepLight = new THREE.PointLight(0x3fd8ff, 10, 16, 2); stepLight.position.set(0, 3.6, -10); scene.add(stepLight);
  const neonL = new THREE.PointLight(0x5ef2ff, 0, 34, 2); neonL.position.set(-14, 7, -14);
  const neonR = new THREE.PointLight(0xdcff3c, 0, 34, 2); neonR.position.set(14, 7, -14);
  scene.add(neonL, neonR);

  const { composer, inkPass, bloom, finalPass } = buildPost(renderer, scene, camera, ctx);

  /* ---------- palettes for each realm ---------- */
  let realm = false;
  const lampWarm = new THREE.Color(2.6, 1.7, 0.8), tmpC = new THREE.Color();
  function applyPalette() {
    const s = realm; const acc = U.accent.value; const pu = pool.material.uniforms;
    if (!s) {
      discMat.uniforms.uA.value.setRGB(0.0, 0.04, 0.09); discMat.uniforms.uB.value.setRGB(0.25, 0.85, 1.0); discMat.uniforms.uC.value.setRGB(0.85, 1.0, 1.0);
      rimMat.color.setRGB(0.5, 2.2, 3.0);
      haloMat.uniforms.uColor.value.setRGB(0.1, 0.45, 0.65); inflowMat.uniforms.uColor.value.setRGB(0.6, 1.6, 2.0);
      pLight.color.set(0x55ddff); stepLight.color.set(0x3fd8ff);
      for (const m of [waterFlatMat, waterFallMat]) { m.uniforms.uDeep.value.setRGB(0.004, 0.03, 0.045); m.uniforms.uMid.value.setRGB(0.02, 0.12, 0.16); m.uniforms.uHi.value.setRGB(0.5, 1.4, 1.6); m.uniforms.uGlow.value.setRGB(0.08, 0.5, 0.7); }
      pu.uTint.value.setRGB(0.92, 0.86, 0.8); pu.uStone.value.setRGB(0.06, 0.05, 0.045);
      rays.forEach((r) => { r.mat.uniforms.uColor.value.setRGB(1.0, 0.82, 0.55); r.mat.uniforms.uInt.value = 0.03; });
      LAMPS.forEach((l, i) => lampHeads.setColorAt(i, lampWarm));
      lampLights.forEach((l) => l.color.set(0xffb36b));
    } else {
      discMat.uniforms.uA.value.setRGB(0.06, 0.0, 0.1); discMat.uniforms.uB.value.copy(acc); discMat.uniforms.uC.value.setRGB(1.0, 0.95, 0.6);
      rimMat.color.copy(acc).multiplyScalar(2.8);
      haloMat.uniforms.uColor.value.copy(acc).multiplyScalar(0.6); inflowMat.uniforms.uColor.value.copy(PAL[1]).multiplyScalar(1.8);
      pLight.color.copy(acc); stepLight.color.set(0x5ef2ff);
      for (const m of [waterFlatMat, waterFallMat]) { m.uniforms.uDeep.value.setRGB(0.03, 0.0, 0.08); m.uniforms.uMid.value.copy(acc).multiplyScalar(0.22); m.uniforms.uHi.value.setRGB(0.6, 2.0, 2.2); m.uniforms.uGlow.value.copy(acc).multiplyScalar(0.6); }
      pu.uTint.value.setRGB(0.85, 0.8, 1.0); pu.uStone.value.setRGB(0.03, 0.01, 0.06);
      rays.forEach((r, i) => { r.mat.uniforms.uColor.value.copy(PAL[i % PAL.length]); r.mat.uniforms.uInt.value = 0.32; });
      LAMPS.forEach((l, i) => lampHeads.setColorAt(i, tmpC.copy(PAL[(i + 1) % PAL.length]).multiplyScalar(2.6)));
      lampLights.forEach((l, i) => l.color.copy(PAL[(i + 1) % PAL.length]));
    }
    lampHeads.instanceColor.needsUpdate = true;
  }
  function setRealm(s) {
    realm = s;
    ctx.thresholdOnly.visible = !s; ctx.shiftOnly.visible = s;
    for (const w of ctx.swaps) w.mesh.material = s ? w.b : w.a;
    for (const c of ctx.colorSwaps) { c.im.instanceColor.array.set(s ? c.b : c.a); c.im.instanceColor.needsUpdate = true; }
    scene.environment = s ? envB : envA;
    fog.color.set(s ? 0x16072e : 0x4a3324); fog.density = s ? 0.0062 : 0.0085;
    hemi.color.set(s ? 0xff7ad9 : 0xffcf9a); hemi.groundColor.set(s ? 0x1d0b46 : 0x24180f); hemi.intensity = s ? 1.0 : 0.35;
    sun.color.set(s ? 0xa8dcff : 0xffc787); sun.intensity = s ? 1.4 : 2.2;
    fill.color.set(s ? 0xb9a2ff : 0xffb27a); fill.intensity = s ? 0.5 : 1.8;
    neonL.intensity = s ? 120 : 0; neonR.intensity = s ? 120 : 0;
    U.shift.value = s ? 1 : 0; pool.material.uniforms.uShift.value = s ? 1 : 0;
    inkPass.uniforms.uAmt.value = s ? 0.75 : 0;
    finalPass.uniforms.uShift.value = s ? 1 : 0;
    renderer.toneMappingExposure = s ? 1.05 : 1.0;
    bloom.threshold = s ? 1.15 : 1.3; bloom.strength = s ? 0.5 : 0.55;
    applyPalette();
  }

  /* ---------- sizing ---------- */
  let baseFov = 48;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    pool.getRenderTarget().setSize(Math.max(64, Math.round(w * pr * quality.reflection)), Math.max(64, Math.round(h * pr * quality.reflection)));
    camera.aspect = w / h;
    baseFov = clamp(2 * Math.atan(Math.tan(27 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 48, 78);
    inkPass.uniforms.uRes.value.set(w * pr, h * pr); finalPass.uniforms.uRes.value.set(w * pr, h * pr); finalPass.uniforms.uDot.value = 4.5 * pr;
    U.pix.value = pr * h / 900;
  }
  resize();

  /* ---------- load the knowledge tree ---------- */
  const gltfLoader = new GLTFLoader();
  const report = (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); };
  const gltf = await new Promise((resolve) => {
    gltfLoader.load(MODEL_URL, resolve, report, (err) => { console.warn('The knowledge tree could not be loaded from ' + MODEL_URL, err); resolve(null); });
  });
  if (gltf) tree.attach(gltf);

  /* ---------- warm both realms up behind the loader ---------- */
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), look = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  sampleStory(0, camP, camL); camera.position.copy(camP); camera.lookAt(camL); camera.updateProjectionMatrix(); sky.position.copy(camera.position);
  setRealm(true); renderer.compile(scene, camera); composer.render();
  setRealm(false); renderer.compile(scene, camera); composer.render();

  /* ---------- per frame ---------- */
  let tmx = 0, tmy = 0, mx = 0, my = 0, kick = 0, burstStart = -99, first = true, fpsAcc = 0, fpsN = 0, hlTarget = -1;
  const onPointer = (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = -((e.clientY / innerHeight) * 2 - 1); };
  addEventListener('pointermove', onPointer, { passive: true });
  const cyanWhite = new THREE.Color(0.85, 1, 1), pinkWhite = new THREE.Color(1, 0.88, 0.96);
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();

  function update(u, dt, t) {
    U.time.value = t;
    const s = u >= 3;
    if (s !== realm) { setRealm(s); if (!first) { kick = 1; if (s) burstStart = t; } }
    first = false;

    sampleStory(u, camP, camL);
    const k = u < 3 ? smooth(2.45, 3.0, u) : 1 - smooth(3.0, 3.35, u);

    const damp = 1 - Math.exp(-dt * 3);
    mx += (tmx - mx) * damp; my += (tmy - my) * damp;
    look.subVectors(camL, camP).normalize(); right.crossVectors(look, UP).normalize(); upv.crossVectors(right, look);
    const par = reduceMotion ? 0 : (1 - k) * (u > 5.5 ? 0.4 : 1);
    camera.position.copy(camP).addScaledVector(right, mx * 0.7 * par).addScaledVector(upv, my * 0.4 * par + Math.sin(t * 0.5) * 0.05 * par);
    camera.lookAt(look.copy(camL).addScaledVector(right, mx * 0.25 * par));
    camera.fov = baseFov + 24 * k * k; camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
    tree.clipU.value.set(camera.position.x, camera.position.y, camera.position.z, 4.2 * smooth(0.2, 0.75, k));

    discMat.uniforms.uPower.value = k; inflowMat.uniforms.uPower.value = k;
    pLight.intensity = (s ? 110 : 22) * (1 + k * 1.5);
    haloMat.uniforms.uInt.value = (s ? 0.5 : 0.32) * (1 + k);
    if (!s) mistTex.offset.x = t * 0.004;

    kick = Math.max(0, kick - dt * 1.6);
    const fu = finalPass.uniforms;
    fu.uFlash.value = Math.max(smooth(0.8, 1.0, k), kick * 0.9) * (reduceMotion ? 0.55 : 0.92);
    fu.uFlashCol.value.copy(u < 3 ? cyanWhite : pinkWhite);
    fu.uAberr.value = (s ? 0.0016 : 0.0006) + 0.022 * k * k;
    fu.uVig.value = s ? 0.35 : 0.55; fu.uTime.value = t;
    burstMat.uniforms.uT.value = t - burstStart;

    if (s) {
      runes.rotation.y = t * 0.04;
      planet.rotation.y += dt * 0.05;
      rays.forEach((r, i) => { tmpE.set(Math.sin(t * 0.6 + i) * 0.18, 0, Math.cos(t * 0.5 + i * 1.7) * 0.18); tmpQ.setFromEuler(tmpE); r.pivot.quaternion.copy(r.base).multiply(tmpQ); });
      markers.forEach((m, i) => {
        m.hl += ((hlTarget === i ? 1 : 0) - m.hl) * (1 - Math.exp(-dt * 8));
        m.gem.rotation.y = t * 1.5 + i; m.gem.position.y = 9 + Math.sin(t * 1.5 + i) * 0.35;
        const sc = 1 + m.hl * 0.7; m.gem.scale.set(sc, 1.7 * sc, sc); m.spr.scale.set(6.4 * (1 + m.hl * 0.25), 1.6 * (1 + m.hl * 0.25), 1);
      });
    } else {
      rays.forEach((r) => r.pivot.quaternion.copy(r.base));
    }

    composer.render();

    // Adaptive resolution: if frames run long, drop the pixel ratio.
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2.5) { if (fpsAcc / fpsN > 0.028 && pr > 0.75) { pr = Math.max(0.75, pr - 0.2); resize(); } fpsAcc = 0; fpsN = 0; }
  }

  return {
    update, resize,
    dist: () => camera.position.distanceTo(PORTAL),
    setAccent(hex) { U.accent.value.set(hex); applyPalette(); },
    highlight(i) { hlTarget = i; },
  };
}
