import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Confirm, Empty, Field, Page, Stat, Stepper } from '../components/ui';
import FlockPicker from '../components/FlockPicker';
import { Link } from '../router';
import { addDays, formatDate, isDateKey, relativeDay } from '../logic/dates';
import { collectedOn, eggsOnHand } from '../logic/eggs';
import type { EggLog } from '../contracts/domain';

export default function Eggs() {
  const { data, today, activeFlockId, save, remove, toast } = useApp();
  const [count, setCount] = useState(1);
  const [day, setDay] = useState(today);
  const [birdId, setBirdId] = useState<string>('');
  const [damaged, setDamaged] = useState(0);
  const [notes, setNotes] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<EggLog | null>(null);
  const hens = data.birds.filter((b) => b.flockId === activeFlockId && b.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const todayCount = collectedOn(data.egg_collections, today);
  const recent = [...data.egg_collections].sort((a, b) => b.collectedOn.localeCompare(a.collectedOn) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const birdName = new Map(data.birds.map((b) => [b.id, b.name]));
  const dayOptions = [0, -1, -2].map((n) => addDays(today, n));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!activeFlockId) return setError('Create a flock first on the Account page.');
    if (count < 1) return setError('Log at least one egg.');
    if (!isDateKey(day) || day > today) return setError('Pick a date that is today or earlier.');
    if (damaged > count) return setError('Damaged eggs cannot be more than eggs collected.');
    setError('');
    setBusy(true);
    try {
      await save('egg_collections', { flockId: activeFlockId, collectedOn: day, count, damaged: damaged || undefined, birdId: birdId || undefined, notes: notes.trim() || undefined });
      toast(`Logged ${count} egg${count === 1 ? '' : 's'}${birdId ? ` from ${birdName.get(birdId)}` : ''}`);
      setCount(1); setDamaged(0); setNotes(''); setBirdId('');
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Log eggs" subtitle={`${todayCount} collected today · ${eggsOnHand(data.egg_collections, data.egg_inventory)} on hand`}
      action={<Link to="/eggs/history" className="btn small">History</Link>}>
      <FlockPicker />
      <form className="card" onSubmit={submit} noValidate aria-label="Log an egg collection">
        <Stepper big value={count} onChange={setCount} min={0} max={500} label="Eggs collected" />
        <p className="center muted small" style={{ margin: '6px 0 16px' }}>eggs collected</p>
        <div className="field">
          <span className="label" id="day-l">Day</span>
          <div className="chips" role="radiogroup" aria-labelledby="day-l">
            {dayOptions.map((d) => (
              <button type="button" key={d} role="radio" aria-checked={day === d} className={'chip' + (day === d ? ' on' : '')} onClick={() => setDay(d)}>{relativeDay(d, today)}</button>
            ))}
            <label className={'chip' + (!dayOptions.includes(day) ? ' on' : '')} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
              {!dayOptions.includes(day) ? formatDate(day) : 'Other date'}
              <input type="date" aria-label="Pick another date" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }} />
            </label>
          </div>
        </div>
        {hens.length > 0 && (
          <Chips label="Who laid them? (optional)" value={birdId} onChange={setBirdId}
            options={[{ value: '', label: 'Whole flock' }, ...hens.map((h) => ({ value: h.id, label: h.name }))]} />
        )}
        {!showMore ? (
          <button type="button" className="link-btn" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={() => setShowMore(true)}>+ Damaged eggs or notes</button>
        ) : (
          <>
            <div className="field">
              <span className="label">Damaged or unusable</span>
              <Stepper value={damaged} onChange={setDamaged} max={count} label="Damaged eggs" />
            </div>
            <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Double yolker, soft shell…" />}</Field>
          </>
        )}
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn primary block" type="submit" disabled={busy || count < 1}>{busy ? 'Saving…' : `Save ${count} egg${count === 1 ? '' : 's'}`}</button>
      </form>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <Link to="/eggs/history?tab=sales" className="card" style={{ margin: 0, textDecoration: 'none', color: 'inherit' }}>
          <strong>💵 Sales and give-aways</strong><p className="small muted" style={{ margin: 0 }}>Log eggs that leave the coop</p>
        </Link>
        <Link to="/eggs/history?tab=costs" className="card" style={{ margin: 0, textDecoration: 'none', color: 'inherit' }}>
          <strong>🧾 Costs</strong><p className="small muted" style={{ margin: 0 }}>Feed, bedding, vet and more</p>
        </Link>
      </div>

      <Card title="Recent logs">
        {recent.length === 0 ? (
          <Empty icon="🥚" title="No eggs logged yet">Your first collection will show up here.</Empty>
        ) : (
          <ul className="list">
            {recent.map((l) => (
              <li key={l.id} className="item">
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{l.count} egg{l.count === 1 ? '' : 's'}{l.birdId && birdName.get(l.birdId) ? ` · ${birdName.get(l.birdId)}` : ''}</span>
                  <span className="item-sub">{relativeDay(l.collectedOn, today)}{l.damaged ? ` · ${l.damaged} damaged` : ''}{l.notes ? ` · ${l.notes}` : ''}</span>
                </span>
                <button className="icon-btn" aria-label={`Delete log of ${l.count} eggs on ${l.collectedOn}`} onClick={() => setDeleting(l)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid2"><Stat value={todayCount} label="Today" /><Stat value={collectedOn(data.egg_collections, addDays(today, -1))} label="Yesterday" /></div>
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} danger confirmLabel="Delete" title="Delete this log?"
        body={deleting ? `${deleting.count} eggs on ${formatDate(deleting.collectedOn)}.` : ''}
        onConfirm={() => { if (deleting) void remove('egg_collections', deleting.id).then(() => toast('Log deleted')); }} />
    </Page>
  );
}
