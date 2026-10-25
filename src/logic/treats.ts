import type { DateKey, FeedItem, TreatLog, TreatUnit } from '../contracts/domain';

/**
 * General backyard guidance, not a feeding plan: a laying hen eats about a
 * quarter pound (about 110 g) of feed a day, and treats plus scratch should
 * stay around 10 percent of that.
 */
export const FEED_LB_PER_HEN_PER_DAY = 0.25;
export const TREAT_SHARE = 0.1;
export const GRAMS_PER_LB = 453.592;
/** Approximate: a cup of scratch grains weighs about a quarter pound. Lighter treats like mealworms weigh less. */
export const LB_PER_CUP = 0.25;
/** Approximate: a loose handful is about an eighth of a cup. */
export const CUPS_PER_HANDFUL = 0.125;

export const TREAT_CATEGORIES: FeedItem['category'][] = ['treats', 'scratch'];
export const isTreatItem = (i: Pick<FeedItem, 'category'>) => TREAT_CATEGORIES.includes(i.category);

/** Suggested daily treat limit for the flock, in pounds. */
export function treatLimitLb(activeHens: number): number {
  return Math.max(0, activeHens) * FEED_LB_PER_HEN_PER_DAY * TREAT_SHARE;
}

/** Converts a treat amount to pounds using the approximations above. */
export function treatPounds(amount: number, unit: TreatUnit): number {
  const a = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (unit === 'grams') return a / GRAMS_PER_LB;
  if (unit === 'cups') return a * LB_PER_CUP;
  return a * CUPS_PER_HANDFUL * LB_PER_CUP;
}
export const toGrams = (lb: number) => lb * GRAMS_PER_LB;

export interface TreatStatus { givenLb: number; limitLb: number; pct: number; level: 'none' | 'ok' | 'near' | 'over' | 'no_hens' }
/** Today's treats for a flock against the suggested limit. */
export function treatStatus(logs: TreatLog[], flockId: string, today: DateKey, activeHens: number): TreatStatus {
  const givenLb = logs.filter((l) => l.flockId === flockId && l.day === today).reduce((a, l) => a + treatPounds(l.amount, l.unit), 0);
  const limitLb = treatLimitLb(activeHens);
  if (limitLb <= 0) return { givenLb, limitLb, pct: 0, level: 'no_hens' };
  const pct = (givenLb / limitLb) * 100;
  const level = givenLb <= 0 ? 'none' : pct > 100 ? 'over' : pct >= 80 ? 'near' : 'ok';
  return { givenLb, limitLb, pct, level };
}

export const OVER_TREAT_NOTE = 'Too many treats can cut egg laying and protein. Keep layer feed as the main meal.';
