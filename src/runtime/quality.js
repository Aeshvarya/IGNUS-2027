/**
 * Device quality tiers. Picked once per visit before the world is built, then the world's
 * runtime governor can only step quality *down* (never up mid-session, to avoid flicker).
 *
 *   ultra   desktop GPUs: full reflections, MSAA, full-res bloom
 *   high    integrated GPUs and flagship phones
 *   medium  mid-range phones: lighter reflections (updated every other frame), half-res bloom
 *   low     weak phones: fake reflections, no ink pass, fewer particles, lite model
 *   lite    no WebGL at all: posters + CSS motion (also: Data Saver, ≤2 GB RAM, blocklisted GPUs)
 *
 * QA override: add ?quality=ultra|high|medium|low|lite to any URL (remembered for the session).
 */
export const TIERS = {
  ultra: { name: 'ultra', small: false, maxDpr: 2, msaa: 4, reflection: 0.5, reflectEvery: 1, bloomScale: 1, ink: true, motes: 1300, godrays: 48, extras: 'full', model: '/models/tree.glb' },
  high: { name: 'high', small: false, maxDpr: 1.5, msaa: 2, reflection: 0.38, reflectEvery: 1, bloomScale: 0.6, ink: true, motes: 1000, godrays: 28, extras: 'full', model: '/models/tree.glb' },
  medium: { name: 'medium', small: true, maxDpr: 1.25, msaa: 0, reflection: 0.28, reflectEvery: 2, bloomScale: 0.5, ink: true, motes: 520, godrays: 0, extras: 'reduced', model: '/models/tree-lite.glb' },
  low: { name: 'low', small: true, maxDpr: 1, msaa: 0, reflection: 0, reflectEvery: 0, bloomScale: 0.4, ink: false, motes: 280, godrays: 0, extras: 'reduced', model: '/models/tree-lite.glb' },
};
export const TIER_ORDER = ['lite', 'low', 'medium', 'high', 'ultra'];

const QA_KEY = 'ignus27-quality';

function override() {
  try {
    const q = new URLSearchParams(location.search).get('quality');
    if (q && (TIERS[q] || q === 'lite')) { sessionStorage.setItem(QA_KEY, q); return q; }
    return sessionStorage.getItem(QA_KEY);
  } catch (e) { return null; }
}

/** 'none' (no WebGL2), 'software' (CPU rasteriser: unusable for this scene) or 'gpu'. */
function webgl2Kind() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/.test(r) ? 'software' : 'gpu';
  } catch (e) { return 'none'; }
}

/** Cheap guess used when the GPU benchmark can't answer (unknown GPU, offline, timeout). */
function heuristic() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 640;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse || small) return cores >= 8 ? 'medium' : 'low';
  return cores >= 8 ? 'high' : 'medium';
}

/**
 * Resolves to a tier name. Never takes more than ~1.5 s: the benchmark lookup races a timeout.
 */
export async function detectTier() {
  const forced = override();
  if (forced) return forced;
  const conn = navigator.connection;
  if (conn?.saveData) return 'lite';
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return 'lite';
  if (webgl2Kind() !== 'gpu') return 'lite';

  let result = null;
  try {
    const { getGPUTier } = await import('detect-gpu');
    result = await Promise.race([
      getGPUTier({ benchmarksURL: '/gpu', failIfMajorPerformanceCaveat: true }),
      new Promise((r) => setTimeout(() => r(null), 1500)),
    ]);
  } catch (e) { result = null; }

  if (!result || result.type === 'FALLBACK') return heuristic();
  if (result.type === 'WEBGL_UNSUPPORTED' || result.type === 'BLOCKLISTED' || result.tier === 0) return 'lite';
  if (!result.isMobile) return result.tier >= 3 ? 'ultra' : result.tier === 2 ? 'high' : 'medium';
  return result.tier >= 3 ? 'high' : result.tier === 2 ? 'medium' : 'low';
}

export function qualityFor(tier) {
  const q = TIERS[tier] ? { ...TIERS[tier] } : { ...TIERS.low };
  // QA / poster rendering: ?governor=off keeps quality fixed even when frames are slow.
  try { q.governor = new URLSearchParams(location.search).get('governor') !== 'off'; } catch (e) { q.governor = true; }
  return q;
}
