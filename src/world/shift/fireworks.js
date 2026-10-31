import * as THREE from 'three';

/**
 * Fireworks over the magic circle. Entirely GPU-animated: each shell launches on its own
 * cycle, rises, bursts into a sphere of sparks that drift, fall and twinkle out. Launch spots
 * move every cycle (hashed in the shader). uAmt fades the whole show in for the final level.
 */
export function buildFireworks(ctx) {
  const { shiftOnly, R2, PAL, U, small } = ctx;
  const SHELLS = small ? 5 : 8, PER = small ? 70 : 120;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uPix: U.pix, uAmt: { value: 0 } },
    defines: { NS: SHELLS.toFixed(1) },
    vertexShader: /* glsl */`
attribute vec3 aDir; attribute vec3 aOrigin; attribute float aShell; attribute float aTrail; attribute float aH; attribute vec3 aColor;
uniform float uTime; uniform float uPix; uniform float uAmt; varying vec3 vC; varying float vA;
float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
void main(){
  float P = 5.4; float tt = uTime + aShell * P / NS;
  float cyc = floor(tt / P); float ph = tt - cyc * P;
  vec3 o = aOrigin + vec3(h1(cyc * 7.1 + aShell) - 0.5, 0.0, h1(cyc * 3.3 + aShell * 1.7) - 0.5) * 40.0;
  float rise = 1.15; vec3 pos; float a; float size;
  if (ph < rise) {
    float k = ph / rise; pos = o + vec3(0.0, k * aH, 0.0);
    a = aTrail * (0.5 + 0.5 * k); size = 3.0;
  } else {
    float bt = ph - rise;
    pos = o + vec3(0.0, aH, 0.0) + aDir * (1.0 - exp(-bt * 2.3)) * 12.0 - vec3(0.0, bt * bt * 1.4, 0.0);
    a = (1.0 - smoothstep(0.5, 2.8, bt)) * (0.65 + 0.35 * sin(bt * 26.0 + aDir.x * 40.0));
    size = 4.6 * max(0.2, 1.0 - bt * 0.3);
  }
  vec4 mv = modelViewMatrix * vec4(pos, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = size * uPix * (30.0 / max(1.0, -mv.z)) * step(0.01, a * uAmt);
  vC = aColor; vA = a * uAmt;
}`,
    fragmentShader: /* glsl */`
varying vec3 vC; varying float vA;
void main(){ vec2 c = gl_PointCoord * 2.0 - 1.0; float d = dot(c, c); if (d > 1.0) discard;
  gl_FragColor = vec4(vC * (1.0 + (1.0 - d) * 1.5), (1.0 - d) * vA); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const N = SHELLS * PER;
  const dir = new Float32Array(N * 3), org = new Float32Array(N * 3), shell = new Float32Array(N), trail = new Float32Array(N), hh = new Float32Array(N), col = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  for (let s = 0; s < SHELLS; s++) {
    const ang = R2(0, Math.PI * 2), rad = R2(8, 30), ox = Math.sin(ang) * rad, oz = -20 + Math.cos(ang) * rad, H = R2(38, 58);
    const c = PAL[s % PAL.length], c2 = PAL[(s + 2) % PAL.length];
    for (let k = 0; k < PER; k++) {
      const i = s * PER + k;
      v.set(R2(-1, 1), R2(-1, 1), R2(-1, 1)).normalize().multiplyScalar(R2(0.75, 1));
      dir.set([v.x, v.y, v.z], i * 3); org.set([ox, 0, oz], i * 3); shell[i] = s; trail[i] = k === 0 ? 1 : 0; hh[i] = H;
      const cc = k % 4 === 0 ? c2 : c; col.set([cc.r * 2.2, cc.g * 2.2, cc.b * 2.2], i * 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aOrigin', new THREE.BufferAttribute(org, 3));
  g.setAttribute('aShell', new THREE.BufferAttribute(shell, 1)); g.setAttribute('aTrail', new THREE.BufferAttribute(trail, 1));
  g.setAttribute('aH', new THREE.BufferAttribute(hh, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; shiftOnly.add(pts);
  return { set(amt) { mat.uniforms.uAmt.value = amt; pts.visible = amt > 0.001; } };
}
