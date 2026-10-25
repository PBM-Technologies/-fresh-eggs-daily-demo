import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Chips, Field, Sheet } from './ui';
import { Check } from './Icons';
import { parseNum } from './helpers';
import { nowIso } from '../data/ids';
import {
  applyFeedingUse, defaultFeedingAmount, DEFAULT_FEED_TIMES, feedingDoneText, feedingItemFor, feedTimesFor, MAX_FEED_TIMES,
  otherFeedingUsesToday, todaysFeedings, undoFeedingUse, type FeedingSlot,
} from '../logic/feeding';
import { round } from '../logic/feed';
import type { FeedItem, FeedingLog, Flock } from '../contracts/domain';

const FEEDER_KEY = 'fed:ui:feeder';
function readFeeder(): string | null {
  try { return window.localStorage.getItem(FEEDER_KEY); } catch { return null; }
}
function writeFeeder(v: string | null) {
  try { if (v) window.localStorage.setItem(FEEDER_KEY, v); else window.localStorage.removeItem(FEEDER_KEY); } catch { /* convenience only */ }
}

/** Save, undo and edit feedings, keeping feed inventory and the feed log in step. */
function useFeedingActions() {
  const { data, today, save, remove, toast } = useApp();

  async function setFeedLog(log: FeedingLog, item: FeedItem | undefined, amount: number): Promise<string | undefined> {
    if (!item || amount <= 0) {
      if (log.feedLogId) await remove('feed_logs', log.feedLogId);
      return undefined;
    }
    const saved = await save('feed_logs', { ...(log.feedLogId ? { id: log.feedLogId } : {}), itemId: item.id, occurredOn: log.day, kind: 'use', amount, notes: log.label });
    return saved.id;
  }

  async function complete(flock: Flock, s: FeedingSlot) {
    const item = feedingItemFor(flock, data.feed_inventory);
    const amount = defaultFeedingAmount(item, feedTimesFor(flock).length);
    const members = data.household_people.map((m) => m.name);
    const remembered = readFeeder();
    const doneBy = remembered && members.includes(remembered) ? remembered : undefined;
    let feedLogId: string | undefined;
    if (item && amount > 0) {
      await save('feed_inventory', { ...item, ...applyFeedingUse(item, amount, today) });
      feedLogId = (await save('feed_logs', { itemId: item.id, occurredOn: today, kind: 'use', amount, notes: s.label })).id;
    }
    await save('feeding_logs', { flockId: flock.id, day: today, slot: s.slot, label: s.label, doneAt: nowIso(), doneBy, itemId: item && amount > 0 ? item.id : undefined, amount: item && amount > 0 ? amount : undefined, feedLogId });
    toast(item && amount > 0 ? `${s.label} done. ${round(amount, 2)} ${item.unit} of ${item.name} used.` : `${s.label} done`);
  }

  async function undo(log: FeedingLog) {
    const item = log.itemId ? data.feed_inventory.find((i) => i.id === log.itemId) : undefined;
    if (item && (log.amount ?? 0) > 0) {
      const other = otherFeedingUsesToday(data.feeding_logs, item.id, today, log.id);
      await save('feed_inventory', { ...item, ...undoFeedingUse(item, log.amount ?? 0, today, other) });
    }
    if (log.feedLogId) await remove('feed_logs', log.feedLogId);
    await remove('feeding_logs', log.id);
    toast(`${log.label} undone`);
  }

  async function edit(log: FeedingLog, doneBy: string | undefined, amount: number, item: FeedItem | undefined) {
    const old = log.amount ?? 0;
    const oldItem = log.itemId ? data.feed_inventory.find((i) => i.id === log.itemId) : undefined;
    const others = (id: string) => otherFeedingUsesToday(data.feeding_logs, id, today, log.id);
    if (oldItem && item && oldItem.id === item.id) {
      // Same item: put the old amount back, then take the new one.
      let next: FeedItem = { ...item, ...undoFeedingUse(item, old, today, true) };
      next = amount > 0 ? { ...next, ...applyFeedingUse(next, amount, today) } : { ...next, ...undoFeedingUse(next, 0, today, others(item.id)) };
      await save('feed_inventory', next);
    } else {
      if (oldItem && old > 0) await save('feed_inventory', { ...oldItem, ...undoFeedingUse(oldItem, old, today, others(oldItem.id)) });
      if (item && amount > 0) await save('feed_inventory', { ...item, ...applyFeedingUse(item, amount, today) });
    }
    const feedLogId = await setFeedLog(log, item, amount);
    await save('feeding_logs', { ...log, doneBy, itemId: item && amount > 0 ? item.id : undefined, amount: item && amount > 0 ? amount : undefined, feedLogId });
    writeFeeder(doneBy ?? null);
    toast('Feeding updated');
  }

  return { complete, undo, edit };
}

/** Today's tap-to-complete feedings for every flock (one heading per flock when there are several). */
export function FeedingChecklist() {
  const { data, today } = useApp();
  const actions = useFeedingActions();
  const [editing, setEditing] = useState<{ flock: Flock; log: FeedingLog } | null>(null);
  const multi = data.flocks.length > 1;
  return (
    <>
      {data.flocks.map((flock) => {
        const slots = todaysFeedings(flock, data.feeding_logs, today);
        const item = feedingItemFor(flock, data.feed_inventory);
        const amount = defaultFeedingAmount(item, slots.length);
        return (
          <div key={flock.id} className="feeding-group">
            {multi && <h3 className="feeding-flock">{flock.name}</h3>}
            <ul className="list" aria-label={`Feedings for ${flock.name}`}>
              {slots.map((s) => (
                <li key={s.slot} className="feeding-row">
                  <button className="check" role="checkbox" aria-checked={!!s.log} onClick={() => void (s.log ? actions.undo(s.log) : actions.complete(flock, s))}>
                    <span className="box"><Check /></span>
                    <span className="item-main">
                      <span className="item-title" style={{ display: 'block' }}>{s.label}</span>
                      <span className="item-sub feeding-sub">
                        {s.log ? doneLine(s.log, data.feed_inventory) : item && amount > 0 ? `Tap when done · ${round(amount, 2)} ${item.unit} ${item.name}` : 'Tap when done'}
                      </span>
                    </span>
                  </button>
                  {s.log && (
                    <span className="feeding-actions">
                      <button type="button" className="btn small ghost" onClick={() => setEditing({ flock, log: s.log as FeedingLog })} aria-label={`Edit ${s.label}`}>Edit</button>
                      <button type="button" className="btn small ghost" onClick={() => void actions.undo(s.log as FeedingLog)} aria-label={`Undo ${s.label}`}>Undo</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <Sheet open={!!editing} title={editing ? editing.log.label : 'Feeding'} onClose={() => setEditing(null)}>
        {editing && <FeedingEditForm key={editing.log.id} flock={editing.flock} log={editing.log} onSave={async (by, amt, item) => { await actions.edit(editing.log, by, amt, item); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function doneLine(log: FeedingLog, items: FeedItem[]): string {
  const it = log.itemId ? items.find((i) => i.id === log.itemId) : undefined;
  return feedingDoneText(log) + (it && log.amount ? ` · ${round(log.amount, 2)} ${it.unit}` : '');
}

function FeedingEditForm({ flock, log, onSave, onCancel }: { flock: Flock; log: FeedingLog; onSave(doneBy: string | undefined, amount: number, item: FeedItem | undefined): Promise<void>; onCancel(): void }) {
  const { data } = useApp();
  const item = (log.itemId ? data.feed_inventory.find((i) => i.id === log.itemId) : undefined) ?? feedingItemFor(flock, data.feed_inventory);
  const members = data.household_people.map((m) => m.name);
  const [by, setBy] = useState<string>(log.doneBy ?? '');
  const [amount, setAmount] = useState(String(round(log.amount ?? 0, 3)));
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const a = item ? parseNum(amount) ?? 0 : 0;
    if (item && a > 1000) return setErr('That amount looks too large.');
    await onSave(by || undefined, a, item);
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="muted">{feedingDoneText(log)}</p>
      {members.length > 0 ? (
        <Chips label="Done by" value={by} onChange={setBy} options={[{ value: '', label: 'No name' }, ...members.map((m) => ({ value: m, label: m }))]} />
      ) : (
        <p className="hint" style={{ marginBottom: 14 }}>Add household members in Account to record who did each feeding.</p>
      )}
      {item ? (
        <Field label={`Amount (${item.unit} of ${item.name})`} hint={`Optional. Default splits ${item.dailyUsage} ${item.unit} a day across ${feedTimesFor(flock).length} feedings. Enter 0 to skip.`}>
          {(id, d) => <input id={id} aria-describedby={d} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
      ) : (
        <p className="hint" style={{ marginBottom: 14 }}>Add a feed item on the Feed screen to track how much each feeding uses.</p>
      )}
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onCancel}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
    </form>
  );
}

/** Edit a flock's feed times (1 to 3) and which inventory item feedings draw from. */
export function FeedTimesForm({ flock, onDone }: { flock: Flock; onDone(): void }) {
  const { data, save, toast } = useApp();
  const [times, setTimes] = useState<string[]>(feedTimesFor(flock));
  const [itemId, setItemId] = useState<string>(flock.feedItemId ?? feedingItemFor(flock, data.feed_inventory)?.id ?? 'none');
  const [err, setErr] = useState('');
  const options = data.feed_inventory.filter((i) => i.category === 'feed' || i.category === 'scratch');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = times.map((t) => t.trim()).filter(Boolean);
    if (!clean.length) return setErr('Keep at least one feed time.');
    await save('flocks', { ...flock, feedTimes: clean.slice(0, MAX_FEED_TIMES), feedItemId: itemId });
    toast('Feed times saved');
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="muted small">Each feed time shows as a daily check-off on Home and Coop. Up to {MAX_FEED_TIMES}.</p>
      {times.map((t, i) => (
        <div key={i} className="row gap" style={{ alignItems: 'flex-end' }}>
          <div className="grow">
            <Field label={`Feed time ${i + 1}`}>{(id) => <input id={id} className="input" value={t} maxLength={40} placeholder={DEFAULT_FEED_TIMES[i] ?? 'Midday top-up'} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />}</Field>
          </div>
          {times.length > 1 && <button type="button" className="btn small ghost" style={{ marginBottom: 14 }} onClick={() => setTimes(times.filter((_, j) => j !== i))} aria-label={`Remove feed time ${i + 1}`}>Remove</button>}
        </div>
      ))}
      {times.length < MAX_FEED_TIMES && <button type="button" className="btn small block" style={{ marginBottom: 14 }} onClick={() => setTimes([...times, ''])}>+ Add a feed time</button>}
      <Chips label="Feedings use" value={itemId} onChange={setItemId} options={[...options.map((i) => ({ value: i.id, label: i.name })), { value: 'none', label: "Don't track amounts" }]} />
      {options.length === 0 && <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>Add your layer feed on the Feed screen to count down what each feeding uses.</p>}
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
    </form>
  );
}
