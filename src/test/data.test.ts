import { beforeEach, describe, expect, it } from 'vitest';
import { createKeyValueAdapter } from '../data/localAdapter';
import { memoryBackend, safeLocalStorage, type KeyValueBackend } from '../data/storage';
import { buildBackup, createHousehold, deleteEverything, eggsCsv, loadSnapshot, parseBackup, removeSample, restoreBackup, toCsv } from '../data/service';
import { buildSampleFlock } from '../data/sample';
import type { CollectionName } from '../contracts/domain';

const ts = '2026-10-25T00:00:00.000Z';

describe('Store (key value adapter)', () => {
  let kv: KeyValueBackend;
  beforeEach(() => { kv = memoryBackend(); });
  it('supports list, get, upsert, remove', async () => {
    const a = createKeyValueAdapter(kv);
    const s = a.collection('flocks');
    expect(await s.list()).toEqual([]);
    await s.upsert({ id: '1', householdId: 'h', name: 'A', createdAt: ts, updatedAt: ts });
    await s.upsert({ id: '2', householdId: 'h', name: 'B', createdAt: ts, updatedAt: ts });
    await s.upsert({ id: '1', householdId: 'h', name: 'A2', createdAt: ts, updatedAt: ts });
    expect((await s.list()).map((f) => f.name)).toEqual(['A2', 'B']);
    expect((await s.get('2'))?.name).toBe('B');
    await s.remove('1');
    expect((await s.list()).map((f) => f.id)).toEqual(['2']);
    // a fresh adapter over the same backend sees the same data (persistence)
    expect((await createKeyValueAdapter(kv).collection('flocks').list()).length).toBe(1);
  });
  it('ignores corrupt stored JSON instead of crashing', async () => {
    kv.setItem('fed:v1:birds', '{not json');
    kv.setItem('fed:v1:flocks', '{"oops":true}');
    const a = createKeyValueAdapter(kv);
    expect(await a.collection('birds').list()).toEqual([]);
    expect(await a.collection('flocks').list()).toEqual([]);
  });
});

describe('safeLocalStorage', () => {
  it('falls back to memory when localStorage throws', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      const kv = safeLocalStorage();
      expect(kv.persistent).toBe(false);
      kv.setItem('a', '1');
      expect(kv.getItem('a')).toBe('1');
    } finally {
      if (orig) Object.defineProperty(window, 'localStorage', orig);
    }
  });
  it('falls back when a write throws (quota)', () => {
    const kv = safeLocalStorage();
    expect(kv.persistent).toBe(true);
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    try {
      kv.setItem('b', '2');
      expect(kv.getItem('b')).toBe('2');
      expect(kv.persistent).toBe(false);
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});

describe('service', () => {
  it('creates a household with a flock and default chores, and round-trips a backup', async () => {
    const a = createKeyValueAdapter(memoryBackend());
    await createHousehold(a, ' The Millers ', 'Backyard', '2026-10-25');
    const s = await loadSnapshot(a);
    expect(s.household?.name).toBe('The Millers');
    expect(s.flocks).toHaveLength(1);
    expect(s.chore_templates.map((c) => c.title)).toContain('Collect eggs');
    expect(s.chore_templates).toHaveLength(6);

    const json = JSON.stringify(buildBackup(s));
    const b = createKeyValueAdapter(memoryBackend());
    await restoreBackup(b, parseBackup(json));
    const s2 = await loadSnapshot(b);
    expect(s2.household?.name).toBe('The Millers');
    expect(s2.chore_templates).toHaveLength(6);

    await deleteEverything(b);
    const s3 = await loadSnapshot(b);
    expect(s3.household).toBeNull();
    expect(s3.flocks).toEqual([]);
  });
  it('rejects bad backup files with friendly messages', () => {
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/not a Fresh Eggs Daily backup/);
    expect(() => parseBackup('{"app":"fresh-eggs-daily","version":1}')).toThrow(/missing its household/);
    expect(() => parseBackup('{"app":"fresh-eggs-daily","version":1,"household":{"id":"h","name":"x"},"collections":{"birds":5}}')).toThrow(/damaged/);
  });
  it('loads and removes the sample flock without touching real data', async () => {
    const a = createKeyValueAdapter(memoryBackend());
    await createHousehold(a, 'H', 'F', '2026-10-25');
    const s = await loadSnapshot(a);
    await a.collection('birds').upsert({ id: 'real', householdId: s.household!.id, flockId: s.flocks[0].id, name: 'Real hen', status: 'active', createdAt: ts, updatedAt: ts });
    const sample = buildSampleFlock(s.household!.id, s.flocks[0].id, '2026-10-25');
    for (const [c, rows] of Object.entries(sample)) {
      const store = a.collection(c as CollectionName);
      await store.replaceAll([...(await store.list()), ...(rows as never[])] as never);
    }
    const loaded = await loadSnapshot(a);
    expect(loaded.birds.map((b) => b.name).sort()).toEqual(['Daisy', 'Olive', 'Pepper', 'Real hen']);
    expect(loaded.egg_collections.length).toBeGreaterThan(20);
    expect(loaded.egg_collections.every((l) => l.collectedOn < '2026-10-25' && l.collectedOn >= '2026-10-12')).toBe(true);
    await removeSample(a);
    const after = await loadSnapshot(a);
    expect(after.birds.map((b) => b.name)).toEqual(['Real hen']);
    expect(after.egg_collections).toEqual([]);
    expect(after.chore_templates).toHaveLength(6);
  });
  it('writes CSV with escaping', async () => {
    expect(toCsv([{ a: 'x,y', b: 'say "hi"' }], ['a', 'b'])).toBe('a,b\n"x,y","say ""hi"""');
    const a = createKeyValueAdapter(memoryBackend());
    await createHousehold(a, 'H', 'F', '2026-10-25');
    const s = await loadSnapshot(a);
    await a.collection('egg_collections').upsert({ id: 'e', householdId: 'h', flockId: s.flocks[0].id, collectedOn: '2026-10-25', count: 4, damaged: 1, createdAt: ts, updatedAt: ts });
    expect(eggsCsv(await loadSnapshot(a))).toBe('date,flock,hen,collected,damaged,notes\n2026-10-25,F,,4,1,');
  });
});
