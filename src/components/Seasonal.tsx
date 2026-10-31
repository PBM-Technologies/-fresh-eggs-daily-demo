import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Link } from '../router';
import { currentPosition, searchPlaces, type Place } from '../data/weather';
import { describeCode, productPicks, weatherAlerts, type DayForecast, type WeatherAlert } from '../logic/seasonal';

export function ForecastStrip({ days, today }: { days: DayForecast[]; today: string }) {
  return (
    <ul className="forecast" aria-label="Five day forecast">
      {days.map((d) => {
        const c = describeCode(d.code);
        const label = d.date === today ? 'Today' : new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
        return (
          <li key={d.date}>
            <span className="small muted">{label}</span>
            <span className="fc-emoji" role="img" aria-label={c.label}>{c.emoji}</span>
            <strong>{Math.round(d.highF)}°</strong>
            <span className="small muted">{Math.round(d.lowF)}°</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AlertList({ alerts, compact }: { alerts: WeatherAlert[]; compact?: boolean }) {
  if (!alerts.length) return <p className="small muted">No weather worries for the flock in the next few days.</p>;
  return (
    <ul className="alerts">
      {(compact ? alerts.slice(0, 1) : alerts).map((a) => (
        <li key={a.id} className={'alert ' + a.level}>
          <div className="row gap">
            <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>{a.emoji}</span>
            <span className="grow"><strong>{a.title}</strong><br /><span className="small">{a.when}</span></span>
          </div>
          {!compact && <ul className="steps">{a.steps.map((s) => <li key={s}>{s}</li>)}</ul>}
          {compact && <p className="small" style={{ margin: '6px 0 0' }}>{a.steps[0]}</p>}
        </li>
      ))}
    </ul>
  );
}

export function PlacePicker({ onPick }: { onPick(p: Place): void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setErr('Type a town or 5-digit ZIP.');
    setBusy(true); setErr('');
    try {
      const r = await searchPlaces(q);
      setResults(r);
      if (!r.length) setErr('No places found. Try a nearby town.');
    } catch (x) { setErr(x instanceof Error ? x.message : 'Search failed.'); } finally { setBusy(false); }
  }
  async function locate() {
    setBusy(true); setErr('');
    try { onPick(await currentPosition()); } catch (x) { setErr(x instanceof Error ? x.message : 'Location failed.'); } finally { setBusy(false); }
  }
  return (
    <div className="stack">
      <form className="row gap" onSubmit={search} role="search">
        <label className="sr-only" htmlFor="place-q">Town or ZIP</label>
        <input id="place-q" className="input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Town or ZIP" autoComplete="postal-code" />
        <button className="btn primary" disabled={busy}>Find</button>
      </form>
      <button type="button" className="btn ghost block" onClick={() => void locate()} disabled={busy}>📍 Use my location</button>
      {err && <p className="error-text" role="alert">{err}</p>}
      {results.length > 0 && (
        <ul className="list">
          {results.map((p) => (
            <li key={`${p.lat},${p.lon}`}><button className="item" onClick={() => onPick(p)}><span className="item-main"><span className="item-title">{p.name}</span></span></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function useAlerts(days: DayForecast[]) {
  const { today } = useApp();
  return useMemo(() => weatherAlerts(days, today), [days, today]);
}

export function ProductPicks({ alerts, limit = 3 }: { alerts: WeatherAlert[]; limit?: number }) {
  const { data, today } = useApp();
  const picks = useMemo(() => productPicks(data, today, alerts, limit), [data, today, alerts, limit]);
  return (
    <ul className="picks">
      {picks.map((p) => (
        <li key={p.id} className="pick">
          <span className="pick-emoji" aria-hidden="true">{p.emoji}</span>
          <span className="grow">
            <strong>{p.title}</strong>
            <span className="small muted" style={{ display: 'block' }}>{p.why}</span>
          </span>
          <a className="btn small" href={p.url} target="_blank" rel="noopener noreferrer">{p.cta}<span className="sr-only"> on Fresh Eggs Daily (opens in a new tab)</span></a>
        </li>
      ))}
    </ul>
  );
}

export function WeatherMini({ days, alerts, hasPlace }: { days: DayForecast[]; alerts: WeatherAlert[]; hasPlace: boolean }) {
  const { today } = useApp();
  if (!hasPlace) return (
    <Link to="/weather" className="notice row gap between" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span>🌤️ Add your town for heat and freeze alerts</span><span className="link-btn">Set up</span>
    </Link>
  );
  const t = days.find((d) => d.date === today) ?? days[0];
  if (!t) return <p className="small muted">Loading the forecast…</p>;
  const c = describeCode(t.code);
  return (
    <div className="stack">
      <div className="row gap">
        <span style={{ fontSize: '2rem' }} role="img" aria-label={c.label}>{c.emoji}</span>
        <span className="grow"><strong style={{ fontSize: '1.3rem' }}>{Math.round(t.highF)}° / {Math.round(t.lowF)}°</strong><br /><span className="small muted">{c.label} today</span></span>
      </div>
      <AlertList alerts={alerts} compact />
    </div>
  );
}
