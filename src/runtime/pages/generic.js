/**
 * Controller for content pages: they live inside the Shift, so the world holds a pose there
 * and renders in ambient mode (half rate, frozen when idle) to keep reading smooth and save battery.
 */
const POSES = { events: 5, event: 5, schedule: 4.4, pronites: 3.6, passes: 4.6, sponsors: 5.4, team: 4.2, faq: 5.2, '404': 3.2 };

export function mountGeneric(_app, page) {
  const u = POSES[page] ?? 5;
  return { ambient: true, targetU: () => u, frame() {}, destroy() {} };
}
