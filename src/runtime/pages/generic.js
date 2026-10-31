import { mountEventFilters } from './events.js';
import { mountSchedule } from './schedule.js';

/**
 * Controller for content pages. They live inside the Shift: the world holds a pose per page
 * (the camera flies there on navigation) and renders in ambient mode (half rate, frozen when idle)
 * to keep reading smooth and save battery.
 */
const POSES = { events: 5, event: 4.7, schedule: 4.35, pronites: 3.55, passes: 4.6, sponsors: 5.4, team: 4.15, faq: 5.25, '404': 3.2 };
const PAGE_UI = { events: mountEventFilters, schedule: mountSchedule };

export function mountGeneric(_app, page) {
  const u = POSES[page] ?? 5;
  const unmount = PAGE_UI[page]?.() ?? (() => {});
  return { ambient: true, targetU: () => u, frame() {}, destroy: unmount };
}
