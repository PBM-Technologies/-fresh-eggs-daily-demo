import type { ChoreDone, ChoreRecurrence, ChoreTemplate, DateKey } from '../contracts/domain';
import { addDays, addMonths, diffDays, monthsBetween, toKey } from './dates';

export const RECURRENCE_LABEL: Record<ChoreRecurrence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  seasonal: 'Seasonal (every 3 months)',
};

export const DEFAULT_CHORES: { title: string; recurrence: ChoreRecurrence }[] = [
  { title: 'Refresh water', recurrence: 'daily' },
  { title: 'Collect eggs', recurrence: 'daily' },
  { title: 'Check nest boxes', recurrence: 'daily' },
  { title: 'Clean and refresh bedding', recurrence: 'weekly' },
  { title: 'Deep clean the coop', recurrence: 'monthly' },
  { title: 'Seasonal coop inspection', recurrence: 'seasonal' },
];

type Schedulable = Pick<ChoreTemplate, 'recurrence' | 'startDate'>;

/** Date of the i-th scheduled occurrence (i = 0 is the start date). */
export function occurrenceDate(t: Schedulable, i: number): DateKey {
  switch (t.recurrence) {
    case 'daily':
      return addDays(t.startDate, i);
    case 'weekly':
      return addDays(t.startDate, i * 7);
    case 'monthly':
      return addMonths(t.startDate, i);
    case 'seasonal':
      return addMonths(t.startDate, i * 3);
  }
}

function indexOnOrBefore(t: Schedulable, day: DateKey): number {
  const diff = diffDays(day, t.startDate);
  if (diff < 0) return -1;
  switch (t.recurrence) {
    case 'daily':
      return diff;
    case 'weekly':
      return Math.floor(diff / 7);
    case 'monthly':
    case 'seasonal': {
      const step = t.recurrence === 'monthly' ? 1 : 3;
      let i = Math.floor(monthsBetween(day, t.startDate) / step);
      while (i > 0 && occurrenceDate(t, i) > day) i -= 1;
      return occurrenceDate(t, i) > day ? -1 : i;
    }
  }
}

/** Most recent scheduled date on or before `day`, or null if the chore has not started. */
export function currentDueDate(t: Schedulable, day: DateKey): DateKey | null {
  const i = indexOnOrBefore(t, day);
  return i < 0 ? null : occurrenceDate(t, i);
}
/** First scheduled date strictly after `day`. */
export function nextDueDate(t: Schedulable, day: DateKey): DateKey {
  const i = indexOnOrBefore(t, day);
  return occurrenceDate(t, i + 1);
}
export function isScheduledOn(t: Schedulable, day: DateKey): boolean {
  return currentDueDate(t, day) === day;
}

export interface ChecklistItem {
  template: ChoreTemplate;
  dueOn: DateKey;
  overdue: boolean;
  done?: ChoreDone;
}

/**
 * Today's checklist: every active chore whose current occurrence is not yet done
 * (weekly, monthly and seasonal chores carry over as overdue until done), plus
 * chores completed today so they stay visible as checked.
 */
export function todaysChecklist(templates: ChoreTemplate[], done: ChoreDone[], today: DateKey): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const t of templates) {
    if (!t.active) continue;
    const dueOn = currentDueDate(t, today);
    if (!dueOn) continue;
    const record = done.find((d) => d.templateId === t.id && d.dueAt === dueOn);
    if (record) {
      const doneToday = dueOn === today || (record.completedAt ? toKey(new Date(record.completedAt)) === today : false);
      if (!doneToday) continue;
    }
    items.push({ template: t, dueOn, overdue: !record && dueOn < today, done: record });
  }
  const order: ChoreRecurrence[] = ['daily', 'weekly', 'monthly', 'seasonal'];
  return items.sort((a, b) => Number(!!a.done) - Number(!!b.done) || order.indexOf(a.template.recurrence) - order.indexOf(b.template.recurrence));
}

/**
 * Streak of consecutive days on which every active daily chore was completed.
 * If today is not finished yet the streak counts back from yesterday.
 */
export function choreStreak(templates: ChoreTemplate[], done: ChoreDone[], today: DateKey): number {
  const daily = templates.filter((t) => t.active && t.recurrence === 'daily');
  if (!daily.length) return 0;
  const doneSet = new Set(done.map((d) => `${d.templateId}|${d.dueAt}`));
  const complete = (day: DateKey) => {
    const due = daily.filter((t) => t.startDate <= day);
    return due.length > 0 && due.every((t) => doneSet.has(`${t.id}|${day}`));
  };
  let day = complete(today) ? today : addDays(today, -1);
  let streak = 0;
  while (streak < 3650 && complete(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
