/* GLSL chunks shared by the world's materials. Lifted verbatim from design/handoff. */

export const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v; }
`;

/** The magic circle drawn on the ground (and in the water) after the Shift. */
export const MAGIC = /* glsl */`
uniform vec3 uAccent; uniform vec3 uPink; uniform vec3 uCyan; uniform vec3 uAcid; uniform float uTime;
uniform vec2 uWave; uniform vec3 uWaveCol;
float ringLine(float r, float R, float w){ return 1.0 - smoothstep(0.0, w, abs(r - R)); }
vec3 magicCircle(vec3 wp){
  vec2 p = wp.xz - vec2(0.0, -20.0);
  float r = length(p); float a = atan(p.y, p.x); float TAU = 6.2831853;
  float fw = fwidth(r) * 1.5;
  vec3 col = vec3(0.0);
  col += uCyan * (ringLine(r, 25.5, max(0.09, fw)) + ringLine(r, 27.6, max(0.06, fw))) * 1.7;
  float sd = abs(fract(a / TAU * 24.0) - 0.5) * TAU / 24.0 * r;
  col += uCyan * (1.0 - smoothstep(0.0, max(0.07, fw), sd)) * step(25.5, r) * step(r, 29.5) * 0.9;
  col += uAccent * (ringLine(r, 29.5, max(0.08, fw)) + ringLine(r, 33.5, max(0.08, fw))) * 2.4;
  float cells = 128.0;
  float fa = ((a + uTime * 0.04) / TAU + 0.5) * cells;
  float ci = mod(floor(fa), cells); float cu = fract(fa);
  float cv = (r - 29.9) / 3.2;
  float h = hash12(vec2(ci, 7.0));
  float glyph = 0.0;
  if (cv > 0.0 && cv < 1.0) {
    vec2 q = vec2(cu, cv); float w = 0.08;
    glyph += step(abs(q.x - 0.5), w) * step(0.15, q.y) * step(q.y, 0.85) * step(0.3, h);
    glyph += step(abs(q.y - 0.5), w) * step(0.2, q.x) * step(q.x, 0.8) * step(h, 0.72);
    glyph += step(abs(q.y - 0.18 - 0.64 * fract(h * 7.0)), w) * step(0.28, q.x) * step(q.x, 0.72);
    glyph += (1.0 - smoothstep(0.0, 0.05, abs(length(q - 0.5) - 0.3))) * step(0.84, h);
  }
  col += uAccent * clamp(glyph, 0.0, 1.0) * 2.0 * (0.55 + 0.45 * sin(uTime * 2.2 - ci * 0.35));
  col += uAcid * ringLine(r, 36.5, max(0.05, fw)) * 0.9;
  col += uPink * (ringLine(r, 42.0, 1.8) * (0.5 + 0.25 * sin(uTime * 1.6)) + ringLine(r, 42.0, max(0.14, fw)) * 2.5);
  col += uPink * ringLine(r, 46.0, max(0.04, fw)) * 0.6;
  // paint wave: a ring of the newly chosen colour sweeping outward from the tree
  if (uWave.y > 0.0) col += uWaveCol * (ringLine(r, uWave.x, 2.2) * 1.4 + ringLine(r, uWave.x, max(0.25, fw)) * 3.0) * uWave.y;
  return col;
}
`;

export const BASIC_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const WORLD_VS = /* glsl */`
varying vec3 vWPos; varying vec2 vUv;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const PASS_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
