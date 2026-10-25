import type { Bird, DateKey, EggDisposition, EggLog, FlockCost } from '../contracts/domain';
import { addDays, addMonths, diffDays, monthKey, weekStart } from './dates';

export interface Bucket { key: string; label: string; count: number }

export const usable = (l: Pick<EggLog, 'count' | 'damaged'>) => Math.max(0, l.count - (l.damaged ?? 0));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function collectedOn(logs: EggLog[], day: DateKey): number {
  return sum(logs.filter((l) => l.collectedOn === day).map((l) => l.count));
}

/** Eggs collected per day for the `days` days ending today (oldest first). */
export function dailyTotals(logs: EggLog[], today: DateKey, days: number): Bucket[] {
  const map = new Map<string, number>();
  for (const l of logs) map.set(l.collectedOn, (map.get(l.collectedOn) ?? 0) + l.count);
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - days + 1);
    return { key, label: key, count: map.get(key) ?? 0 };
  });
}
export function weeklyTotals(logs: EggLog[], today: DateKey, weeks: number): Bucket[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    const k = weekStart(l.collectedOn);
    map.set(k, (map.get(k) ?? 0) + l.count);
  }
  const current = weekStart(today);
  return Array.from({ length: weeks }, (_, i) => {
    const key = addDays(current, (i - weeks + 1) * 7);
    return { key, label: key, count: map.get(key) ?? 0 };
  });
}
export function monthlyTotals(logs: EggLog[], today: DateKey, months: number): Bucket[] {
  const map = new Map<string, number>();
  for (const l of logs) {
    const k = monthKey(l.collectedOn);
    map.set(k, (map.get(k) ?? 0) + l.count);
  }
  return Array.from({ length: months }, (_, i) => {
    const key = monthKey(addMonths(`${monthKey(today)}-01`, i - months + 1));
    return { key, label: key, count: map.get(key) ?? 0 };
  });
}

export interface Trend { recentAvg: number; priorAvg: number; changePct: number | null; direction: 'up' | 'down' | 'steady' | 'none' }
/** Average eggs per day over the last `window` days compared with the window before it. */
export function layingTrend(logs: EggLog[], today: DateKey, window = 7): Trend {
  const recent = sum(logs.filter((l) => { const d = diffDays(today, l.collectedOn); return d >= 0 && d < window; }).map((l) => l.count));
  const prior = sum(logs.filter((l) => { const d = diffDays(today, l.collectedOn); return d >= window && d < window * 2; }).map((l) => l.count));
  const recentAvg = recent / window;
  const priorAvg = prior / window;
  if (!recent && !prior) return { recentAvg, priorAvg, changePct: null, direction: 'none' };
  const changePct = prior ? ((recent - prior) / prior) * 100 : null;
  const direction = changePct === null ? 'up' : changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'steady';
  return { recentAvg, priorAvg, changePct, direction };
}

export interface Layer { bird: Bird; count: number }
export function topLayers(logs: EggLog[], birds: Bird[], limit = 5): Layer[] {
  const map = new Map<string, number>();
  for (const l of logs) if (l.birdId) map.set(l.birdId, (map.get(l.birdId) ?? 0) + l.count);
  return birds
    .map((bird) => ({ bird, count: map.get(bird.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || a.bird.name.localeCompare(b.bird.name))
    .slice(0, limit);
}
export function birdEggTotal(logs: EggLog[], birdId: string): number {
  return sum(logs.filter((l) => l.birdId === birdId).map((l) => l.count));
}

/** Usable eggs collected minus eggs used, sold or given away. Never below zero. */
export function eggsOnHand(logs: EggLog[], out: EggDisposition[]): number {
  return Math.max(0, sum(logs.map(usable)) - sum(out.map((d) => d.count)));
}

/** Cost per dozen usable eggs; null when no eggs were collected. */
export function costPerDozen(totalCost: number, usableEggs: number): number | null {
  if (usableEggs <= 0) return null;
  return totalCost / (usableEggs / 12);
}

export interface Economics { eggs: number; usableEggs: number; damaged: number; costs: number; revenue: number; profit: number; perDozen: number | null; sold: number; given: number; used: number }
export function economics(logs: EggLog[], out: EggDisposition[], costs: FlockCost[], from?: DateKey, to?: DateKey): Economics {
  const inRange = (d: DateKey) => (!from || d >= from) && (!to || d <= to);
  const l = logs.filter((x) => inRange(x.collectedOn));
  const o = out.filter((x) => inRange(x.occurredOn));
  const c = costs.filter((x) => inRange(x.occurredOn));
  const eggs = sum(l.map((x) => x.count));
  const usableEggs = sum(l.map(usable));
  const costTotal = sum(c.map((x) => x.amount));
  const revenue = sum(o.filter((x) => x.kind === 'sold').map((x) => x.amount ?? 0));
  const count = (k: EggDisposition['kind']) => sum(o.filter((x) => x.kind === k).map((x) => x.count));
  return {
    eggs, usableEggs, damaged: eggs - usableEggs, costs: costTotal, revenue, profit: revenue - costTotal,
    perDozen: costPerDozen(costTotal, usableEggs), sold: count('sold'), given: count('given'), used: count('used'),
  };
}

export function money(n: number): string {
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
