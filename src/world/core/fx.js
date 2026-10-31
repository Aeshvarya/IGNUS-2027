import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { PASS_VS } from '../shaders/chunks.js';

/**
 * The crossing: a full-screen wormhole drawn over the scene while the camera passes through
 * the portal. Polar "infinite tunnel" mapping; walls carry Devanagari runes from the rune atlas,
 * speed streaks and pulsing rings, with a light at the far end. Disabled (zero cost) when uAmt = 0.
 */
export function createTunnelPass(runeTex) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uRunes: { value: runeTex }, uAmt: { value: 0 }, uTime: { value: 0 }, uDepth: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() },
    },
    vertexShader: PASS_VS,
    fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform sampler2D uRunes; uniform float uAmt; uniform float uTime; uniform float uDepth; uniform vec2 uRes;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec2 vUv;
float h11(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
void main(){
  vec4 base = texture2D(tDiffuse, vUv);
  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(p); float a = atan(p.y, p.x);
  float z = 0.42 / max(r, 0.015) + uDepth;
  float ang = a / 6.2831853 + 0.5 + z * 0.035;
  // rune tiles on the walls
  vec2 cell = vec2(ang * 30.0, z * 1.6);
  vec2 ci = floor(cell), cf = fract(cell);
  float h = fract(sin(dot(ci, vec2(12.9898, 78.233))) * 43758.5453);
  float g = floor(h * 16.0);
  vec2 auv = (vec2(cf.x, 1.0 - cf.y) * 0.84 + 0.08 + vec2(mod(g, 4.0), 3.0 - floor(g / 4.0))) / 4.0;
  float rune = smoothstep(0.55, 0.9, texture2D(uRunes, auv).a) * step(0.62, h);
  // speed streaks and rings
  float lane = floor(ang * 64.0);
  float streak = smoothstep(0.55, 1.0, fract(z * 0.35 + h11(lane) * 7.0)) * step(0.7, h11(lane + 3.0));
  float ring = smoothstep(0.9, 1.0, fract(z * 0.22));
  float band = 0.5 + 0.5 * sin(z * 0.55 + a * 3.0 + uTime * 2.0);
  vec3 col = mix(uA, uB * 0.22, band) * (0.35 + 0.9 * ring);
  col += uB * streak * 1.05 + uC * rune * 1.4;
  col *= smoothstep(0.0, 0.09, r) * (0.55 + 0.45 * smoothstep(0.0, 0.6, r));
  col += uC * exp(-r * 13.0) * 1.7;                // light at the end
  col *= 1.0 - smoothstep(0.85, 1.2, r) * 0.6;     // darker at the screen edge
  // The scene behind is the portal at point-blank range (very bright HDR), so the tunnel must
  // cover it completely once established; compress the base so the fade-in doesn't wash out.
  float m = smoothstep(0.0, 0.6, uAmt);
  vec3 b = base.rgb / (1.0 + base.rgb * (1.0 + 3.0 * m));
  gl_FragColor = vec4(mix(b, col, m), base.a);
}`,
  });
  pass.enabled = false;
  return pass;
}

/**
 * Screen-space god rays: radial blur of the brightest pixels away from the sun's screen position.
 * Ordinary realm only, on the ultra/high tiers.
 */
export function createGodraysPass(samples) {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.7) }, uAmt: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: PASS_VS,
    defines: { SAMPLES: samples },
    fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uAmt; uniform vec2 uRes;
varying vec2 vUv;
void main(){
  vec4 base = texture2D(tDiffuse, vUv);
  vec2 d = (vUv - uSun) * (0.92 / float(SAMPLES));
  vec2 uv = vUv; float illum = 1.0; vec3 acc = vec3(0.0);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  uv -= d * dither;
  for (int i = 0; i < SAMPLES; i++) {
    uv -= d;
    vec3 s = min(texture2D(tDiffuse, uv).rgb, vec3(2.0));
    float l = clamp(dot(s, vec3(0.299, 0.587, 0.114)) - 1.0, 0.0, 1.0);
    acc += s * l * illum;
    illum *= 0.955;
  }
  vec2 asp = (vUv - uSun) * vec2(uRes.x / uRes.y, 1.0);
  float fall = exp(-dot(asp, asp) * 1.6);
  gl_FragColor = vec4(base.rgb + acc * (0.55 / float(SAMPLES)) * uAmt * (0.3 + 0.7 * fall), base.a);
}`,
  });
  pass.enabled = false;
  return pass;
}
