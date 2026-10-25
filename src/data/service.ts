import { COLLECTIONS, type BackupFile, type ChoreTemplate, type CollectionMap, type CollectionName, type Household, type ID } from '../contracts/domain';
import { DEFAULT_CHORES } from '../logic/chores';
import type { DataAdapter } from './repository';
import { nowIso, uid } from './ids';

export type Snapshot = { household: Household | null } & { [K in CollectionName]: CollectionMap[K][] };

export function emptySnapshot(): Snapshot {
  const s = { household: null } as Snapshot;
  for (const c of COLLECTIONS) (s as unknown as Record<string, unknown[]>)[c] = [];
  return s;
}

export async function loadSnapshot(adapter: DataAdapter): Promise<Snapshot> {
  const s = emptySnapshot();
  s.household = await adapter.profile.getHousehold();
  await Promise.all(
    COLLECTIONS.map(async (c) => {
      (s as unknown as Record<string, unknown[]>)[c] = await adapter.collection(c).list();
    })
  );
  return s;
}

export function defaultChoreTemplates(householdId: ID, startDate: string): ChoreTemplate[] {
  const ts = nowIso();
  return DEFAULT_CHORES.map((c) => ({
    id: uid('chore_'), householdId, title: c.title, recurrence: c.recurrence, startDate, active: true, builtIn: true, createdAt: ts, updatedAt: ts,
  }));
}

/** Creates the household, its first flock and the default chore templates. */
export async function createHousehold(adapter: DataAdapter, name: string, flockName: string, today: string): Promise<void> {
  const ts = nowIso();
  const household: Household = { id: uid('hh_'), name: name.trim(), createdAt: ts, updatedAt: ts };
  await adapter.profile.saveHousehold(household);
  await adapter.collection('flocks').upsert({ id: uid('flock_'), householdId: household.id, name: flockName.trim(), createdAt: ts, updatedAt: ts });
  const existing = await adapter.collection('chore_templates').list();
  if (!existing.length) await adapter.collection('chore_templates').replaceAll(defaultChoreTemplates(household.id, today));
}

export function buildBackup(s: Snapshot): BackupFile {
  if (!s.household) throw new Error('Nothing to export yet.');
  const collections = {} as BackupFile['collections'];
  for (const c of COLLECTIONS) (collections as unknown as Record<string, unknown[]>)[c] = s[c];
  return { app: 'fresh-eggs-daily', version: 1, exportedAt: nowIso(), household: s.household, collections };
}

/** Validates an untrusted backup file. Throws a friendly Error when it is not usable. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const d = data as Partial<BackupFile> | null;
  if (!d || d.app !== 'fresh-eggs-daily' || d.version !== 1) throw new Error('That file is not a Fresh Eggs Daily backup.');
  if (!d.household || typeof d.household.name !== 'string' || typeof d.household.id !== 'string') throw new Error('The backup is missing its household.');
  const collections = {} as BackupFile['collections'];
  for (const c of COLLECTIONS) {
    const v = (d.collections as Record<string, unknown> | undefined)?.[c];
    if (v !== undefined && !Array.isArray(v)) throw new Error(`The backup section "${c}" is damaged.`);
    const rows = ((v as unknown[]) ?? []).filter((r): r is { id: string } => !!r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string');
    (collections as unknown as Record<string, unknown[]>)[c] = rows;
  }
  return { app: 'fresh-eggs-daily', version: 1, exportedAt: String(d.exportedAt ?? ''), household: d.household, collections };
}

export async function restoreBackup(adapter: DataAdapter, b: BackupFile): Promise<void> {
  await adapter.profile.saveHousehold(b.household);
  await Promise.all(COLLECTIONS.map((c) => adapter.collection(c).replaceAll(b.collections[c] as never)));
}

export async function deleteEverything(adapter: DataAdapter): Promise<void> {
  await Promise.all(COLLECTIONS.map((c) => adapter.collection(c).replaceAll([])));
  await adapter.profile.clearHousehold();
}

/** Removes every record flagged sample: true. */
export async function removeSample(adapter: DataAdapter): Promise<number> {
  let removed = 0;
  for (const c of COLLECTIONS) {
    const store = adapter.collection(c);
    const items = (await store.list()) as { id: string; sample?: boolean }[];
    const keep = items.filter((x) => !x.sample);
    removed += items.length - keep.length;
    if (keep.length !== items.length) await store.replaceAll(keep as never);
  }
  return removed;
}

// --- CSV ---------------------------------------------------------------------
function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n');
}
export function eggsCsv(s: Snapshot): string {
  const birdName = new Map(s.birds.map((b) => [b.id, b.name]));
  const flockName = new Map(s.flocks.map((f) => [f.id, f.name]));
  const rows = [...s.egg_collections].sort((a, b) => a.collectedOn.localeCompare(b.collectedOn)).map((l) => ({
    date: l.collectedOn, flock: flockName.get(l.flockId) ?? '', hen: l.birdId ? birdName.get(l.birdId) ?? '' : '', collected: l.count, damaged: l.damaged ?? 0, notes: l.notes ?? '',
  }));
  return toCsv(rows, ['date', 'flock', 'hen', 'collected', 'damaged', 'notes']);
}
export function salesCsv(s: Snapshot): string {
  const rows = [...s.egg_inventory].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)).map((d) => ({
    date: d.occurredOn, type: d.kind, eggs: d.count, amount: d.amount ?? '', customer: d.customer ?? '', notes: d.notes ?? '',
  }));
  return toCsv(rows, ['date', 'type', 'eggs', 'amount', 'customer', 'notes']);
}
export function costsCsv(s: Snapshot): string {
  const rows = [...s.flock_costs].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)).map((c) => ({
    date: c.occurredOn, category: c.category, amount: c.amount, notes: c.notes ?? '',
  }));
  return toCsv(rows, ['date', 'category', 'amount', 'notes']);
}
