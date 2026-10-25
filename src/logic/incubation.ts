import type { DateKey, HatchEvent, IncubationBatch } from '../contracts/domain';
import { addDays, diffDays } from './dates';

/** Chicken eggs: candle on days 7 and 14, lockdown on day 18, expected hatch on day 21. */
export const MILESTONES = [
  { day: 7, key: 'candle1', title: 'First candling', detail: 'Look for veins and a dark spot. Remove clear eggs.' },
  { day: 14, key: 'candle2', title: 'Second candling', detail: 'Remove eggs that stopped developing.' },
  { day: 18, key: 'lockdown', title: 'Lockdown', detail: 'Stop turning, raise humidity, keep the lid closed.' },
  { day: 21, key: 'hatch', title: 'Expected hatch', detail: 'Hatching can run a day or two early or late.' },
] as const;
export type MilestoneKey = (typeof MILESTONES)[number]['key'];

/** Incubation day number. The set day is day 0; day 21 is the expected hatch. */
export function incubationDay(setOn: DateKey, today: DateKey): number {
  return diffDays(today, setOn);
}
export function milestoneDate(setOn: DateKey, day: number): DateKey {
  return addDays(setOn, day);
}
export function expectedHatch(setOn: DateKey): DateKey {
  return addDays(setOn, 21);
}
export function lockdownDate(setOn: DateKey): DateKey {
  return addDays(setOn, 18);
}
export function nextMilestone(setOn: DateKey, today: DateKey) {
  const day = incubationDay(setOn, today);
  return MILESTONES.find((m) => m.day >= day) ?? null;
}
/** Hatch rate as a percentage of eggs that were recorded (hatched + unhatched). */
export function hatchRate(hatched: number, unhatched: number): number | null {
  const total = hatched + unhatched;
  if (total <= 0) return null;
  return Math.round((hatched / total) * 1000) / 10;
}
export function batchStatus(batch: IncubationBatch, hatch: HatchEvent | undefined, today: DateKey): 'hatched' | 'incubating' | 'due' | 'overdue' {
  if (hatch) return 'hatched';
  const day = incubationDay(batch.setOn, today);
  if (day > 23) return 'overdue';
  if (day >= 21) return 'due';
  return 'incubating';
}

/** Brooder temperature, general guidance: about 95F in week one, about 5F cooler each week, down to 70F. */
export function brooderTempF(weekIndex: number): number {
  return Math.max(70, 95 - 5 * Math.max(0, weekIndex));
}
export const fToC = (f: number) => Math.round(((f - 32) * 5) / 9);
export function brooderGuide(): { week: number; tempF: number; tempC: number }[] {
  return Array.from({ length: 6 }, (_, i) => ({ week: i + 1, tempF: brooderTempF(i), tempC: fToC(brooderTempF(i)) }));
}
