import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PASS_VS } from '../shaders/chunks.js';
import { createTunnelPass, createGodraysPass } from './fx.js';

/**
 * Post chain: [god rays] → [crossing tunnel] → ink outlines → bloom → tone map →
 * grade (portal lensing, aberration, halftone, vignette, grain, flash).
 */
export function buildPost(renderer, scene, camera, ctx, { runeTex }) {
  const { quality, pr } = ctx;
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: quality.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const godrays = quality.godrays ? createGodraysPass(quality.godrays) : null;
  if (godrays) composer.addPass(godrays);
  const tunnel = createTunnelPass(runeTex);
  composer.addPass(tunnel);

  const inkPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 0 } },
    vertexShader: PASS_VS,
    fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uAmt; varying vec2 vUv;
float L(vec2 o){ vec3 c = texture2D(tDiffuse, vUv + o).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114)); return l / (1.0 + l); }
void main(){
  vec4 base = texture2D(tDiffuse, vUv);
  if (uAmt < 0.001) { gl_FragColor = base; return; }
  vec2 px = 1.25 / uRes;
  float tl = L(px * vec2(-1.0, 1.0)), t = L(px * vec2(0.0, 1.0)), tr = L(px * vec2(1.0, 1.0));
  float l = L(px * vec2(-1.0, 0.0)), r = L(px * vec2(1.0, 0.0));
  float bl = L(px * vec2(-1.0, -1.0)), b = L(px * vec2(0.0, -1.0)), br = L(px * vec2(1.0, -1.0));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float ink = smoothstep(0.12, 0.35, sqrt(gx * gx + gy * gy)) * uAmt;
  gl_FragColor = vec4(base.rgb * (1.0 - ink * 0.85), base.a);
}`,
  });
  composer.addPass(inkPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.4, 1.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) }, uAberr: { value: 0 }, uVig: { value: 0.6 }, uShift: { value: 0 }, uGrain: { value: 0.035 }, uRes: { value: new THREE.Vector2(1, 1) }, uDot: { value: 5 },
      uLens: { value: 0 }, uLensC: { value: new THREE.Vector2(0.5, 0.5) }, uLensR: { value: 0.1 } },
    vertexShader: PASS_VS,
    fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform float uTime; uniform float uFlash; uniform vec3 uFlashCol; uniform float uAberr; uniform float uVig; uniform float uShift; uniform float uGrain; uniform vec2 uRes; uniform float uDot;
uniform float uLens; uniform vec2 uLensC; uniform float uLensR;
varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  // gravitational lensing: space bends in a band around the portal's rim
  if (uLens > 0.001) {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 dp = (uv - uLensC) * asp; float r = length(dp);
    float band = exp(-pow((r - uLensR * 1.22) / (uLensR * 0.5), 2.0));
    float wob = 1.0 + 0.12 * sin(uTime * 2.6 + r * 38.0);
    uv -= (dp / max(r, 1e-4)) * band * uLens * uLensR * 0.16 * wob / asp;
  }
  vec2 d = uv - 0.5;
  float ab = uAberr * (0.4 + dot(d, d) * 4.0);
  vec3 col = vec3(texture2D(tDiffuse, uv - d * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + d * ab).b);
  if (uShift > 0.001) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 cell = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uDot;
    float dd = length(fract(cell) - 0.5);
    float rad = 0.55 * sqrt(clamp(1.0 - lum * 1.6, 0.0, 1.0));
    float dotm = smoothstep(rad + 0.06, rad - 0.06, dd);
    float mask = smoothstep(0.03, 0.18, lum) * (1.0 - smoothstep(0.45, 0.8, lum));
    col = mix(col, col * (1.0 - 0.5 * dotm), 0.7 * uShift * mask);
  }
  col *= mix(1.0, smoothstep(0.85, 0.2, length(d * vec2(1.1, 1.0))), uVig);
  col += (h21(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
  col = mix(col, uFlashCol, clamp(uFlash, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`,
  });
  composer.addPass(finalPass);
  return { composer, inkPass, bloom, finalPass, tunnel, godrays };
}
