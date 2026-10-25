import { describe, expect, it } from 'vitest';
import { addDays, addMonths, ageLabel, diffDays, weekStart } from '../logic/dates';
import { daysRemaining, estimatedQuantity, stockLevel } from '../logic/feed';
import { costPerDozen, dailyTotals, economics, eggsOnHand, layingTrend, monthlyTotals, topLayers, weeklyTotals } from '../logic/eggs';
import { batchStatus, brooderTempF, expectedHatch, hatchRate, incubationDay, lockdownDate, milestoneDate, nextMilestone } from '../logic/incubation';
import { choreStreak, currentDueDate, isScheduledOn, nextDueDate, todaysChecklist } from '../logic/chores';
import { careReminders, inQuarantine } from '../logic/care';
import type { Bird, BirdHealthEvent, ChoreDone, ChoreTemplate, EggDisposition, EggLog, FeedItem, FlockCost, IncubationBatch } from '../contracts/domain';

const ts = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: ts, updatedAt: ts, householdId: 'h' };

describe('dates', () => {
  it('adds and diffs days across month, year and DST boundaries', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-03-09', '2026-03-07')).toBe(2); // US DST start
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(2); // US DST end
  });
  it('clamps month addition to the end of month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('finds Monday week starts', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // Sunday
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // Monday
  });
  it('labels ages', () => {
    expect(ageLabel('2026-10-20', '2026-10-25')).toBe('5 days');
    expect(ageLabel('2026-09-01', '2026-10-25')).toBe('7 wk');
    expect(ageLabel('2026-01-25', '2026-10-25')).toBe('9 mo');
    expect(ageLabel('2024-07-25', '2026-10-25')).toBe('2 yr 3 mo');
    expect(ageLabel(undefined, '2026-10-25')).toBeNull();
  });
});

describe('feed days remaining', () => {
  const item: FeedItem = { ...audit, id: 'f', name: 'Layer', category: 'feed', unit: 'lb', quantity: 50, countedOn: '2026-10-01', dailyUsage: 1, lowStockDays: 7 };
  it('subtracts daily usage since the last count', () => {
    expect(estimatedQuantity(item, '2026-10-11')).toBe(40);
    expect(daysRemaining(item, '2026-10-11')).toBe(40);
    expect(daysRemaining({ ...item, dailyUsage: 0.75 }, '2026-10-01')).toBe(66);
  });
  it('never goes below zero and handles unknown usage', () => {
    expect(estimatedQuantity(item, '2027-01-01')).toBe(0);
    expect(daysRemaining(item, '2027-01-01')).toBe(0);
    expect(daysRemaining({ ...item, dailyUsage: 0 }, '2026-10-11')).toBeNull();
  });
  it('flags low and out of stock', () => {
    expect(stockLevel(item, '2026-10-11')).toBe('ok');
    expect(stockLevel(item, '2026-11-15')).toBe('low');
    expect(stockLevel(item, '2026-11-25')).toBe('out');
    expect(stockLevel({ ...item, dailyUsage: 0 }, '2026-10-11')).toBe('unknown');
  });
});

describe('eggs and economics', () => {
  const egg = (id: string, day: string, count: number, birdId?: string, damaged = 0): EggLog => ({ ...audit, id, flockId: 'fl', collectedOn: day, count, birdId, damaged });
  const logs = [egg('1', '2026-10-25', 3, 'a'), egg('2', '2026-10-24', 2, 'b', 1), egg('3', '2026-10-24', 1, 'a'), egg('4', '2026-10-10', 6)];
  it('computes cost per dozen', () => {
    expect(costPerDozen(30, 120)).toBeCloseTo(3);
    expect(costPerDozen(10, 0)).toBeNull();
    expect(costPerDozen(5, 6)).toBeCloseTo(10);
  });
  it('computes eggs on hand from usable eggs minus dispositions', () => {
    const out: EggDisposition[] = [{ ...audit, id: 'o', occurredOn: '2026-10-25', kind: 'sold', count: 4, amount: 3 }];
    expect(eggsOnHand(logs, out)).toBe(11 - 4);
    expect(eggsOnHand(logs, [{ ...out[0], count: 100 }])).toBe(0);
  });
  it('computes profit for a period', () => {
    const out: EggDisposition[] = [
      { ...audit, id: 'o1', occurredOn: '2026-10-24', kind: 'sold', count: 6, amount: 4 },
      { ...audit, id: 'o2', occurredOn: '2026-10-24', kind: 'given', count: 2 },
    ];
    const costs: FlockCost[] = [{ ...audit, id: 'c', occurredOn: '2026-10-20', category: 'feed', amount: 12 }];
    const e = economics(logs, out, costs, '2026-10-15', '2026-10-25');
    expect(e.eggs).toBe(6);
    expect(e.usableEggs).toBe(5);
    expect(e.revenue).toBe(4);
    expect(e.profit).toBe(-8);
    expect(e.perDozen).toBeCloseTo(12 / (5 / 12));
    expect(e.given).toBe(2);
  });
  it('buckets totals by day, week and month', () => {
    const d = dailyTotals(logs, '2026-10-25', 3);
    expect(d.map((b) => b.count)).toEqual([0, 3, 3]);
    const w = weeklyTotals(logs, '2026-10-25', 3);
    expect(w.map((b) => b.key)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
    expect(w.map((b) => b.count)).toEqual([6, 0, 6]);
    const m = monthlyTotals(logs, '2026-10-25', 2);
    expect(m).toEqual([{ key: '2026-09', label: '2026-09', count: 0 }, { key: '2026-10', label: '2026-10', count: 12 }]);
  });
  it('ranks top layers and computes trend', () => {
    const birds = [{ id: 'a', name: 'Daisy' }, { id: 'b', name: 'Pepper' }, { id: 'c', name: 'Olive' }] as Bird[];
    expect(topLayers(logs, birds).map((l) => [l.bird.name, l.count])).toEqual([['Daisy', 4], ['Pepper', 2]]);
    const t = layingTrend([egg('x', '2026-10-25', 14), egg('y', '2026-10-15', 7)], '2026-10-25');
    expect(t.recentAvg).toBe(2);
    expect(t.priorAvg).toBe(1);
    expect(t.direction).toBe('up');
    expect(layingTrend([], '2026-10-25').direction).toBe('none');
  });
});

describe('incubation', () => {
  it('counts days from set date (day 0) with milestones', () => {
    expect(incubationDay('2026-10-01', '2026-10-08')).toBe(7);
    expect(milestoneDate('2026-10-01', 14)).toBe('2026-10-15');
    expect(lockdownDate('2026-10-01')).toBe('2026-10-19');
    expect(expectedHatch('2026-10-01')).toBe('2026-10-22');
    expect(expectedHatch('2026-02-20')).toBe('2026-03-13');
    expect(nextMilestone('2026-10-01', '2026-10-09')?.key).toBe('candle2');
    expect(nextMilestone('2026-10-01', '2026-10-25')).toBeNull();
  });
  it('computes hatch rate', () => {
    expect(hatchRate(9, 3)).toBe(75);
    expect(hatchRate(2, 1)).toBe(66.7);
    expect(hatchRate(0, 0)).toBeNull();
  });
  it('derives status', () => {
    const b: IncubationBatch = { ...audit, id: 'b', name: 'B', setOn: '2026-10-01', eggCount: 12 };
    expect(batchStatus(b, undefined, '2026-10-10')).toBe('incubating');
    expect(batchStatus(b, undefined, '2026-10-22')).toBe('due');
    expect(batchStatus(b, undefined, '2026-10-30')).toBe('overdue');
  });
  it('drops brooder temperature about 5F per week to a 70F floor', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(brooderTempF)).toEqual([95, 90, 85, 80, 75, 70, 70]);
  });
});

describe('chore recurrence', () => {
  const t = (id: string, recurrence: ChoreTemplate['recurrence'], startDate = '2026-10-01'): ChoreTemplate => ({ ...audit, id, title: id, recurrence, startDate, active: true });
  it('schedules daily, weekly, monthly and seasonal chores', () => {
    expect(isScheduledOn(t('d', 'daily'), '2026-10-25')).toBe(true);
    expect(isScheduledOn(t('w', 'weekly'), '2026-10-22')).toBe(true);
    expect(isScheduledOn(t('w', 'weekly'), '2026-10-23')).toBe(false);
    expect(currentDueDate(t('w', 'weekly'), '2026-10-25')).toBe('2026-10-22');
    expect(nextDueDate(t('m', 'monthly', '2026-01-31'), '2026-02-10')).toBe('2026-02-28');
    expect(nextDueDate(t('m', 'monthly', '2026-01-31'), '2026-02-28')).toBe('2026-03-31');
    expect(currentDueDate(t('m', 'monthly', '2026-01-31'), '2026-03-01')).toBe('2026-02-28');
    expect(currentDueDate(t('s', 'seasonal'), '2026-12-31')).toBe('2026-10-01');
    expect(nextDueDate(t('s', 'seasonal'), '2026-10-25')).toBe('2027-01-01');
    expect(currentDueDate(t('d', 'daily', '2026-11-01'), '2026-10-25')).toBeNull();
  });
  it('builds a checklist with carry-over and done state', () => {
    const templates = [t('water', 'daily'), t('bedding', 'weekly'), t('paused', 'daily')];
    templates[2].active = false;
    const done: ChoreDone[] = [{ ...audit, id: 'x', templateId: 'water', title: 'water', dueAt: '2026-10-25', completedAt: '2026-10-25T08:00:00' }];
    const list = todaysChecklist(templates, done, '2026-10-25');
    expect(list.map((i) => i.template.id)).toEqual(['bedding', 'water']);
    expect(list[0].overdue).toBe(true);
    expect(list[1].done?.id).toBe('x');
  });
  it('counts a streak of fully completed days', () => {
    const templates = [t('a', 'daily'), t('b', 'daily'), t('w', 'weekly')];
    const mk = (tid: string, day: string): ChoreDone => ({ ...audit, id: tid + day, templateId: tid, title: tid, dueAt: day, completedAt: day + 'T09:00:00' });
    const done = ['2026-10-22', '2026-10-23', '2026-10-24'].flatMap((d) => [mk('a', d), mk('b', d)]);
    expect(choreStreak(templates, done, '2026-10-25')).toBe(3);
    expect(choreStreak(templates, [...done, mk('a', '2026-10-25'), mk('b', '2026-10-25')], '2026-10-25')).toBe(4);
    expect(choreStreak(templates, done.filter((d) => d.dueAt !== '2026-10-23'), '2026-10-25')).toBe(1);
  });
});

describe('care reminders', () => {
  const e = (over: Partial<BirdHealthEvent>): BirdHealthEvent => ({ ...audit, id: Math.random().toString(), flockId: 'f', type: 'deworming', occurredOn: '2026-10-01', ...over });
  it('lists open follow-ups and quarantine ends in date order', () => {
    const events = [
      e({ remindOn: '2026-11-01' }),
      e({ type: 'quarantine', birdId: 'n', endsOn: '2026-10-28' }),
      e({ remindOn: '2026-10-20', reminderDone: true }),
      e({ remindOn: '2027-03-01' }),
    ];
    const r = careReminders(events, '2026-10-25', 30);
    expect(r.map((x) => [x.kind, x.on])).toEqual([['quarantine_end', '2026-10-28'], ['follow_up', '2026-11-01']]);
    expect(inQuarantine(events, 'n', '2026-10-25')).toBe(true);
    expect(inQuarantine(events, 'n', '2026-10-29')).toBe(false);
  });
});
