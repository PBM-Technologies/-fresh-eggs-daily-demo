import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Confirm, Empty, Field, Page, Pill, Sheet } from '../components/ui';
import { daysRemaining, estimatedQuantity, round, runOutDate, stockLevel } from '../logic/feed';
import { formatDate, relativeDay } from '../logic/dates';
import { parseMoney, parseNum } from '../components/helpers';
import { Link } from '../router';
import { reorderUrl } from '../content/shop';
import { costCategoryForFeed } from '../logic/spending';
import { money } from '../logic/eggs';
import { maxKey } from '../logic/dates';
import type { FeedCategory, FeedItem } from '../contracts/domain';

const CATS: { value: FeedCategory; label: string; emoji: string }[] = [
  { value: 'feed', label: 'Feed', emoji: '🌾' }, { value: 'treats', label: 'Treats', emoji: '🍓' }, { value: 'scratch', label: 'Scratch', emoji: '🌽' },
  { value: 'supplement', label: 'Supplement', emoji: '💊' }, { value: 'grit', label: 'Grit and oyster shell', emoji: '🪨' }, { value: 'bedding', label: 'Bedding', emoji: '🪵' },
  { value: 'coop_care', label: 'Coop care', emoji: '🧺' }, { value: 'other', label: 'Other', emoji: '📦' },
];
const UNITS = ['lb', 'kg', 'bags', 'scoops', 'oz', 'bales'];

export default function Feed() {
  const { data, today } = useApp();
  const [editing, setEditing] = useState<FeedItem | 'new' | null>(null);
  const [restocking, setRestocking] = useState<FeedItem | null>(null);
  const items = [...data.feed_inventory].sort((a, b) => (daysRemaining(a, today) ?? 9999) - (daysRemaining(b, today) ?? 9999));
  const logs = [...data.feed_logs].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const itemName = new Map(data.feed_inventory.map((i) => [i.id, i]));
  const low = items.filter((i) => ['low', 'out'].includes(stockLevel(i, today)));

  return (
    <Page title="Feed and supplies" subtitle={items.length ? `${items.length} items tracked` : undefined} action={<button className="btn primary small" onClick={() => setEditing('new')}>+ Item</button>}>
      {low.length > 0 && <div className="notice" role="status">⚠️ {low.map((i) => i.name).join(', ')} {low.length === 1 ? 'is' : 'are'} running low.</div>}
      <Link to="/treats" className="card cta-card">
        <span className="cta-emoji" aria-hidden="true">🌽</span>
        <span className="item-main"><strong style={{ display: 'block' }}>Treat tracker</strong><span className="small muted">Log treats and scratch against a healthy daily limit</span></span>
      </Link>
      <Card title="Inventory">
        {items.length === 0 ? (
          <Empty icon="🌾" title="No supplies tracked" action={<button className="btn primary" onClick={() => setEditing('new')}>Add feed or supplies</button>}>
            Add what you have on hand and how much the flock uses per day. We will estimate how many days are left and warn you before you run out.
          </Empty>
        ) : (
          <ul className="list">
            {items.map((i) => {
              const lvl = stockLevel(i, today);
              const d = daysRemaining(i, today);
              const out = runOutDate(i, today);
              return (
                <li key={i.id} className="item" style={{ flexWrap: 'wrap' }}>
                  <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>{CATS.find((c) => c.value === i.category)?.emoji}</span>
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{i.name}</span>
                    <span className="item-sub">About {round(estimatedQuantity(i, today))} {i.unit} left · uses {i.dailyUsage} {i.unit}/day</span>
                  </span>
                  <span className="item-end">
                    {d === null ? <Pill>No usage set</Pill> : <><div>{d} day{d === 1 ? '' : 's'}</div>{out && <div className="small muted" style={{ fontWeight: 600 }}>until {formatDate(out)}</div>}</>}
                  </span>
                  <span className="row gap wrap" style={{ width: '100%', paddingLeft: 36, rowGap: 6 }}>
                    {lvl === 'out' && <Pill tone="bad">Out</Pill>}
                    {lvl === 'low' && <Pill tone="warn">Low stock</Pill>}
                    <span className="grow" />
                    {(lvl === 'low' || lvl === 'out') && reorderUrl(i.category) && (
                      <a className="btn small" href={reorderUrl(i.category) ?? undefined} target="_blank" rel="noopener noreferrer">Reorder<span className="sr-only"> {i.name} on Fresh Eggs Daily (opens in a new tab)</span></a>
                    )}
                    <button className="btn small" onClick={() => setRestocking(i)}>Restock</button>
                    <button className="btn small ghost" onClick={() => setEditing(i)}>Edit</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Feed log">
        {logs.length === 0 ? <Empty icon="📝" title="No entries yet">Restocks, recounts and logged feedings show up here.</Empty> : (
          <ul className="list">
            {logs.map((l) => {
              const it = itemName.get(l.itemId);
              return (
                <li key={l.id} className="item">
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{l.kind === 'restock' ? 'Restocked' : l.kind === 'recount' ? 'Recounted' : 'Used'} {it?.name ?? 'deleted item'}</span>
                    <span className="item-sub">{relativeDay(l.occurredOn, today)}{l.notes ? ` · ${l.notes}` : ''}</span>
                  </span>
                  <span className="item-end">{l.kind === 'restock' ? '+' : l.kind === 'use' ? '-' : ''}{round(l.amount, 2)} {it?.unit ?? ''}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="small muted">Days remaining is an estimate based on your daily usage since the last count. Recount now and then to stay accurate.</p>
      <Sheet open={!!editing} title={editing === 'new' ? 'Add an item' : 'Edit item'} onClose={() => setEditing(null)}>
        {editing && <ItemForm key={editing === 'new' ? 'n' : editing.id} item={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
      <Sheet open={!!restocking} title={restocking ? `Restock ${restocking.name}` : 'Restock'} onClose={() => setRestocking(null)}>
        {restocking && <RestockForm item={restocking} onDone={() => setRestocking(null)} />}
      </Sheet>
    </Page>
  );
}

function ItemForm({ item, onDone }: { item?: FeedItem; onDone(): void }) {
  const { today, save, remove, toast } = useApp();
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<FeedCategory>(item?.category ?? 'feed');
  const [unit, setUnit] = useState(item?.unit ?? 'lb');
  const [qty, setQty] = useState(item ? String(round(estimatedQuantity(item, today), 2)) : '');
  const [usage, setUsage] = useState(item ? String(item.dailyUsage) : '');
  const [lowDays, setLowDays] = useState(item ? String(item.lowStockDays) : '7');
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const q = parseNum(qty);
    const u = parseNum(usage) ?? 0;
    const ld = parseNum(lowDays) ?? 7;
    if (!name.trim()) return setErr('Name the item.');
    if (q === null) return setErr('Enter how much you have on hand.');
    const recounted = !item || Math.abs(q - round(estimatedQuantity(item, today), 2)) > 0.001;
    // Keep the existing count when only other details changed, so logged feedings are not counted twice.
    const count = recounted ? { quantity: q, countedOn: today } : { quantity: item.quantity, countedOn: item.countedOn };
    await save('feed_inventory', { ...(item ?? {}), name: name.trim(), category, unit, ...count, dailyUsage: u, lowStockDays: Math.round(ld) } as FeedItem);
    if (item && recounted) await save('feed_logs', { itemId: item.id, occurredOn: today, kind: 'recount', amount: q });
    toast(item ? 'Item updated' : 'Item added');
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Field label="Name">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Layer feed" maxLength={60} />}</Field>
      <Chips label="Category" value={category} onChange={setCategory} options={CATS} />
      <Chips label="Unit" value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
      <div className="grid2">
        <Field label={`On hand (${unit})`}>{(id) => <input id={id} className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50" />}</Field>
        <Field label={`Used per day (${unit})`}>{(id) => <input id={id} className="input" inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="0.75" />}</Field>
      </div>
      <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>Rule of thumb: a laying hen eats about a quarter pound of feed a day.</p>
      <Field label="Warn me when this many days are left">{(id) => <input id={id} className="input" inputMode="numeric" value={lowDays} onChange={(e) => setLowDays(e.target.value)} />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
      {item && <button type="button" className="btn danger block" style={{ marginTop: 12 }} onClick={() => setConfirm(true)}>Delete item</button>}
      <Confirm open={confirm} onClose={() => setConfirm(false)} danger confirmLabel="Delete" title={`Delete ${item?.name}?`} body="This removes the item from your inventory." onConfirm={() => { if (item) void remove('feed_inventory', item.id).then(onDone); }} />
    </form>
  );
}

function RestockForm({ item, onDone }: { item: FeedItem; onDone(): void }) {
  const { today, save, toast } = useApp();
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const current = estimatedQuantity(item, today);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const a = parseNum(amount);
    const p = price.trim() ? parseMoney(price) : null;
    if (a === null || a <= 0) return setErr(mode === 'add' ? 'Enter how much you added.' : 'Enter how much you have now.');
    if (price.trim() && (p === null || p <= 0)) return setErr('Enter the price, or leave it blank.');
    const quantity = round(mode === 'add' ? current + a : a, 3);
    // A logged feeding may already have moved the count to tomorrow; keep that so today is not deducted twice.
    await save('feed_inventory', { ...item, quantity, countedOn: maxKey(today, item.countedOn) });
    await save('feed_logs', { itemId: item.id, occurredOn: today, kind: mode === 'add' ? 'restock' : 'recount', amount: mode === 'add' ? a : quantity, notes: notes.trim() || undefined });
    if (p !== null) await save('flock_costs', { category: costCategoryForFeed(item.category), amount: p, occurredOn: today, notes: notes.trim() || `Restock: ${item.name}` });
    toast(`${mode === 'add' ? `Added ${a} ${item.unit}` : `Set to ${quantity} ${item.unit}`}${p !== null ? `, ${money(p)} logged` : ''}`);
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="muted">Currently about {round(current)} {item.unit} on hand.</p>
      <Chips label="How to count it" value={mode} onChange={(m) => { setMode(m); setAmount(''); }} options={[{ value: 'add', label: 'Add to what is left' }, { value: 'set', label: 'Set new total' }]} />
      <Field label={mode === 'add' ? `Amount added (${item.unit})` : `On hand now (${item.unit})`}>{(id) => <input id={id} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />}</Field>
      <Field label="Price paid (optional)" hint="Logged as a cost so it shows on Spending and in cost per dozen.">{(id, d) => <input id={id} aria-describedby={d} className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$24.99" />}</Field>
      <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Store or brand" maxLength={200} />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">{mode === 'add' ? 'Add stock' : 'Save count'}</button></div>
    </form>
  );
}
