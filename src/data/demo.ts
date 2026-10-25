import type { CollectionName, DateKey } from '../contracts/domain';
import type { DataAdapter } from './repository';
import { addDays } from '../logic/dates';
import { nowIso, uid } from './ids';
import { buildSampleFlock } from './sample';
import { createHousehold, deleteEverything } from './service';

/**
 * Demo mode: a build made with VITE_DEMO=1 opens with a fictional flock already
 * set up so the app can be shown without onboarding. Demo data uses its own
 * storage prefix (see localAdapter), so it never mixes with real data.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === '1';

export async function seedDemo(adapter: DataAdapter, today: DateKey): Promise<void> {
  if (await adapter.profile.getHousehold()) return;
  await createHousehold(adapter, 'Maple Hill', 'Backyard girls', today);
  const household = await adapter.profile.getHousehold();
  const flock = (await adapter.collection('flocks').list())[0];
  if (!household || !flock) return;
  const sample = buildSampleFlock(household.id, flock.id, today);
  for (const [c, rows] of Object.entries(sample)) {
    const store = adapter.collection(c as CollectionName);
    const existing = await store.list();
    await store.replaceAll([...existing, ...(rows as never[])] as never);
  }
  const ts = nowIso();
  await adapter.collection('incubation_batches').upsert({
    id: uid('batch_'), householdId: household.id, name: 'Spring hatch (sample)', setOn: addDays(today, -12), eggCount: 12,
    notes: 'Olive Egger eggs from a friend.', createdAt: ts, updatedAt: ts, sample: true,
  });
}

export async function resetDemo(adapter: DataAdapter, today: DateKey): Promise<void> {
  await deleteEverything(adapter);
  await seedDemo(adapter, today);
}
