/**
 * Picks render settings for this device. Phase 2 mirrors the handoff exactly
 * (one "small screen / touch" switch); device tiers replace this in Phase 3.
 */
export function detectQuality() {
  const small = Math.min(innerWidth, innerHeight) < 640 || matchMedia('(pointer: coarse)').matches;
  return {
    tier: small ? 'medium' : 'high',
    small,
    maxDpr: small ? 1.25 : 1.6,
    reflection: small ? 0.35 : 0.5,
    msaa: small ? 0 : 4,
    motes: small ? 520 : 1300,
  };
}
