import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Empty, Field, Page, Sheet } from '../components/ui';
import FlockPicker from '../components/FlockPicker';
import { Link } from '../router';
import { parseNum } from '../components/helpers';
import { round } from '../logic/feed';
import { CUPS_PER_HANDFUL, isTreatItem, LB_PER_CUP, OVER_TREAT_NOTE, toGrams, treatPounds, treatStatus, type TreatStatus } from '../logic/treats';
import type { TreatUnit } from '../contracts/domain';

const UNITS: { value: TreatUnit; label: string }[] = [{ value: 'cups', label: 'Cups' }, { value: 'grams', label: 'Grams' }, { value: 'handfuls', label: 'Handfuls' }];
const QUICK: Record<TreatUnit, { v: string; label: string }[]> = {
  cups: [{ v: '0.25', label: '1/4 cup' }, { v: '0.5', label: '1/2 cup' }, { v: '1', label: '1 cup' }],
  grams: [{ v: '5', label: '5 g' }, { v: '10', label: '10 g' }, { v: '25', label: '25 g' }],
  handfuls: [{ v: '1', label: '1' }, { v: '2', label: '2' }, { v: '3', label: '3' }],
};
const unitLabel = (amount: number, unit: TreatUnit) => unit === 'grams' ? `${amount} g` : unit === 'cups' ? `${amount} cup${amount === 1 ? '' : 's'}` : `${amount} handful${amount === 1 ? '' : 's'}`;

/** Hens counted for the limit: active birds in the flock. */
export function useTreatStatus(flockId: string | null): TreatStatus & { hens: number } {
  const { data, today } = useApp();
  const hens = data.birds.filter((b) => b.flockId === flockId && b.status === 'active').length;
  return { ...treatStatus(data.treat_logs, flockId ?? '', today, hens), hens };
}

/** Meter of today's treats against the suggested limit, with the gentle note when over. */
export function TreatMeter({ status, compact }: { status: TreatStatus & { hens: number }; compact?: boolean }) {
  if (status.level === 'no_hens') return <p className="small muted">Add active hens to this flock to see a suggested treat limit.</p>;
  const given = Math.round(toGrams(status.givenLb));
  const limit = Math.round(toGrams(status.limitLb));
  const pct = Math.min(100, status.pct);
  return (
    <div className={'treat-meter ' + status.level}>
      <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
        <span><strong className="treat-num">{given} g</strong> <span className="muted small">of about {limit} g suggested</span></span>
        <span className="small muted">{Math.round(status.pct)}%</span>
      </div>
      <div className="progress" role="meter" aria-label="Treats today compared with the suggested limit" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={given} aria-valuetext={`${given} grams of about ${limit} grams`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {!compact && <p className="small muted" style={{ margin: '6px 0 0' }}>For {status.hens} hen{status.hens === 1 ? '' : 's'}: about 10 percent of a quarter pound of feed each per day.</p>}
      {status.level === 'over' && <div className="notice treat-note" role="status">{OVER_TREAT_NOTE}</div>}
    </div>
  );
}

export default function Treats() {
  const { data, today, activeFlockId, remove } = useApp();
  const [open, setOpen] = useState(false);
  const status = useTreatStatus(activeFlockId);
  const items = data.feed_inventory.filter(isTreatItem);
  const name = new Map(data.feed_inventory.map((i) => [i.id, i.name]));
  const logs = data.treat_logs.filter((l) => l.flockId === activeFlockId && l.day === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const flock = data.flocks.find((f) => f.id === activeFlockId);

  return (
    <Page title="Treat tracker" subtitle={flock ? `${flock.name} · today` : 'Today'} back="/feed" action={items.length > 0 ? <button className="btn primary small" onClick={() => setOpen(true)}>+ Treat</button> : undefined}>
      <FlockPicker />
      <Card title="Treats today">
        <TreatMeter status={status} />
      </Card>
      <Card title="Given today">
        {items.length === 0 ? (
          <Empty icon="🌽" title="No treats in your supplies" action={<Link to="/feed" className="btn primary">Add a treat or scratch item</Link>}>
            Add scratch grains, mealworms or other treats on the Feed screen with the Treats or Scratch category, then log what you give here.
          </Empty>
        ) : logs.length === 0 ? (
          <Empty icon="🍓" title="No treats logged today" action={<button className="btn primary" onClick={() => setOpen(true)}>Log a treat</button>}>Log scratch and snacks as you hand them out to stay near the suggested limit.</Empty>
        ) : (
          <ul className="list">
            {logs.map((l) => (
              <li key={l.id} className="item">
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{name.get(l.itemId) ?? 'Deleted item'}</span>
                  <span className="item-sub">{unitLabel(l.amount, l.unit)} · about {Math.round(toGrams(treatPounds(l.amount, l.unit)))} g</span>
                </span>
                <button className="icon-btn" aria-label={`Delete ${name.get(l.itemId) ?? 'treat'}`} onClick={() => void remove('treat_logs', l.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="soft" title="How the limit works">
        <p className="small muted">A laying hen eats about a quarter pound (about 110 g) of feed a day as a general guideline. Treats and scratch should stay around 10 percent of that, so about 11 g per hen per day.</p>
        <p className="small muted" style={{ marginBottom: 0 }}>Amounts are approximate. We count a cup of scratch grains as about {LB_PER_CUP} lb ({Math.round(toGrams(LB_PER_CUP))} g) and a handful as about {CUPS_PER_HANDFUL === 0.125 ? '1/8' : CUPS_PER_HANDFUL} cup. Light treats like dried mealworms weigh less per cup, so grams are the most accurate.</p>
      </Card>
      <Sheet open={open} title="Log a treat" onClose={() => setOpen(false)}>
        {open && <TreatForm onDone={() => setOpen(false)} />}
      </Sheet>
    </Page>
  );
}

function TreatForm({ onDone }: { onDone(): void }) {
  const { data, today, activeFlockId, save, toast } = useApp();
  const items = data.feed_inventory.filter(isTreatItem);
  const [itemId, setItemId] = useState(items[0]?.id ?? '');
  const [unit, setUnit] = useState<TreatUnit>('cups');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const a = parseNum(amount);
    if (!itemId) return setErr('Pick a treat.');
    if (a === null || a <= 0) return setErr('Enter how much you gave.');
    if (!activeFlockId) return setErr('Add a flock first.');
    await save('treat_logs', { flockId: activeFlockId, day: today, itemId, amount: round(a, 2), unit });
    toast(`Logged ${unitLabel(round(a, 2), unit)}`);
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Chips label="Treat" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name, emoji: i.category === 'scratch' ? '🌽' : '🍓' }))} />
      <Chips label="Measured in" value={unit} onChange={(u) => { setUnit(u); setAmount(''); }} options={UNITS} />
      <Field label={`Amount (${unit})`}>{(id) => <input id={id} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={QUICK[unit][1].v} />}</Field>
      <div className="chips" style={{ marginTop: -6, marginBottom: 14 }} aria-label="Quick amounts">
        {QUICK[unit].map((q) => <button type="button" key={q.v} className={'chip' + (amount === q.v ? ' on' : '')} onClick={() => setAmount(q.v)}>{q.label}</button>)}
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save treat</button></div>
    </form>
  );
}
