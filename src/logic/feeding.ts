import type { DateKey, FeedItem, FeedingLog, Flock, ID } from '../contracts/domain';
import { addDays, maxKey } from './dates';
import { estimatedQuantity, round } from './feed';

export const DEFAULT_FEED_TIMES = ['Morning feed', 'Evening check'];
export const MAX_FEED_TIMES = 3;

/** The flock's feed time labels, cleaned up, always 1 to 3 entries. */
export function feedTimesFor(flock: Pick<Flock, 'feedTimes'> | undefined): string[] {
  const t = (flock?.feedTimes ?? []).map((x) => x.trim()).filter(Boolean).slice(0, MAX_FEED_TIMES);
  return t.length ? t : [...DEFAULT_FEED_TIMES];
}

/** Which inventory item feedings deduct from: the flock's choice, else the first item in the feed category. */
export function feedingItemFor(flock: Pick<Flock, 'feedItemId'> | undefined, items: FeedItem[]): FeedItem | undefined {
  if (flock?.feedItemId === 'none') return undefined;
  if (flock?.feedItemId) {
    const chosen = items.find((i) => i.id === flock.feedItemId);
    if (chosen) return chosen;
  }
  return items.find((i) => i.category === 'feed');
}

/** Default amount for one feeding: the item's daily usage split across the day's feedings. */
export function defaultFeedingAmount(item: Pick<FeedItem, 'dailyUsage'> | undefined, feedings: number): number {
  if (!item || !(item.dailyUsage > 0) || feedings < 1) return 0;
  return round(item.dailyUsage / feedings, 3);
}

export interface FeedingSlot { slot: number; label: string; log?: FeedingLog }
/** Today's feeding check-off for one flock. Logs from other days are ignored, so the list resets daily. */
export function todaysFeedings(flock: Flock, logs: FeedingLog[], today: DateKey): FeedingSlot[] {
  return feedTimesFor(flock).map((label, slot) => ({
    slot, label, log: logs.find((l) => l.flockId === flock.id && l.day === today && l.slot === slot),
  }));
}

/**
 * Inventory after a logged feeding. Estimated stock assumes the daily usage
 * for every day after countedOn, so once a day's feeding is logged we count
 * from tomorrow on. That keeps the day from being deducted twice.
 */
export function applyFeedingUse(item: Pick<FeedItem, 'quantity' | 'countedOn' | 'dailyUsage'>, amount: number, today: DateKey): { quantity: number; countedOn: DateKey } {
  const now = estimatedQuantity(item, today);
  return { quantity: round(Math.max(0, now - Math.max(0, amount)), 3), countedOn: maxKey(item.countedOn, addDays(today, 1)) };
}

/** Puts an undone feeding back. When no other logged feeding is left today, today's usage is estimated again. */
export function undoFeedingUse(item: Pick<FeedItem, 'quantity' | 'countedOn' | 'dailyUsage'>, amount: number, today: DateKey, otherLoggedToday: boolean): { quantity: number; countedOn: DateKey } {
  const tomorrow = addDays(today, 1);
  const countedOn = !otherLoggedToday && item.countedOn === tomorrow ? today : item.countedOn;
  return { quantity: round(item.quantity + Math.max(0, amount), 3), countedOn };
}

/** True when another feeding today already deducted from this item. */
export function otherFeedingUsesToday(logs: FeedingLog[], itemId: ID, today: DateKey, exceptId: ID): boolean {
  return logs.some((l) => l.id !== exceptId && l.day === today && l.itemId === itemId && (l.amount ?? 0) > 0);
}

/** "7:10 AM" in the viewer's locale. */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/** "Fed at 7:10 AM by Sarah", or "Checked at" for check-type slots. */
export function feedingDoneText(log: Pick<FeedingLog, 'label' | 'doneAt' | 'doneBy'>): string {
  const verb = /check/i.test(log.label) ? 'Checked' : 'Fed';
  return `${verb} at ${timeLabel(log.doneAt)}${log.doneBy ? ` by ${log.doneBy}` : ''}`;
}
