import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CollectionMap, CollectionName, ID } from '../contracts/domain';
import { createLocalAdapter } from '../data/localAdapter';
import type { DataAdapter } from '../data/repository';
import { emptySnapshot, loadSnapshot, type Snapshot } from '../data/service';
import { nowIso, uid } from '../data/ids';
import { todayKey } from '../logic/dates';

type Status = 'loading' | 'ready' | 'error';
type NewRecord<K extends CollectionName> = Omit<CollectionMap[K], 'id' | 'createdAt' | 'updatedAt' | 'householdId'> & Partial<Pick<CollectionMap[K], 'id'>>;

interface AppDataValue {
  status: Status;
  error: string | null;
  data: Snapshot;
  adapter: DataAdapter;
  today: string;
  activeFlockId: ID | null;
  setActiveFlockId(id: ID): void;
  reload(): Promise<void>;
  /** Insert or update a record; householdId and timestamps are filled in. */
  save<K extends CollectionName>(c: K, rec: NewRecord<K> | CollectionMap[K]): Promise<CollectionMap[K]>;
  remove<K extends CollectionName>(c: K, id: ID): Promise<void>;
  toast(msg: string): void;
  toastMsg: string | null;
}

const Ctx = createContext<AppDataValue | null>(null);
const FLOCK_KEY = 'fed:ui:activeFlock';

function readPref(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function writePref(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* per-viewer convenience only */ }
}

export function AppDataProvider({ children, adapter: given }: { children: ReactNode; adapter?: DataAdapter }) {
  const adapter = useMemo(() => given ?? createLocalAdapter(), [given]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [today, setToday] = useState(todayKey());
  const [activeFlockId, setActive] = useState<ID | null>(readPref(FLOCK_KEY));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const s = await loadSnapshot(adapter);
      setData(s);
      setStatus('ready');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong loading your data.');
      setStatus('error');
    }
  }, [adapter]);

  useEffect(() => { void reload(); }, [reload]);

  // Roll the day over if the app stays open past midnight.
  useEffect(() => {
    const t = window.setInterval(() => setToday(todayKey()), 60_000);
    const onVis = () => setToday(todayKey());
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const flockId = useMemo(() => {
    if (activeFlockId && data.flocks.some((f) => f.id === activeFlockId)) return activeFlockId;
    return data.flocks[0]?.id ?? null;
  }, [activeFlockId, data.flocks]);

  const setActiveFlockId = useCallback((id: ID) => { setActive(id); writePref(FLOCK_KEY, id); }, []);

  const save = useCallback(async <K extends CollectionName>(c: K, rec: NewRecord<K> | CollectionMap[K]) => {
    const ts = nowIso();
    const existing = 'id' in rec && rec.id ? data[c].find((x) => x.id === rec.id) : undefined;
    const full = {
      ...(existing ?? {}),
      ...rec,
      id: (rec as { id?: string }).id || uid(c.slice(0, 4) + '_'),
      householdId: data.household?.id ?? 'local',
      createdAt: (existing as { createdAt?: string } | undefined)?.createdAt ?? ts,
      updatedAt: ts,
    } as unknown as CollectionMap[K];
    const saved = await adapter.collection(c).upsert(full);
    setData((prev) => {
      const list = prev[c] as CollectionMap[K][];
      const i = list.findIndex((x) => x.id === saved.id);
      const next = i >= 0 ? list.map((x, j) => (j === i ? saved : x)) : [...list, saved];
      return { ...prev, [c]: next };
    });
    return saved;
  }, [adapter, data]);

  const remove = useCallback(async <K extends CollectionName>(c: K, id: ID) => {
    await adapter.collection(c).remove(id);
    setData((prev) => ({ ...prev, [c]: (prev[c] as { id: string }[]).filter((x) => x.id !== id) }));
  }, [adapter]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const value: AppDataValue = { status, error, data, adapter, today, activeFlockId: flockId, setActiveFlockId, reload, save, remove, toast, toastMsg };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppDataValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppDataProvider');
  return v;
}
