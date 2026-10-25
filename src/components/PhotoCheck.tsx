import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getVisionAI, isPermanentOff, MAX_PHOTOS, NO_AI_NOTE, type VisionAI, type VisionError } from '../ai/vision';
import { compressImageBlob } from './helpers';

export type AiState = 'checking' | 'ready' | 'none';

/** Resolves the vision adapter once on mount. Never spends usage. */
export function useVisionAI(): { ai: VisionAI | null; state: AiState; markOff(): void } {
  const [ai, setAi] = useState<VisionAI | null>(null);
  const [state, setState] = useState<AiState>('checking');
  useEffect(() => {
    let live = true;
    void getVisionAI().then((v) => { if (live) { setAi(v); setState(v ? 'ready' : 'none'); } }).catch(() => { if (live) setState('none'); });
    return () => { live = false; };
  }, []);
  return { ai, state, markOff: () => { setAi(null); setState('none'); } };
}

export interface Photo { id: string; blob: Blob; url: string }

/** Camera and library pickers plus thumbnails. Up to MAX_PHOTOS photos, compressed to 1280px JPEG. */
export function PhotoPicker({ photos, onChange, disabled, hint }: { photos: Photo[]; onChange(p: Photo[]): void; disabled?: boolean; hint?: string }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const full = photos.length >= MAX_PHOTOS;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr('');
    const next = [...photos];
    try {
      for (const f of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break;
        const blob = await compressImageBlob(f);
        next.push({ id: Math.random().toString(36).slice(2), blob, url: URL.createObjectURL(blob) });
      }
      onChange(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not use that photo.');
    } finally {
      setBusy(false);
    }
  }
  function removeAt(id: string) {
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.url);
    onChange(photos.filter((x) => x.id !== id));
  }

  const off = disabled || full || busy;
  return (
    <div className="field">
      {photos.length > 0 && (
        <ul className="photo-strip" aria-label="Photos to check">
          {photos.map((p, i) => (
            <li key={p.id}>
              <img src={p.url} alt={`Photo ${i + 1}`} />
              <button type="button" className="photo-x" aria-label={`Remove photo ${i + 1}`} onClick={() => removeAt(p.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="photo-actions">
        <label className={'btn primary' + (off ? ' is-disabled' : '')} aria-disabled={off || undefined}>
          📷 {photos.length ? 'Take another photo' : 'Take a photo'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={off} aria-label="Take a photo" onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        </label>
        <label className={'btn' + (off ? ' is-disabled' : '')} aria-disabled={off || undefined}>
          Choose from library
          <input type="file" accept="image/*" multiple className="sr-only" disabled={off} aria-label="Choose from library" onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      <p className="hint">{busy ? 'Preparing photo…' : full ? `That is the most photos for one check (${MAX_PHOTOS}).` : hint ?? `Up to ${MAX_PHOTOS} photos. Good light and a close, sharp shot help most.`}</p>
      {err && <p className="error-text" role="alert">{err}</p>}
    </div>
  );
}

export function NoAiNote() {
  return <div className="notice info" role="note">{NO_AI_NOTE}</div>;
}

/** Runs one check with a Cancel button. Never retries on its own. */
export function useCheck<T>(ai: VisionAI | null, onOff: () => void) {
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<T | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  async function run(prompt: string, images: Blob[], clean: (raw: unknown) => T) {
    if (!ai || thinking) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setThinking(true);
    setError('');
    setResult(null);
    try {
      const raw = await ai.askJson<unknown>(prompt, images, c.signal);
      if (!c.signal.aborted) setResult(clean(raw));
    } catch (e) {
      const ve = e as VisionError;
      if (ve?.code !== 'cancelled' && !c.signal.aborted) {
        setError(ve?.message || 'Something went wrong. Try again.');
        if (isPermanentOff(ve?.code)) onOff();
      }
    } finally {
      if (ctl.current === c) { ctl.current = null; setThinking(false); }
    }
  }
  function cancel() { ctl.current?.abort(); ctl.current = null; setThinking(false); }
  function clear() { setResult(null); setError(''); }
  return { thinking, error, result, run, cancel, clear };
}

export function Thinking({ onCancel, label = 'Thinking...' }: { onCancel(): void; label?: string }) {
  return (
    <div className="card center thinking" role="status" aria-live="polite">
      <div className="row gap" style={{ justifyContent: 'center' }}>
        <span className="egg-spin" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
      <p className="small muted" style={{ margin: '8px 0 12px' }}>This usually takes a few seconds.</p>
      <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/** 1 to 3 dots meter. */
export function Meter({ value, label }: { value: 1 | 2 | 3; label: string }) {
  const words = ['', 'Low', 'Medium', 'High'];
  return (
    <span className="meter" role="img" aria-label={`${label}: ${words[value]}`}>
      {[1, 2, 3].map((i) => <span key={i} className={'meter-dot' + (i <= value ? ' on' : '')} />)}
    </span>
  );
}

export function EggDot({ hex, label, big }: { hex: string; label?: string; big?: boolean }) {
  return <span className={'egg-dot' + (big ? ' big' : '')} style={{ background: hex }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange(v: T): void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}
