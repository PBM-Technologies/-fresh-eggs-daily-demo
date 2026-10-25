import type { Bird, CollectionMap, CollectionName, CostCategory, DateKey, EggLog, FeedItem, FlockCost, ID } from '../contracts/domain';
import { addDays, addMonths, monthKey } from '../logic/dates';
import { applyFeedingUse, defaultFeedingAmount, DEFAULT_FEED_TIMES } from '../logic/feeding';
import { nowIso, uid } from './ids';

/** Deterministic pseudo random so the sample looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export function buildSampleFlock(householdId: ID, flockId: ID, today: DateKey): Partial<{ [K in CollectionName]: CollectionMap[K][] }> {
  const ts = nowIso();
  const base = { householdId, flockId, createdAt: ts, updatedAt: ts, sample: true as const, status: 'active' as const };
  const birds: Bird[] = [
    { ...base, id: uid('bird_'), name: 'Daisy', breed: 'Buff Orpington', color: 'Golden buff', hatchDate: addMonths(today, -26), notes: 'Friendly lap chicken. Goes broody in spring.' },
    { ...base, id: uid('bird_'), name: 'Pepper', breed: 'Barred Rock', color: 'Black and white barred', hatchDate: addMonths(today, -18), notes: 'Boss of the run.' },
    { ...base, id: uid('bird_'), name: 'Olive', breed: 'Easter Egger', color: 'Brown with a muff', hatchDate: addMonths(today, -9), notes: 'Lays green eggs.' },
  ];
  const odds = [0.8, 0.9, 0.72];
  const rand = rng(42);
  const logs: EggLog[] = [];
  for (let d = 13; d >= 0; d--) {
    const day = addDays(today, -d);
    if (d === 0) continue; // leave today for the user to log
    birds.forEach((b, i) => {
      if (rand() < odds[i]) {
        logs.push({ id: uid('egg_'), householdId, flockId, birdId: b.id, collectedOn: day, count: 1, damaged: d === 5 && i === 1 ? 1 : 0, createdAt: ts, updatedAt: ts, sample: true });
      }
    });
  }
  // Feed and treats. This morning's feeding is already checked off and deducted.
  const item = (name: string, category: FeedItem['category'], unit: string, quantity: number, countedAgo: number, dailyUsage: number, lowStockDays: number): FeedItem =>
    ({ id: uid('feed_'), householdId, name, category, unit, quantity, countedOn: addDays(today, -countedAgo), dailyUsage, lowStockDays, createdAt: ts, updatedAt: ts, sample: true });
  const layerStart = item('Layer feed', 'feed', 'lb', 50, 12, 0.75, 10);
  const morningAmount = defaultFeedingAmount(layerStart, DEFAULT_FEED_TIMES.length);
  const layer: FeedItem = { ...layerStart, ...applyFeedingUse(layerStart, morningAmount, today) };
  const scratch = item('Scratch grains', 'scratch', 'lb', 10, 6, 0.08, 7);
  const mealworms = item('Dried mealworms', 'treats', 'lb', 0.8, 3, 0.05, 14);
  const feed: FeedItem[] = [layer, item('Pine shavings', 'bedding', 'bags', 2, 8, 0.1, 7), scratch, mealworms];
  const morningUseId = uid('flog_');

  return {
    birds,
    egg_collections: logs,
    egg_inventory: [
      { id: uid('out_'), householdId, occurredOn: addDays(today, -6), kind: 'sold', count: 12, amount: 6, customer: 'Neighbor Jan', createdAt: ts, updatedAt: ts, sample: true },
      { id: uid('out_'), householdId, occurredOn: addDays(today, -3), kind: 'used', count: 6, notes: 'Weekend breakfast', createdAt: ts, updatedAt: ts, sample: true },
    ],
    flock_costs: sampleCosts(householdId, today, ts),
    feed_inventory: feed,
    feed_logs: [
      { id: morningUseId, householdId, itemId: layer.id, occurredOn: today, kind: 'use', amount: morningAmount, notes: 'Morning feed', createdAt: ts, updatedAt: ts, sample: true },
    ],
    feeding_logs: [
      { id: uid('fdg_'), householdId, flockId, day: today, slot: 0, label: DEFAULT_FEED_TIMES[0], doneAt: atLocalTime(today, 7, 10), itemId: layer.id, amount: morningAmount, feedLogId: morningUseId, createdAt: ts, updatedAt: ts, sample: true },
    ],
    treat_logs: [
      { id: uid('trt_'), householdId, flockId, day: today, itemId: scratch.id, amount: 1, unit: 'handfuls', createdAt: ts, updatedAt: ts, sample: true },
      { id: uid('trt_'), householdId, flockId, day: today, itemId: mealworms.id, amount: 5, unit: 'grams', createdAt: ts, updatedAt: ts, sample: true },
    ],
    bird_health_events: [
      { id: uid('care_'), householdId, flockId, type: 'mites_lice_check', occurredOn: addDays(today, -10), notes: 'All clear under the vent and wings.', remindOn: addDays(today, 20), createdAt: ts, updatedAt: ts, sample: true },
    ],
  };
}

/** ISO instant for a local clock time on a calendar day. */
function atLocalTime(day: DateKey, h: number, m: number): string {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).toISOString();
}

/** Four months of costs across categories, never dated after today. */
function sampleCosts(householdId: ID, today: DateKey, ts: string): FlockCost[] {
  const plan: [number, number, CostCategory, number, string][] = [
    // [months ago, day of month, category, amount, notes]
    [0, 2, 'feed', 24.99, '50 lb layer feed'], [0, 5, 'bedding', 8.5, 'Pine shavings'], [0, 9, 'feed', 15.99, 'Dried mealworms'], [0, 12, 'equipment', 14.99, 'Nest box pads'],
    [1, 3, 'feed', 24.99, '50 lb layer feed'], [1, 8, 'feed', 12.99, 'Scratch grains'], [1, 15, 'other', 9.99, 'Nesting herbs'], [1, 22, 'bedding', 8.5, 'Pine shavings'],
    [2, 1, 'feed', 24.99, '50 lb layer feed'], [2, 14, 'vet', 35, 'Fecal float test'], [2, 20, 'bedding', 17, 'Straw bale'],
    [3, 4, 'feed', 23.49, '50 lb layer feed'], [3, 10, 'equipment', 42, 'Heated waterer base'], [3, 18, 'feed', 12.99, 'Scratch grains'],
  ];
  const first = `${monthKey(today)}-01`;
  return plan.map(([ago, day, category, amount, notes]) => {
    const d = addDays(addMonths(first, -ago), day - 1);
    const occurredOn = d > today ? today : d;
    return { id: uid('cost_'), householdId, occurredOn, category, amount, notes, createdAt: ts, updatedAt: ts, sample: true };
  });
}
