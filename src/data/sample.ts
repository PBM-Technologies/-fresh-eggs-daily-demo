import type { Bird, CollectionMap, CollectionName, DateKey, EggLog, ID } from '../contracts/domain';
import { addDays, addMonths } from '../logic/dates';
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
  return {
    birds,
    egg_collections: logs,
    egg_inventory: [
      { id: uid('out_'), householdId, occurredOn: addDays(today, -6), kind: 'sold', count: 12, amount: 6, customer: 'Neighbor Jan', createdAt: ts, updatedAt: ts, sample: true },
      { id: uid('out_'), householdId, occurredOn: addDays(today, -3), kind: 'used', count: 6, notes: 'Weekend breakfast', createdAt: ts, updatedAt: ts, sample: true },
    ],
    flock_costs: [
      { id: uid('cost_'), householdId, occurredOn: addDays(today, -12), category: 'feed', amount: 24.99, notes: '50 lb layer feed', createdAt: ts, updatedAt: ts, sample: true },
      { id: uid('cost_'), householdId, occurredOn: addDays(today, -8), category: 'bedding', amount: 8.5, notes: 'Pine shavings', createdAt: ts, updatedAt: ts, sample: true },
    ],
    feed_inventory: [
      { id: uid('feed_'), householdId, name: 'Layer feed', category: 'feed', unit: 'lb', quantity: 50, countedOn: addDays(today, -12), dailyUsage: 0.75, lowStockDays: 10, createdAt: ts, updatedAt: ts, sample: true },
      { id: uid('feed_'), householdId, name: 'Pine shavings', category: 'bedding', unit: 'bags', quantity: 2, countedOn: addDays(today, -8), dailyUsage: 0.1, lowStockDays: 7, createdAt: ts, updatedAt: ts, sample: true },
    ],
    bird_health_events: [
      { id: uid('care_'), householdId, flockId, type: 'mites_lice_check', occurredOn: addDays(today, -10), notes: 'All clear under the vent and wings.', remindOn: addDays(today, 20), createdAt: ts, updatedAt: ts, sample: true },
    ],
  };
}
