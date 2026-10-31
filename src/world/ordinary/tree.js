import * as THREE from 'three';
import { HEX, V } from '../core/util.js';
import { PLINTH_TOP, TREE_S, ZP } from '../core/context.js';

/**
 * The knowledge-tree monument. Returns the group (model is added once loaded), the clip
 * uniform (fragments near the camera dissolve so the flight through the portal passes
 * cleanly through the trunk) and attach(gltf) to wire materials for both realms.
 */
export function createTree(ctx) {
  const { U, scene, swap } = ctx;
  const group = new THREE.Group();
  group.position.set(0, PLINTH_TOP - 0.02, ZP); group.scale.setScalar(TREE_S);
  scene.add(group);

  const clipU = { value: new THREE.Vector4(0, 0, 0, 0) };
  const CLIP_GLSL = 'if (uClip.w > 0.0 && distance(vClipW, uClip.xyz) < uClip.w * (0.8 + 0.4 * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453))) discard;';

  function addClip(mat) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uClip = clipU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vClipW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vClipW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vClipW;\nuniform vec4 uClip;')
        .replace('void main() {', 'void main() {\n  ' + CLIP_GLSL);
    };
    mat.customProgramCacheKey = () => 'tree-clip';
    return mat;
  }

  // The Shift version: copper turns to the player's neon, faces and circuit plate to ink with cyan rims.
  function neonTreeMaterial(map) {
    if (map) map.updateMatrix();
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uMap: { value: null }, uUvT: { value: new THREE.Matrix3() }, uHasMap: { value: map ? 1 : 0 },
        uAccent: { value: new THREE.Color() }, uCyan: { value: new THREE.Color(HEX.cyan) }, uInk: { value: new THREE.Color(0x1c0c38) },
        uLight: { value: V(-0.45, 0.75, 0.55).normalize() }, uClip: { value: new THREE.Vector4() },
      }]),
      vertexShader: /* glsl */`
uniform mat3 uUvT; varying vec2 vUv; varying vec3 vN; varying vec3 vClipW;
#include <fog_pars_vertex>
void main(){ vUv = (uUvT * vec3(uv, 1.0)).xy; vec4 wp = modelMatrix * vec4(position, 1.0); vClipW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
      fragmentShader: /* glsl */`
uniform sampler2D uMap; uniform float uHasMap; uniform vec3 uAccent; uniform vec3 uCyan; uniform vec3 uInk; uniform vec3 uLight; uniform vec4 uClip;
varying vec2 vUv; varying vec3 vN; varying vec3 vClipW;
#include <fog_pars_fragment>
void main(){
  ${CLIP_GLSL}
  vec3 t = uHasMap > 0.5 ? pow(texture2D(uMap, vUv).rgb, vec3(1.0 / 2.2)) : vec3(0.5, 0.35, 0.25);
  float mx = max(t.r, max(t.g, t.b)), mn = min(t.r, min(t.g, t.b));
  float lum = (t.r + t.g + t.b) / 3.0, sat = (mx - mn) / (mx + 1e-4);
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vClipW);
  float ndl = dot(n, uLight); float toon = ndl > 0.55 ? 1.0 : (ndl > 0.1 ? 0.62 : 0.32);
  float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
  float copper = smoothstep(0.16, 0.28, sat) * step(0.14, lum);
  float black = 1.0 - smoothstep(0.1, 0.17, lum);
  vec3 cu = uAccent * (0.22 + 0.85 * toon) + uAccent * fr * 1.6;
  vec3 gr = mix(uInk * 1.4, uCyan * 0.5, toon * smoothstep(0.3, 0.5, lum)) + uCyan * fr * 1.1;
  vec3 bk = uInk * (0.5 + 0.7 * toon) + uCyan * fr * 1.8;
  vec3 col = mix(gr, cu, copper); col = mix(col, bk, black);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`,
      fog: true,
    });
    m.uniforms.uMap.value = map || null; if (map) m.uniforms.uUvT.value.copy(map.matrix);
    m.uniforms.uAccent = U.accent; m.uniforms.uClip = clipU;
    return m;
  }

  function attach(gltf) {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const a = o.material; a.envMapIntensity = 1.0;
      swap(o, addClip(a), neonTreeMaterial(a.map));
    });
    group.add(gltf.scene);
  }

  return { group, clipU, attach };
}
