import type { DateKey, FeedItem } from '../contracts/domain';
import { addDays, diffDays } from './dates';

/** Estimated quantity left today, using the daily usage since the last count. */
export function estimatedQuantity(item: Pick<FeedItem, 'quantity' | 'countedOn' | 'dailyUsage'>, today: DateKey): number {
  const elapsed = Math.max(0, diffDays(today, item.countedOn));
  return Math.max(0, item.quantity - elapsed * Math.max(0, item.dailyUsage));
}
/** Whole days remaining at the current daily usage; null when usage is zero (unknown). */
export function daysRemaining(item: Pick<FeedItem, 'quantity' | 'countedOn' | 'dailyUsage'>, today: DateKey): number | null {
  if (!(item.dailyUsage > 0)) return null;
  return Math.floor(estimatedQuantity(item, today) / item.dailyUsage);
}
export function runOutDate(item: FeedItem, today: DateKey): DateKey | null {
  const d = daysRemaining(item, today);
  return d === null ? null : addDays(today, d);
}
export type StockLevel = 'out' | 'low' | 'ok' | 'unknown';
export function stockLevel(item: FeedItem, today: DateKey): StockLevel {
  const q = estimatedQuantity(item, today);
  if (q <= 0) return 'out';
  const d = daysRemaining(item, today);
  if (d === null) return 'unknown';
  return d <= item.lowStockDays ? 'low' : 'ok';
}
export function round(n: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
