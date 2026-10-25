import type { CollectionMap, CollectionName, Household, ID } from '../contracts/domain';

/**
 * Persistence contract for one domain collection. Async so a Firebase or
 * Postgres (HTTP) adapter can implement it without changing callers.
 */
export interface Store<T extends { id: ID }> {
  list(): Promise<T[]>;
  get(id: ID): Promise<T | undefined>;
  upsert(item: T): Promise<T>;
  remove(id: ID): Promise<void>;
  /** Replace the whole collection (used by import and reset). */
  replaceAll(items: T[]): Promise<void>;
}

export interface ProfileStore {
  getHousehold(): Promise<Household | null>;
  saveHousehold(h: Household): Promise<Household>;
  clearHousehold(): Promise<void>;
}

/** A complete backend: one Store per collection plus the household profile. */
export interface DataAdapter {
  readonly name: string;
  readonly persistent: boolean;
  profile: ProfileStore;
  collection<K extends CollectionName>(name: K): Store<CollectionMap[K]>;
}
