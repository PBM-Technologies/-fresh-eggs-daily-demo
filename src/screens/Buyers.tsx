import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Confirm, Empty, Field, Page, Sheet, Stat } from '../components/ui';
import { parseMoney, parseNum } from '../components/helpers';
import { buyerSummaries, standingEggsPerWeek, totalOwed, type BuyerSummary } from '../logic/buyers';
import { money } from '../logic/eggs';
import { relativeDay } from '../logic/dates';
import { SaleForm } from './EggHistory';
import type { EggCustomer } from '../contracts/domain';

type Draft = Omit<EggCustomer, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>;

export default function Buyers() {
  const { data, today, save, remove, toast } = useApp();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => buyerSummaries(data.egg_customers, data.egg_inventory, today), [data, today]);
  const owed = totalOwed(data.egg_inventory);
  const standing = standingEggsPerWeek(data.egg_customers);
  const open = rows.find((r) => r.customer.id === openId) ?? null;

  return (
    <Page title="Egg buyers" subtitle="Regulars, standing orders and who owes you" back="/eggs/history?tab=sales">
      <Card className="hero">
        <div className="grid3">
          <Stat value={money(owed)} label="Owed to you" />
          <Stat value={rows.length} label={rows.length === 1 ? 'Buyer' : 'Buyers'} />
          <Stat value={standing ? `${standing / 12} doz` : '0'} label="Standing / week" />
        </div>
      </Card>

      <Card title="Your buyers" action={<button className="btn primary small" onClick={() => setAdding(true)}>+ Buyer</button>}>
        {rows.length === 0 ? (
          <Empty icon="🧺" title="No buyers yet">Add the neighbors, coworkers and farm stand regulars who buy your eggs. Track standing orders and who still owes you.</Empty>
        ) : (
          <ul className="list">
            {rows.map((r) => (
              <li key={r.customer.id}>
                <button className="item item-btn" onClick={() => setOpenId(r.customer.id)}>
                  <span className="avatar" aria-hidden="true">{r.customer.name.slice(0, 1).toUpperCase()}</span>
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{r.customer.name}</span>
                    <span className="item-sub">
                      {r.lastBought ? `Last bought ${relativeDay(r.lastBought, today).toLowerCase()}` : 'No sales yet'}
                      {r.customer.standingDozens ? ` · ${r.customer.standingDozens} doz/week` : ''}
                    </span>
                  </span>
                  {r.owed > 0 ? <span className="pill warn">Owes {money(r.owed)}</span> : <span className="pill good">Paid up</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={adding} title="New buyer" onClose={() => setAdding(false)}>
        <BuyerForm onDone={async (d) => { if (d) { await save('egg_customers', d); toast('Buyer added'); } setAdding(false); }} />
      </Sheet>
      <Sheet open={!!open} title={open?.customer.name ?? ''} onClose={() => setOpenId(null)}>
        {open && <BuyerDetail row={open} onClose={() => setOpenId(null)} save={save} remove={remove} toast={toast} today={today} />}
      </Sheet>
    </Page>
  );
}

function BuyerDetail({ row, onClose, save, remove, toast, today }: {
  row: BuyerSummary; onClose(): void; today: string; toast(m: string): void;
  save: ReturnType<typeof useApp>['save']; remove: ReturnType<typeof useApp>['remove'];
}) {
  const [mode, setMode] = useState<'view' | 'sale' | 'edit'>('view');
  const [del, setDel] = useState(false);
  const c = row.customer;

  async function markPaid(ids: string[]) {
    for (const s of row.unpaid.filter((u) => ids.includes(u.id))) await save('egg_inventory', { ...s, paid: true });
    toast(ids.length > 1 ? 'All marked paid' : 'Marked paid');
  }

  if (mode === 'sale')
    return <SaleForm today={today} customerId={c.id} onDone={async (rec) => { if (rec) { await save('egg_inventory', rec); toast('Sale saved'); } setMode('view'); }} />;
  if (mode === 'edit')
    return <BuyerForm initial={c} onDone={async (d) => { if (d) { await save('egg_customers', { ...c, ...d }); toast('Saved'); } setMode('view'); }} />;

  return (
    <div className="stack">
      <div className="grid3">
        <Stat value={row.eggs30} label="Eggs, 30 days" />
        <Stat value={money(row.spent)} label="All time" />
        <Stat value={money(row.owed)} label="Owes" tone={row.owed > 0 ? 'warn' : 'good'} />
      </div>
      {(c.contact || c.pricePerDozen || c.standingDozens || c.notes) && (
        <p className="small muted">
          {[c.contact, c.pricePerDozen ? `${money(c.pricePerDozen)} a dozen` : '', c.standingDozens ? `Standing order: ${c.standingDozens} doz/week` : '', c.notes].filter(Boolean).join(' · ')}
        </p>
      )}
      <button className="btn primary block" onClick={() => setMode('sale')}>💵 Record a sale</button>
      {row.unpaid.length > 0 && (
        <div>
          <div className="row between" style={{ marginBottom: 6 }}>
            <h3>Not paid yet</h3>
            {row.unpaid.length > 1 && <button className="link-btn" onClick={() => void markPaid(row.unpaid.map((u) => u.id))}>Mark all paid</button>}
          </div>
          <ul className="list">
            {row.unpaid.map((s) => (
              <li key={s.id} className="item">
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{s.count} eggs · {money(s.amount ?? 0)}</span>
                  <span className="item-sub">{relativeDay(s.occurredOn, today)}</span>
                </span>
                <button className="btn small" onClick={() => void markPaid([s.id])}>Paid</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="row gap">
        <button className="btn ghost grow" onClick={() => setMode('edit')}>Edit</button>
        <button className="btn ghost grow" onClick={() => setDel(true)}>Remove</button>
      </div>
      <Confirm open={del} onClose={() => setDel(false)} danger confirmLabel="Remove" title={`Remove ${c.name}?`}
        body="Their past sales stay in your history." onConfirm={() => { void remove('egg_customers', c.id); onClose(); }} />
    </div>
  );
}

function BuyerForm({ initial, onDone }: { initial?: EggCustomer; onDone(d?: Draft): void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [price, setPrice] = useState(initial?.pricePerDozen ? initial.pricePerDozen.toFixed(2) : '');
  const [standing, setStanding] = useState(initial?.standingDozens ? String(initial.standingDozens) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [err, setErr] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr('Enter a name.');
    const p = price.trim() ? parseMoney(price) : null;
    if (price.trim() && p === null) return setErr('Enter the price per dozen, like 6.00.');
    const s = standing.trim() ? parseNum(standing) : null;
    if (standing.trim() && (s === null || s < 0)) return setErr('Enter dozens per week, like 1 or 2.');
    onDone({ name: name.trim(), contact: contact.trim() || undefined, pricePerDozen: p ?? undefined, standingDozens: s || undefined, notes: notes.trim() || undefined });
  }
  return (
    <form onSubmit={submit} noValidate>
      <Field label="Name">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />}</Field>
      <Field label="Phone or where they live" hint="Optional">{(id, d) => <input id={id} aria-describedby={d} className="input" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={80} />}</Field>
      <div className="grid2">
        <Field label="Price per dozen">{(id) => <input id={id} className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$6.00" />}</Field>
        <Field label="Standing order">{(id) => <input id={id} className="input" inputMode="decimal" value={standing} onChange={(e) => setStanding(e.target.value)} placeholder="Dozens/week" />}</Field>
      </div>
      <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Returns cartons, likes blue eggs" />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={() => onDone()}>Cancel</button><button className="btn primary grow" type="submit">Save</button></div>
    </form>
  );
}
