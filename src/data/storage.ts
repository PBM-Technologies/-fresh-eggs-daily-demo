/** Minimal key/value backend. localStorage when it works, memory otherwise. */
export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
  /** False when we fell back to memory (private mode, blocked storage, quota). */
  readonly persistent: boolean;
}

export function memoryBackend(): KeyValueBackend {
  const map = new Map<string, string>();
  return {
    persistent: false,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

/**
 * Wraps window.localStorage. Every call is guarded; the first failure flips the
 * backend to an in-memory copy so the app keeps working for the session.
 */
export function safeLocalStorage(): KeyValueBackend {
  const memory = memoryBackend();
  let ls: Storage | null = null;
  try {
    ls = typeof window !== 'undefined' ? window.localStorage : null;
    if (ls) {
      const probe = '__fed_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
    }
  } catch {
    ls = null;
  }
  let usingMemory = !ls;
  const fallback = (err: unknown) => {
    if (!usingMemory) {
      // Copy what we can so reads stay consistent after the switch.
      try {
        if (ls) for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k) { const v = ls.getItem(k); if (v !== null) memory.setItem(k, v); } }
      } catch { /* ignore */ }
      usingMemory = true;
      console.warn('Fresh Eggs Daily: browser storage unavailable, keeping data in memory for this session.', err);
    }
  };
  return {
    get persistent() { return !usingMemory; },
    getItem(k) {
      if (usingMemory || !ls) return memory.getItem(k);
      try { return ls.getItem(k); } catch (e) { fallback(e); return memory.getItem(k); }
    },
    setItem(k, v) {
      if (usingMemory || !ls) return memory.setItem(k, v);
      try { ls.setItem(k, v); } catch (e) { fallback(e); memory.setItem(k, v); }
    },
    removeItem(k) {
      memory.removeItem(k);
      if (usingMemory || !ls) return;
      try { ls.removeItem(k); } catch (e) { fallback(e); }
    },
    keys() {
      if (usingMemory || !ls) return memory.keys();
      try { const out: string[] = []; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k) out.push(k); } return out; } catch (e) { fallback(e); return memory.keys(); }
    },
  };
}
