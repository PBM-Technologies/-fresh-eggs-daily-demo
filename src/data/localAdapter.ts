import type { CollectionMap, CollectionName, Household, ID } from '../contracts/domain';
import type { DataAdapter, ProfileStore, Store } from './repository';
import { safeLocalStorage, type KeyValueBackend } from './storage';

export const KEY_PREFIX = 'fed:v1:';

function readJson<T>(kv: KeyValueBackend, key: string, fallback: T): T {
  try {
    const raw = kv.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}
function writeJson(kv: KeyValueBackend, key: string, value: unknown) {
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch (e) {
    // JSON or backend failure: the backend itself already falls back to memory.
    console.warn('Fresh Eggs Daily: could not save', key, e);
  }
}

export class KeyValueStore<T extends { id: ID }> implements Store<T> {
  constructor(private kv: KeyValueBackend, private key: string) {}
  private all(): T[] {
    const v = readJson<unknown>(this.kv, this.key, []);
    return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object' && typeof (x as T).id === 'string') as T[]) : [];
  }
  async list() { return this.all(); }
  async get(id: ID) { return this.all().find((x) => x.id === id); }
  async upsert(item: T) {
    const items = this.all();
    const i = items.findIndex((x) => x.id === item.id);
    if (i >= 0) items[i] = item; else items.push(item);
    writeJson(this.kv, this.key, items);
    return item;
  }
  async remove(id: ID) {
    writeJson(this.kv, this.key, this.all().filter((x) => x.id !== id));
  }
  async replaceAll(items: T[]) {
    if (items.length) writeJson(this.kv, this.key, items); else this.kv.removeItem(this.key);
  }
}

class KeyValueProfile implements ProfileStore {
  constructor(private kv: KeyValueBackend) {}
  async getHousehold() {
    const h = readJson<Household | null>(this.kv, KEY_PREFIX + 'household', null);
    return h && typeof h.name === 'string' && typeof h.id === 'string' ? h : null;
  }
  async saveHousehold(h: Household) { writeJson(this.kv, KEY_PREFIX + 'household', h); return h; }
  async clearHousehold() { this.kv.removeItem(KEY_PREFIX + 'household'); }
}

export function createKeyValueAdapter(kv: KeyValueBackend, name = 'localStorage'): DataAdapter {
  const stores = new Map<CollectionName, Store<{ id: ID }>>();
  return {
    name,
    get persistent() { return kv.persistent; },
    profile: new KeyValueProfile(kv),
    collection<K extends CollectionName>(c: K) {
      let s = stores.get(c);
      if (!s) { s = new KeyValueStore(kv, KEY_PREFIX + c); stores.set(c, s); }
      return s as unknown as Store<CollectionMap[K]>;
    },
  };
}

export function createLocalAdapter(): DataAdapter {
  return createKeyValueAdapter(safeLocalStorage());
}
