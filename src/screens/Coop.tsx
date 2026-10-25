import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Confirm, Empty, Field, Page, Pill, Sheet, Stat } from '../components/ui';
import { Check } from '../components/Icons';
import { choreStreak, nextDueDate, RECURRENCE_LABEL, todaysChecklist } from '../logic/chores';
import { relativeDay } from '../logic/dates';
import { nowIso } from '../data/ids';
import type { ChoreRecurrence, ChoreTemplate } from '../contracts/domain';

const RECS: { value: ChoreRecurrence; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'seasonal', label: 'Seasonal' },
];

export default function Coop() {
  const { data, today, save, remove, toast } = useApp();
  const [editing, setEditing] = useState<ChoreTemplate | 'new' | null>(null);
  const items = todaysChecklist(data.chore_templates, data.chore_occurrences, today);
  const done = items.filter((i) => i.done).length;
  const streak = choreStreak(data.chore_templates, data.chore_occurrences, today);
  const templates = [...data.chore_templates].sort((a, b) => RECS.findIndex((r) => r.value === a.recurrence) - RECS.findIndex((r) => r.value === b.recurrence) || a.title.localeCompare(b.title));

  async function toggle(i: (typeof items)[number]) {
    if (i.done) {
      await remove('chore_occurrences', i.done.id);
    } else {
      await save('chore_occurrences', { templateId: i.template.id, title: i.template.title, dueAt: i.dueOn, completedAt: nowIso() });
      const remaining = items.filter((x) => !x.done && x.template.id !== i.template.id).length;
      if (remaining === 0) toast('All chores done. Nice work!');
    }
  }

  return (
    <Page title="Coop chores" subtitle={`${done} of ${items.length} done today`} action={<button className="btn small" onClick={() => setEditing('new')}>+ Chore</button>}>
      <Card className="hero">
        <div className="row gap between" style={{ marginBottom: 10 }}>
          <strong>Today's progress</strong>
          <span>{items.length ? Math.round((done / items.length) * 100) : 0}%</span>
        </div>
        <div className="progress" role="progressbar" aria-label="Chores completed today" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
          <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <Stat value={`${streak} 🔥`} label="Day streak (all daily chores)" />
          <Stat value={items.filter((i) => i.overdue).length} label="Overdue" />
        </div>
      </Card>
      <Card title="Today's checklist">
        {items.length === 0 ? (
          <Empty icon="🧹" title="No chores today" action={<button className="btn primary" onClick={() => setEditing('new')}>Add a chore</button>}>Add chores with a schedule and they will appear here when due.</Empty>
        ) : (
          <ul className="list">
            {items.map((i) => (
              <li key={i.template.id}>
                <button className="check" role="checkbox" aria-checked={!!i.done} onClick={() => void toggle(i)}>
                  <span className="box"><Check /></span>
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{i.template.title}</span>
                    <span className="item-sub">{RECURRENCE_LABEL[i.template.recurrence]}{i.overdue ? ` · due ${relativeDay(i.dueOn, today).toLowerCase()}` : ''}</span>
                  </span>
                  {i.overdue && <Pill tone="bad">Overdue</Pill>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Chore schedule">
        {templates.length === 0 ? <Empty icon="📅" title="No chores set up" /> : (
          <ul className="list">
            {templates.map((t) => (
              <li key={t.id}>
                <button className="item" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`}>
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block', opacity: t.active ? 1 : 0.5 }}>{t.title}</span>
                    <span className="item-sub">{RECURRENCE_LABEL[t.recurrence]}{t.active ? ` · next ${relativeDay(nextDueDate(t, today), today).toLowerCase()}` : ' · paused'}</span>
                  </span>
                  <span className="link-btn" aria-hidden="true">Edit</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={!!editing} title={editing === 'new' ? 'New chore' : 'Edit chore'} onClose={() => setEditing(null)}>
        {editing && <ChoreForm key={editing === 'new' ? 'new' : editing.id} chore={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Page>
  );
}

function ChoreForm({ chore, onDone }: { chore?: ChoreTemplate; onDone(): void }) {
  const { today, save, remove, data, toast } = useApp();
  const [title, setTitle] = useState(chore?.title ?? '');
  const [recurrence, setRecurrence] = useState<ChoreRecurrence>(chore?.recurrence ?? 'daily');
  const [startDate, setStartDate] = useState(chore?.startDate ?? today);
  const [active, setActive] = useState(chore?.active ?? true);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setErr('Give the chore a name.');
    if (!startDate) return setErr('Pick a start date.');
    await save('chore_templates', { ...(chore ?? {}), title: title.trim(), recurrence, startDate, active } as ChoreTemplate);
    toast(chore ? 'Chore updated' : 'Chore added');
    onDone();
  }
  async function del() {
    if (!chore) return;
    await remove('chore_templates', chore.id);
    for (const o of data.chore_occurrences.filter((x) => x.templateId === chore.id)) await remove('chore_occurrences', o.id);
    toast('Chore deleted');
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Field label="Chore">{(id) => <input id={id} className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />}</Field>
      <Chips label="Repeats" value={recurrence} onChange={setRecurrence} options={RECS} />
      <Field label="Starts on" hint="Weekly, monthly and seasonal chores repeat from this date.">{(id, d) => <input id={id} aria-describedby={d} type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</Field>
      <Chips label="Status" value={active ? 'on' : 'off'} onChange={(v) => setActive(v === 'on')} options={[{ value: 'on', label: 'Active' }, { value: 'off', label: 'Paused' }]} />
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
      {chore && <button type="button" className="btn danger block" style={{ marginTop: 12 }} onClick={() => setConfirm(true)}>Delete chore</button>}
      <Confirm open={confirm} onClose={() => setConfirm(false)} danger confirmLabel="Delete" title="Delete this chore?" body="Its history and streak contribution will be removed." onConfirm={() => void del()} />
    </form>
  );
}
