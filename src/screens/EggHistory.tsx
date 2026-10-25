import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { BarChart, Card, Chips, Confirm, Empty, Field, Page, Sheet, Stat, Stepper } from '../components/ui';
import { Link, navigate, useRoute } from '../router';
import { addDays, formatDate, formatMonth, isDateKey, monthKey, relativeDay } from '../logic/dates';
import { dailyTotals, economics, eggsOnHand, layingTrend, money, monthlyTotals, topLayers, weeklyTotals } from '../logic/eggs';
import { parseMoney } from '../components/helpers';
import type { CostCategory, EggDisposition, EggDispositionKind } from '../contracts/domain';

type Tab = 'totals' | 'sales' | 'costs';
type Range = 'daily' | 'weekly' | 'monthly';
type Period = '30' | 'month' | 'year' | 'all';

const COST_CATS: { value: CostCategory; label: string; emoji: string }[] = [
  { value: 'feed', label: 'Feed', emoji: '🌾' }, { value: 'bedding', label: 'Bedding', emoji: '🪵' }, { value: 'vet', label: 'Vet', emoji: '🩺' },
  { value: 'equipment', label: 'Equipment', emoji: '🔧' }, { value: 'other', label: 'Other', emoji: '📦' },
];
const KINDS: { value: EggDispositionKind; label: string; emoji: string }[] = [
  { value: 'sold', label: 'Sold', emoji: '💵' }, { value: 'given', label: 'Given away', emoji: '🎁' }, { value: 'used', label: 'Used at home', emoji: '🍳' },
];

export default function EggHistory() {
  const { data, today } = useApp();
  const route = useRoute();
  const tab = (['totals', 'sales', 'costs'].includes(route.query.get('tab') ?? '') ? route.query.get('tab') : 'totals') as Tab;
  const setTab = (t: Tab) => navigate(t === 'totals' ? '/eggs/history' : `/eggs/history?tab=${t}`, true);
  const [period, setPeriod] = useState<Period>('30');
  const from = period === '30' ? addDays(today, -29) : period === 'month' ? `${monthKey(today)}-01` : period === 'year' ? `${today.slice(0, 4)}-01-01` : undefined;
  const econ = useMemo(() => economics(data.egg_collections, data.egg_inventory, data.flock_costs, from, today), [data, from, today]);

  return (
    <Page title="Egg history" back="/eggs">
      <div className="seg" role="group" aria-label="History section">
        {(['totals', 'sales', 'costs'] as Tab[]).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'totals' ? 'Totals' : t === 'sales' ? 'Sales' : 'Costs'}</button>
        ))}
      </div>
      <Card title="Flock economics">
        <Chips label="Period" hideLabel value={period} onChange={setPeriod} options={[
          { value: '30', label: 'Last 30 days' }, { value: 'month', label: 'This month' }, { value: 'year', label: 'This year' }, { value: 'all', label: 'All time' },
        ]} />
        <div className="grid2" style={{ marginTop: 10 }}>
          <Stat value={econ.perDozen === null ? 'None yet' : money(econ.perDozen)} label="Cost per dozen" />
          <Stat value={money(Math.abs(econ.profit))} label={econ.profit >= 0 ? 'Profit' : 'Net cost (costs above sales)'} tone={econ.profit >= 0 ? 'good' : 'warn'} />
          <Stat value={money(econ.revenue)} label="Egg sales" />
          <Stat value={money(econ.costs)} label="Costs" />
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          {econ.usableEggs} usable eggs{econ.damaged ? ` (${econ.damaged} damaged)` : ''}. Cost per dozen is costs divided by usable dozens collected. Profit is sales minus costs.
        </p>
      </Card>
      {tab === 'totals' && <Totals />}
      {tab === 'sales' && <Sales />}
      {tab === 'costs' && <Costs />}
    </Page>
  );
}

function Totals() {
  const { data, today } = useApp();
  const [range, setRange] = useState<Range>('daily');
  const logs = data.egg_collections;
  const buckets = range === 'daily' ? dailyTotals(logs, today, 14) : range === 'weekly' ? weeklyTotals(logs, today, 8) : monthlyTotals(logs, today, 6);
  const trend = layingTrend(logs, today);
  const leaders = topLayers(logs, data.birds);
  const onHand = eggsOnHand(logs, data.egg_inventory);
  const max = leaders[0]?.count ?? 1;
  const fmt = (k: string) => (range === 'monthly' ? formatMonth(k) : range === 'weekly' ? formatDate(k) : String(Number(k.slice(8, 10))));

  if (!logs.length) return <Card><Empty icon="📊" title="No egg logs yet">Log a few days of eggs and your charts, trends and top layers will appear here.</Empty></Card>;
  return (
    <>
      <Card title="Collected">
        <div className="seg" role="group" aria-label="Chart range">
          {(['daily', 'weekly', 'monthly'] as Range[]).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r[0].toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
        <BarChart data={buckets} label={`${range} egg totals`} formatLabel={fmt} />
        <p className="small muted center" style={{ margin: '6px 0 0' }}>
          {range === 'daily' ? 'Last 14 days' : range === 'weekly' ? 'Last 8 weeks, starting Mondays' : 'Last 6 months'} · {buckets.reduce((a, b) => a + b.count, 0)} eggs
        </p>
      </Card>
      <div className="grid-auto">
        <Card title="Laying trend">
          <div className="grid2">
            <Stat value={trend.recentAvg.toFixed(1)} label="Per day, last 7" />
            <Stat value={trend.priorAvg.toFixed(1)} label="Per day, week before" />
          </div>
          <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
            {trend.direction === 'none' ? 'Not enough recent logs.' : trend.changePct === null ? 'Laying has started up this week.' :
              trend.direction === 'steady' ? 'Laying is holding steady.' : trend.direction === 'up' ? `Up ${Math.round(trend.changePct)}% from the week before.` : `Down ${Math.abs(Math.round(trend.changePct))}% from the week before. Shorter days, molt, heat and stress are common causes.`}
          </p>
        </Card>
        <Card title="Eggs on hand">
          <Stat value={onHand} label="Usable eggs collected minus used, sold and given" />
        </Card>
      </div>
      <Card title="Top layers">
        {leaders.length === 0 ? (
          <Empty icon="🏆" title="No hen-level logs yet">When you log eggs, tap the hen who laid them to build a leaderboard.</Empty>
        ) : (
          <ol className="list" style={{ listStyle: 'none' }}>
            {leaders.map((l, i) => (
              <li key={l.bird.id} className="leader">
                <span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                <span><strong>{l.bird.name}</strong><div className="barline" style={{ width: `${(l.count / max) * 100}%` }} /></span>
                <span className="kbd-num" style={{ fontWeight: 800 }}>{l.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}

function Sales() {
  const { data, today, save, remove, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<EggDisposition | null>(null);
  const rows = [...data.egg_inventory].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  return (
    <Card title="Sales and give-aways" action={<button className="btn primary small" onClick={() => setOpen(true)}>+ Add</button>}>
      {rows.length === 0 ? (
        <Empty icon="💵" title="Nothing logged yet">Record eggs you sell, give to neighbors or use in the kitchen to keep your eggs on hand count right.</Empty>
      ) : (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id} className="item">
              <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>{KINDS.find((k) => k.value === r.kind)?.emoji}</span>
              <span className="item-main">
                <span className="item-title" style={{ display: 'block' }}>{r.count} eggs {r.kind === 'sold' ? 'sold' : r.kind === 'given' ? 'given away' : 'used'}{r.customer ? ` · ${r.customer}` : ''}</span>
                <span className="item-sub">{relativeDay(r.occurredOn, today)}{r.notes ? ` · ${r.notes}` : ''}</span>
              </span>
              {r.kind === 'sold' && <span className="item-end">{money(r.amount ?? 0)}</span>}
              <button className="icon-btn" aria-label="Delete entry" onClick={() => setDel(r)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg></button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={open} title="Eggs out" onClose={() => setOpen(false)}>
        <SaleForm onDone={async (rec) => { if (rec) { await save('egg_inventory', rec); toast('Saved'); } setOpen(false); }} today={today} />
      </Sheet>
      <Confirm open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete" title="Delete this entry?" body="This cannot be undone."
        onConfirm={() => { if (del) void remove('egg_inventory', del.id); }} />
    </Card>
  );
}

type SaleDraft = Omit<EggDisposition, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>;
function SaleForm({ onDone, today }: { onDone(rec?: SaleDraft): void; today: string }) {
  const [kind, setKind] = useState<EggDispositionKind>('sold');
  const [count, setCount] = useState(12);
  const [amount, setAmount] = useState('');
  const [customer, setCustomer] = useState('');
  const [day, setDay] = useState(today);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const amt = parseMoney(amount);
    if (count < 1) return setErr('Enter at least one egg.');
    if (kind === 'sold' && amt === null) return setErr('Enter the sale price.');
    if (!isDateKey(day) || day > today) return setErr('Pick a date that is today or earlier.');
    onDone({ kind, count, amount: kind === 'sold' ? amt ?? 0 : undefined, customer: customer.trim() || undefined, occurredOn: day, notes: notes.trim() || undefined });
  }
  return (
    <form onSubmit={submit} noValidate>
      <Chips label="What happened" value={kind} onChange={setKind} options={KINDS} />
      <div className="field"><span className="label">Eggs</span><Stepper value={count} onChange={setCount} min={1} max={999} label="Eggs" /></div>
      <div className="chips" style={{ marginBottom: 14 }} aria-label="Quick amounts">
        {[6, 12, 18, 30].map((n) => <button type="button" key={n} className="chip" onClick={() => setCount(n)}>{n === 12 ? '1 dozen' : n === 6 ? 'Half dozen' : n === 18 ? '18' : '30 flat'}</button>)}
      </div>
      {kind === 'sold' && (
        <Field label="Total price">{(id) => <input id={id} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$6.00" />}</Field>
      )}
      {kind !== 'used' && (
        <Field label={kind === 'sold' ? 'Customer name' : 'Given to'}>{(id) => <input id={id} className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={60} autoComplete="off" />}</Field>
      )}
      <Field label="Date">{(id) => <input id={id} type="date" className="input" value={day} max={today} onChange={(e) => setDay(e.target.value)} />}</Field>
      <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={() => onDone()}>Cancel</button><button className="btn primary grow" type="submit">Save</button></div>
    </form>
  );
}

function Costs() {
  const { data, today, save, remove, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [category, setCategory] = useState<CostCategory>('feed');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(today);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const rows = [...data.flock_costs].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  const byCat = COST_CATS.map((c) => ({ ...c, total: data.flock_costs.filter((x) => x.category === c.value).reduce((a, b) => a + b.amount, 0) })).filter((c) => c.total > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amt = parseMoney(amount);
    if (amt === null || amt <= 0) return setErr('Enter an amount above zero.');
    if (!isDateKey(day) || day > today) return setErr('Pick a date that is today or earlier.');
    await save('flock_costs', { category, amount: amt, occurredOn: day, notes: notes.trim() || undefined });
    toast('Cost saved');
    setOpen(false); setAmount(''); setNotes(''); setErr(''); setDay(today);
  }
  return (
    <>
      <Link to="/spending" className="card cta-card">
        <span className="cta-emoji" aria-hidden="true">💰</span>
        <span className="item-main"><strong style={{ display: 'block' }}>See monthly spending</strong><span className="small muted">Totals by category, 6 month trend and cost per hen</span></span>
      </Link>
      {byCat.length > 0 && (
        <Card title="All-time by category">
          <div className="grid3">{byCat.map((c) => <Stat key={c.value} value={money(c.total)} label={`${c.emoji} ${c.label}`} />)}</div>
        </Card>
      )}
      <Card title="Costs" action={<button className="btn primary small" onClick={() => setOpen(true)}>+ Add</button>}>
        {rows.length === 0 ? (
          <Empty icon="🧾" title="No costs yet">Track feed, bedding, vet bills and equipment to see your real cost per dozen.</Empty>
        ) : (
          <ul className="list">
            {rows.map((r) => (
              <li key={r.id} className="item">
                <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>{COST_CATS.find((c) => c.value === r.category)?.emoji}</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{COST_CATS.find((c) => c.value === r.category)?.label}{r.notes ? ` · ${r.notes}` : ''}</span>
                  <span className="item-sub">{relativeDay(r.occurredOn, today)}</span>
                </span>
                <span className="item-end">{money(r.amount)}</span>
                <button className="icon-btn" aria-label="Delete cost" onClick={() => setDel(r.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={open} title="Add a cost" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <Chips label="Category" value={category} onChange={setCategory} options={COST_CATS} />
          <Field label="Amount">{(id) => <input id={id} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$24.99" />}</Field>
          <Field label="Date">{(id) => <input id={id} type="date" className="input" value={day} max={today} onChange={(e) => setDay(e.target.value)} />}</Field>
          <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="50 lb layer feed" />}</Field>
          {err && <p className="error-text" role="alert">{err}</p>}
          <div className="row gap"><button type="button" className="btn ghost grow" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary grow" type="submit">Save cost</button></div>
        </form>
      </Sheet>
      <Confirm open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete" title="Delete this cost?" body="This cannot be undone." onConfirm={() => { if (del) void remove('flock_costs', del); }} />
    </>
  );
}
