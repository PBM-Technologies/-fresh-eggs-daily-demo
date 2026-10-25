import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from '../router';

export function Page({ title, subtitle, back, action, children }: { title: string; subtitle?: ReactNode; back?: string; action?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = title === 'Today' ? 'Fresh Eggs Daily' : `${title} | Fresh Eggs Daily`;
  }, [title]);
  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page-head">
        {back && (
          <Link to={back} className="icon-btn back" aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
        )}
        <div className="page-titles">
          <h1 id="page-title" tabIndex={-1}>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {action && <div className="page-action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'card ' + className}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, title, children, action }: { icon: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: 'warn' | 'good' }) {
  return (
    <div className={'stat' + (tone ? ' ' + tone : '')}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Tap-friendly single choice. Replaces native select on phones. */
export function Chips<T extends string>({ label, value, options, onChange, hideLabel }: { label: string; value: NoInfer<T> | undefined; options: readonly { value: T; label: string; emoji?: string }[]; onChange(v: NoInfer<T>): void; hideLabel?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <span id={id} className={hideLabel ? 'sr-only' : 'label'}>{label}</span>
      <div className="chips" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={'chip' + (value === o.value ? ' on' : '')} onClick={() => onChange(o.value)}>
            {o.emoji && <span aria-hidden="true">{o.emoji} </span>}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint || error ? id + '-hint' : undefined;
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <label className="label" htmlFor={id}>{label}</label>
      {children(id, hintId)}
      {error ? <p className="error-text" id={hintId} role="alert">{error}</p> : hint ? <p className="hint" id={hintId}>{hint}</p> : null}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, label, big }: { value: number; onChange(n: number): void; min?: number; max?: number; label: string; big?: boolean }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min));
  return (
    <div className={'stepper' + (big ? ' big' : '')} role="group" aria-label={label}>
      <button type="button" className="step-btn" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - 1))} disabled={value <= min}>−</button>
      <input
        className="step-value"
        inputMode="numeric"
        aria-label={label}
        value={String(value)}
        onChange={(e) => onChange(clamp(parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="step-btn" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}

/** Bottom sheet dialog using the native dialog element for focus trapping and Esc. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch { d.setAttribute('open', ''); }
    } else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm(): void; onClose(): void }) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className="muted" style={{ marginBottom: 16 }}>{body}</div>
      <div className="row gap">
        <button type="button" className="btn ghost grow" onClick={onClose}>Cancel</button>
        <button type="button" className={'btn grow ' + (danger ? 'danger' : 'primary')} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Sheet>
  );
}

export function Pill({ children, tone }: { children: ReactNode; tone?: 'warn' | 'good' | 'bad' | 'info' }) {
  return <span className={'pill' + (tone ? ' ' + tone : '')}>{children}</span>;
}

export function BarChart({ data, label, formatLabel }: { data: { key: string; count: number; label: string }[]; label: string; formatLabel(key: string, i: number): string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 320;
  const h = 150;
  const pad = 18;
  const bw = (w - 8) / data.length;
  const every = data.length > 16 ? 5 : data.length > 8 ? 2 : 1;
  const total = data.reduce((a, b) => a + b.count, 0);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${w} ${h + pad}`} role="img" aria-label={`${label}. ${total} eggs total. Highest ${max}.`}>
        <line x1="0" x2={w} y1={h} y2={h} className="axis" />
        {data.map((d, i) => {
          const bh = d.count ? Math.max(3, (d.count / max) * (h - 18)) : 0;
          const x = 4 + i * bw + bw * 0.15;
          return (
            <g key={d.key}>
              <rect x={x} y={h - bh} width={bw * 0.7} height={bh} rx={Math.min(5, bw * 0.2)} className="bar"><title>{`${formatLabel(d.key, i)}: ${d.count}`}</title></rect>
              {d.count > 0 && bw > 16 && <text x={x + bw * 0.35} y={h - bh - 4} className="bar-val" textAnchor="middle">{d.count}</text>}
              {i % every === (data.length - 1) % every && <text x={x + bw * 0.35} y={h + 13} className="tick" textAnchor="middle">{formatLabel(d.key, i)}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="egg-spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
