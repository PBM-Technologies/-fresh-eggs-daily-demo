import { describe, expect, it } from 'vitest';
import { applyFeedingUse, defaultFeedingAmount, DEFAULT_FEED_TIMES, feedingDoneText, feedingItemFor, feedTimesFor, otherFeedingUsesToday, todaysFeedings, undoFeedingUse } from '../logic/feeding';
import { daysRemaining, estimatedQuantity } from '../logic/feed';
import { isTreatItem, OVER_TREAT_NOTE, toGrams, treatLimitLb, treatPounds, treatStatus } from '../logic/treats';
import { byCategory, costCategoryForFeed, costPerHen, monthEnd, monthlySpend, monthSummary, monthTotal } from '../logic/spending';
import { reorderUrl, FED_COOP, FED_TREATS, FED_ALL } from '../content/shop';
import { remindersFor } from '../logic/reminders';
import { emptySnapshot, removeSample, loadSnapshot, buildBackup, parseBackup, restoreBackup, deleteEverything, createHousehold } from '../data/service';
import { createKeyValueAdapter } from '../data/localAdapter';
import { memoryBackend } from '../data/storage';
import { buildSampleFlock } from '../data/sample';
import { COLLECTIONS, type CollectionName, type EggLog, type FeedItem, type FeedingLog, type Flock, type FlockCost, type TreatLog } from '../contracts/domain';

const ts = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: ts, updatedAt: ts, householdId: 'h' };
const flock: Flock = { ...audit, id: 'f1', name: 'Backyard' };
const layer: FeedItem = { ...audit, id: 'feed1', name: 'Layer feed', category: 'feed', unit: 'lb', quantity: 50, countedOn: '2026-10-15', dailyUsage: 1, lowStockDays: 7 };

describe('feeding check-off', () => {
  it('defaults to Morning feed and Evening check and keeps 1 to 3 times', () => {
    expect(feedTimesFor(flock)).toEqual(DEFAULT_FEED_TIMES);
    expect(feedTimesFor({ feedTimes: ['  ', ''] })).toEqual(DEFAULT_FEED_TIMES);
    expect(feedTimesFor({ feedTimes: ['A', 'B', 'C', 'D'] })).toEqual(['A', 'B', 'C']);
    expect(feedTimesFor({ feedTimes: [' Dawn '] })).toEqual(['Dawn']);
  });
  it('picks the feed item and splits daily usage across feedings', () => {
    const scratch: FeedItem = { ...layer, id: 's', name: 'Scratch', category: 'scratch' };
    expect(feedingItemFor(flock, [scratch, layer])?.id).toBe('feed1');
    expect(feedingItemFor({ feedItemId: 's' }, [scratch, layer])?.id).toBe('s');
    expect(feedingItemFor({ feedItemId: 'none' }, [scratch, layer])).toBeUndefined();
    expect(feedingItemFor({ feedItemId: 'gone' }, [layer])?.id).toBe('feed1');
    expect(defaultFeedingAmount({ dailyUsage: 0.75 }, 2)).toBe(0.375);
    expect(defaultFeedingAmount({ dailyUsage: 1 }, 3)).toBe(0.333);
    expect(defaultFeedingAmount(undefined, 2)).toBe(0);
  });
  it('shows only today in the checklist, so it resets daily', () => {
    const log = (day: string, slot: number): FeedingLog => ({ ...audit, id: `${day}${slot}`, flockId: 'f1', day, slot, label: 'x', doneAt: ts });
    const slots = todaysFeedings(flock, [log('2026-10-24', 0), log('2026-10-25', 1)], '2026-10-25');
    expect(slots.map((s) => !!s.log)).toEqual([false, true]);
    expect(todaysFeedings(flock, [log('2026-10-25', 1)], '2026-10-26').every((s) => !s.log)).toBe(true);
  });
  it('deducts a logged feeding without counting the day twice, and undo puts it back', () => {
    const today = '2026-10-25';
    // 10 days at 1 lb/day since the count: 40 lb left, 40 days remaining.
    expect(estimatedQuantity(layer, today)).toBe(40);
    const after = { ...layer, ...applyFeedingUse(layer, 0.5, today) };
    expect(after).toMatchObject({ quantity: 39.5, countedOn: '2026-10-26' });
    expect(estimatedQuantity(after, today)).toBe(39.5);
    const evening = { ...after, ...applyFeedingUse(after, 0.5, today) };
    expect(estimatedQuantity(evening, today)).toBe(39);
    // Tomorrow before feeding: today was logged, so nothing more is estimated for it.
    expect(estimatedQuantity(evening, '2026-10-26')).toBe(39);
    expect(estimatedQuantity(evening, '2026-10-27')).toBe(38);
    expect(daysRemaining(evening, today)).toBe(39);
    // Undo the evening feeding (morning still logged): count stays on tomorrow.
    const undoEvening = { ...evening, ...undoFeedingUse(evening, 0.5, today, true) };
    expect(undoEvening).toMatchObject({ quantity: 39.5, countedOn: '2026-10-26' });
    // Undo the last one: back to estimating today's usage.
    const undoAll = { ...undoEvening, ...undoFeedingUse(undoEvening, 0.5, today, false) };
    expect(undoAll).toMatchObject({ quantity: 40, countedOn: today });
    expect(estimatedQuantity(undoAll, '2026-10-26')).toBe(39);
  });
  it('never goes below zero and finds other feedings for the same item', () => {
    expect(applyFeedingUse({ ...layer, quantity: 0.2, countedOn: '2026-10-25' }, 1, '2026-10-25').quantity).toBe(0);
    const logs: FeedingLog[] = [{ ...audit, id: 'a', flockId: 'f1', day: '2026-10-25', slot: 0, label: 'x', doneAt: ts, itemId: 'feed1', amount: 0.5 }];
    expect(otherFeedingUsesToday(logs, 'feed1', '2026-10-25', 'b')).toBe(true);
    expect(otherFeedingUsesToday(logs, 'feed1', '2026-10-25', 'a')).toBe(false);
  });
  it('writes "Fed at 7:10 AM by Sarah"', () => {
    const doneAt = new Date(2026, 9, 25, 7, 10).toISOString();
    const text = feedingDoneText({ label: 'Morning feed', doneAt, doneBy: 'Sarah' });
    expect(text).toMatch(/^Fed at 7:10\s?AM by Sarah$/i);
    expect(feedingDoneText({ label: 'Evening check', doneAt })).toMatch(/^Checked at 7:10/);
  });
});

describe('treat limits', () => {
  it('suggests about 10 percent of a quarter pound per hen per day', () => {
    expect(treatLimitLb(4)).toBeCloseTo(0.1);
    expect(toGrams(treatLimitLb(1))).toBeCloseTo(11.34, 1);
    expect(treatLimitLb(0)).toBe(0);
    expect(treatLimitLb(-2)).toBe(0);
  });
  it('converts cups, grams and handfuls with the stated approximations', () => {
    expect(treatPounds(1, 'cups')).toBe(0.25);
    expect(treatPounds(453.592, 'grams')).toBeCloseTo(1);
    expect(treatPounds(8, 'handfuls')).toBeCloseTo(0.25);
    expect(treatPounds(-1, 'cups')).toBe(0);
    expect(treatPounds(Number.NaN, 'grams')).toBe(0);
  });
  it('rates today against the limit for the right flock and day', () => {
    const t = (amount: number, unit: TreatLog['unit'], day = '2026-10-25', flockId = 'f1'): TreatLog => ({ ...audit, id: Math.random().toString(), flockId, day, itemId: 'i', amount, unit });
    expect(treatStatus([], 'f1', '2026-10-25', 3).level).toBe('none');
    expect(treatStatus([t(1, 'cups')], 'f1', '2026-10-25', 0).level).toBe('no_hens');
    const ok = treatStatus([t(10, 'grams'), t(5, 'grams', '2026-10-24'), t(50, 'grams', '2026-10-25', 'f2')], 'f1', '2026-10-25', 3);
    expect(ok.level).toBe('ok');
    expect(toGrams(ok.givenLb)).toBeCloseTo(10);
    expect(treatStatus([t(30, 'grams')], 'f1', '2026-10-25', 3).level).toBe('near');
    const over = treatStatus([t(0.5, 'cups')], 'f1', '2026-10-25', 3);
    expect(over.level).toBe('over');
    expect(Math.round(over.pct)).toBe(167);
    expect(OVER_TREAT_NOTE).toBe('Too many treats can cut egg laying and protein. Keep layer feed as the main meal.');
  });
  it('treats only treat and scratch items as treats', () => {
    expect(isTreatItem({ category: 'treats' })).toBe(true);
    expect(isTreatItem({ category: 'scratch' })).toBe(true);
    expect(isTreatItem({ category: 'feed' })).toBe(false);
  });
});

describe('spending', () => {
  const c = (occurredOn: string, category: FlockCost['category'], amount: number): FlockCost => ({ ...audit, id: occurredOn + category + amount, occurredOn, category, amount });
  const costs = [c('2026-10-02', 'feed', 25), c('2026-10-10', 'vet', 40), c('2026-10-20', 'feed', 15), c('2026-09-30', 'bedding', 8), c('2026-05-01', 'other', 99)];
  it('totals a month and groups by category, largest first', () => {
    expect(monthTotal(costs, '2026-10')).toBe(80);
    expect(byCategory(costs, '2026-10')).toEqual([{ category: 'feed', total: 40 }, { category: 'vet', total: 40 }]);
    expect(byCategory(costs, '2026-08')).toEqual([]);
    expect(monthEnd('2026-02')).toBe('2026-02-28');
    expect(monthEnd('2028-02')).toBe('2028-02-29');
  });
  it('builds a 6 month trend ending at the chosen month', () => {
    const t = monthlySpend(costs, '2026-10', 6);
    expect(t.map((x) => x.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(t.map((x) => x.total)).toEqual([99, 0, 0, 0, 8, 80]);
    expect(monthlySpend(costs, '2027-01', 6)[0].key).toBe('2026-08');
  });
  it('computes cost per hen, cost per dozen and net after egg sales for the month', () => {
    const logs: EggLog[] = Array.from({ length: 24 }, (_, i) => ({ ...audit, id: 'e' + i, flockId: 'f1', collectedOn: '2026-10-0' + ((i % 9) + 1), count: 1 }));
    const sales = [{ ...audit, id: 's', occurredOn: '2026-10-12', kind: 'sold' as const, count: 12, amount: 6 }, { ...audit, id: 's2', occurredOn: '2026-09-12', kind: 'sold' as const, count: 12, amount: 100 }];
    const m = monthSummary(logs, sales, costs, '2026-10', 4);
    expect(m.costs).toBe(80);
    expect(m.perHen).toBe(20);
    expect(m.perDozen).toBe(40);
    expect(m.revenue).toBe(6);
    expect(m.revenue - m.costs).toBe(-74);
    expect(costPerHen(10, 0)).toBeNull();
  });
  it('maps restocked items to cost categories', () => {
    expect(costCategoryForFeed('feed')).toBe('feed');
    expect(costCategoryForFeed('treats')).toBe('feed');
    expect(costCategoryForFeed('bedding')).toBe('bedding');
    expect(costCategoryForFeed('coop_care')).toBe('other');
  });
});

describe('reorder reminders', () => {
  it('links only categories Fresh Eggs Daily sells', () => {
    expect(reorderUrl('treats')).toBe(FED_TREATS);
    expect(reorderUrl('supplement')).toBe(FED_ALL);
    expect(reorderUrl('coop_care')).toBe(FED_COOP);
    for (const cat of ['feed', 'scratch', 'grit', 'bedding', 'other']) expect(reorderUrl(cat)).toBeNull();
  });
  it('adds a Reorder action to low FED items and a plain reminder to others', () => {
    const s = emptySnapshot();
    s.feed_inventory = [
      { ...layer, id: 'mw', name: 'Dried mealworms', category: 'treats', quantity: 1, countedOn: '2026-10-25', dailyUsage: 0.1, lowStockDays: 14 },
      { ...layer, id: 'lf', quantity: 3, countedOn: '2026-10-25', dailyUsage: 1, lowStockDays: 7 },
      { ...layer, id: 'okay', quantity: 100, countedOn: '2026-10-25' },
    ];
    const r = remindersFor(s, '2026-10-25').filter((x) => x.kind === 'feed');
    expect(r.map((x) => x.id)).toEqual(['feed:mw', 'feed:lf']);
    expect(r[0].action).toEqual({ label: 'Reorder', href: FED_TREATS, external: true });
    expect(r[1].action).toBeUndefined();
  });
});

describe('new collections in data flows', () => {
  it('are part of COLLECTIONS, backups, sample removal and delete-all', async () => {
    for (const c of ['feeding_logs', 'treat_logs', 'household_people'] as CollectionName[]) expect(COLLECTIONS).toContain(c);
    const a = createKeyValueAdapter(memoryBackend());
    await createHousehold(a, 'H', 'F', '2026-10-25');
    const s = await loadSnapshot(a);
    const hid = s.household!.id;
    const fid = s.flocks[0].id;
    await a.collection('household_people').upsert({ id: 'p1', householdId: hid, name: 'Real person', createdAt: ts, updatedAt: ts });
    await a.collection('feeding_logs').upsert({ id: 'real', householdId: hid, flockId: fid, day: '2026-10-25', slot: 1, label: 'Evening check', doneAt: ts, createdAt: ts, updatedAt: ts });
    const sample = buildSampleFlock(hid, fid, '2026-10-25');
    expect(sample.feeding_logs).toHaveLength(1);
    expect(sample.feeding_logs![0]).toMatchObject({ slot: 0, label: 'Morning feed', day: '2026-10-25', sample: true });
    expect(sample.feed_inventory!.map((f) => f.name)).toEqual(expect.arrayContaining(['Scratch grains', 'Dried mealworms']));
    expect(sample.treat_logs!.length).toBeGreaterThan(0);
    const months = new Set(sample.flock_costs!.map((c) => c.occurredOn.slice(0, 7)));
    expect(months.size).toBe(4);
    expect(new Set(sample.flock_costs!.map((c) => c.category)).size).toBe(5);
    expect(sample.flock_costs!.every((c) => c.occurredOn <= '2026-10-25')).toBe(true);
    expect(sample.household_people).toBeUndefined(); // demo only
    // The sample layer feed already reflects this morning's feeding.
    const lf = sample.feed_inventory!.find((f) => f.name === 'Layer feed')!;
    expect(estimatedQuantity(lf, '2026-10-25')).toBeCloseTo(50 - 12 * 0.75 - 0.375);
    for (const [c, rows] of Object.entries(sample)) {
      const store = a.collection(c as CollectionName);
      await store.replaceAll([...(await store.list()), ...(rows as never[])] as never);
    }
    const loaded = await loadSnapshot(a);
    expect(loaded.feeding_logs).toHaveLength(2);
    const backup = parseBackup(JSON.stringify(buildBackup(loaded)));
    expect(backup.collections.feeding_logs).toHaveLength(2);
    expect(backup.collections.household_people).toHaveLength(1);
    const b = createKeyValueAdapter(memoryBackend());
    await restoreBackup(b, backup);
    expect((await loadSnapshot(b)).treat_logs.length).toBe(sample.treat_logs!.length);
    // Older backups without the new sections still restore.
    const old = JSON.parse(JSON.stringify(buildBackup(loaded)));
    delete old.collections.feeding_logs;
    expect(parseBackup(JSON.stringify(old)).collections.feeding_logs).toEqual([]);
    await removeSample(a);
    const after = await loadSnapshot(a);
    expect(after.feeding_logs.map((l) => l.id)).toEqual(['real']);
    expect(after.treat_logs).toEqual([]);
    expect(after.household_people.map((p) => p.name)).toEqual(['Real person']);
    await deleteEverything(a);
    const wiped = await loadSnapshot(a);
    expect(wiped.feeding_logs).toEqual([]);
    expect(wiped.household_people).toEqual([]);
  });
});
