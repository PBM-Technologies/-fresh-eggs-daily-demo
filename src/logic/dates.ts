import type { DateKey } from '../contracts/domain';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day for a Date as YYYY-MM-DD. */
export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}
export function isDateKey(v: unknown): v is DateKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(dayNumber(v));
}
function parts(k: DateKey): [number, number, number] {
  const [y, m, d] = k.split('-').map(Number);
  return [y, m, d];
}
/** Days since epoch, computed in UTC so DST never shifts the result. */
export function dayNumber(k: DateKey): number {
  const [y, m, d] = parts(k);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}
function fromDayNumber(n: number): DateKey {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/** a minus b, in whole days. */
export function diffDays(a: DateKey, b: DateKey): number {
  return dayNumber(a) - dayNumber(b);
}
export function addDays(k: DateKey, n: number): DateKey {
  return fromDayNumber(dayNumber(k) + n);
}
function daysInMonth(y: number, m1: number): number {
  return new Date(Date.UTC(y, m1, 0)).getUTCDate();
}
/** Add calendar months, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(k: DateKey, n: number): DateKey {
  const [y, m, d] = parts(k);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}
export function monthsBetween(a: DateKey, b: DateKey): number {
  const [ay, am] = parts(a);
  const [by, bm] = parts(b);
  return (ay - by) * 12 + (am - bm);
}
/** Monday that starts the week containing k. */
export function weekStart(k: DateKey): DateKey {
  const dow = (dayNumber(k) + 3) % 7; // 1970-01-01 was a Thursday; 0 = Monday
  return addDays(k, -dow);
}
export function monthKey(k: DateKey): string {
  return k.slice(0, 7);
}
export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

function asUtcDate(k: DateKey): Date {
  const [y, m, d] = parts(k);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
export function formatDate(k: DateKey, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  try {
    return asUtcDate(k).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
  } catch {
    return k;
  }
}
export function formatMonth(month: string): string {
  return formatDate(`${month}-01`, { month: 'short' });
}
export function relativeDay(k: DateKey, today: DateKey): string {
  const d = diffDays(k, today);
  if (d === 0) return 'Today';
  if (d === -1) return 'Yesterday';
  if (d === 1) return 'Tomorrow';
  if (d < 0 && d > -7) return `${-d} days ago`;
  if (d > 0 && d < 7) return `In ${d} days`;
  return formatDate(k, { month: 'short', day: 'numeric', year: k.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric' });
}

/** Human age from a hatch date, e.g. "6 wk", "5 mo", "2 yr 3 mo". */
export function ageLabel(hatchDate: DateKey | undefined, today: DateKey): string | null {
  if (!hatchDate || !isDateKey(hatchDate)) return null;
  const days = diffDays(today, hatchDate);
  if (days < 0) return 'Not hatched yet';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 7 * 16) return `${Math.floor(days / 7)} wk`;
  let months = monthsBetween(today, hatchDate);
  if (addMonths(hatchDate, months) > today) months -= 1;
  if (months < 24) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
}
export function ageInWeeks(hatchDate: DateKey, today: DateKey): number {
  return Math.floor(diffDays(today, hatchDate) / 7);
}
