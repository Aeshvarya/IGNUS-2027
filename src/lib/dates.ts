import { SITE } from '../config/site';

const TZ = SITE.timezone;
const start = new Date(SITE.dates.start);

/** The calendar date of fest day n (1-based), in IST. */
export function dayDate(n: number): Date {
  return new Date(start.getTime() + (n - 1) * 864e5);
}

/** "Thu 18 Feb" */
export function dayLabel(n: number): string {
  return dayDate(n).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
}

/** ISO date-time for day n at "HH:MM" IST (for <time> and schema.org). */
export function dayTimeISO(n: number, hhmm: string): string {
  const d = dayDate(n).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
  return `${d}T${hhmm}:00+05:30`;
}

export const DAYS = Array.from({ length: SITE.dates.days }, (_, i) => i + 1);
