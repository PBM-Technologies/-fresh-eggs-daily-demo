export function uid(prefix = ''): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return prefix + crypto.randomUUID();
  } catch { /* fall through */ }
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
export const nowIso = () => new Date().toISOString();
