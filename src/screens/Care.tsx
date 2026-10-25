import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Confirm, Empty, Field, Page, Pill, Sheet } from '../components/ui';
import { Link, navigate, useRoute } from '../router';
import { careReminders, HEALTH_TYPES, healthEmoji, healthLabel } from '../logic/care';
import { addDays, formatDate, isDateKey, relativeDay } from '../logic/dates';
import type { BirdHealthEvent, HealthEventType } from '../contracts/domain';

export default function Care() {
  const { data, today, save, remove, toast, activeFlockId } = useApp();
  const route = useRoute();
  const presetBird = route.query.get('bird') ?? '';
  const [open, setOpen] = useState(!!presetBird);
  const [del, setDel] = useState<BirdHealthEvent | null>(null);
  useEffect(() => { if (presetBird) setOpen(true); }, [presetBird]);
  const reminders = careReminders(data.bird_health_events, today, 30);
  const events = [...data.bird_health_events].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  const birdName = new Map(data.birds.map((b) => [b.id, b.name]));
  const close = () => { setOpen(false); if (presetBird) navigate('/care', true); };

  return (
    <Page title="Care" subtitle="Health and biosecurity log" action={<button className="btn primary small" onClick={() => setOpen(true)}>+ Log</button>}>
      <div className="notice info" role="note">
        This log helps you keep records. Fresh Eggs Daily does not give veterinary diagnosis or treatment advice. If a bird seems unwell, contact a poultry vet.
      </div>
      <Card title="Upcoming reminders">
        {reminders.length === 0 ? (
          <Empty icon="📅" title="Nothing scheduled">Add a follow-up date when you log an event, like the next deworming or a quarantine end date.</Empty>
        ) : (
          <ul className="list">
            {reminders.map((r) => (
              <li key={r.event.id + r.kind} className="item">
                <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>{healthEmoji(r.event.type)}</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{r.kind === 'quarantine_end' ? 'Quarantine ends' : `${healthLabel(r.event.type)} follow-up`}</span>
                  <span className="item-sub">{r.event.birdId ? birdName.get(r.event.birdId) ?? 'Unknown hen' : 'Whole flock'} · {relativeDay(r.on, today)}</span>
                </span>
                {r.on < today ? <Pill tone="bad">Overdue</Pill> : r.on === today ? <Pill tone="warn">Today</Pill> : null}
                <button className="btn small" onClick={() => void save('bird_health_events', { ...r.event, reminderDone: true }).then(() => toast('Marked done'))}>Done</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Health log">
        {events.length === 0 ? (
          <Empty icon="🩺" title="No events logged" action={<button className="btn primary" onClick={() => setOpen(true)}>Log a health event</button>}>
            Record deworming, mite and lice checks, injuries, molts, vaccinations, vet visits and quarantines.
          </Empty>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className="item">
                <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>{healthEmoji(e.type)}</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{healthLabel(e.type)} · {e.birdId ? <Link to={`/flock/${e.birdId}`}>{birdName.get(e.birdId) ?? 'Unknown hen'}</Link> : 'Whole flock'}</span>
                  <span className="item-sub">{formatDate(e.occurredOn, { month: 'short', day: 'numeric', year: 'numeric' })}{e.endsOn ? ` · until ${formatDate(e.endsOn)}` : ''}{e.notes ? ` · ${e.notes}` : ''}</span>
                </span>
                <button className="icon-btn" aria-label="Delete event" onClick={() => setDel(e)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={open} title="Log a health event" onClose={close}>
        {open && <CareForm presetBird={presetBird} flockId={activeFlockId ?? data.flocks[0]?.id ?? ''} onDone={close} />}
      </Sheet>
      <Confirm open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete" title="Delete this event?" body="This cannot be undone." onConfirm={() => { if (del) void remove('bird_health_events', del.id); }} />
    </Page>
  );
}

function CareForm({ presetBird, flockId, onDone }: { presetBird: string; flockId: string; onDone(): void }) {
  const { data, today, save, toast } = useApp();
  const [type, setType] = useState<HealthEventType>(presetBird ? 'mites_lice_check' : 'deworming');
  const [birdId, setBirdId] = useState(presetBird);
  const [occurredOn, setOccurredOn] = useState(today);
  const [endsOn, setEndsOn] = useState(addDays(today, 30));
  const [remindOn, setRemindOn] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const hens = data.birds.filter((b) => b.status === 'active').sort((a, b) => a.name.localeCompare(b.name));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isDateKey(occurredOn)) return setErr('Pick the date it happened.');
    if (type === 'quarantine' && (!isDateKey(endsOn) || endsOn < occurredOn)) return setErr('Quarantine end date must be after the start.');
    if (remindOn && remindOn < occurredOn) return setErr('Reminder date must be after the event.');
    const bird = data.birds.find((b) => b.id === birdId);
    await save('bird_health_events', {
      flockId: bird?.flockId ?? flockId, birdId: birdId || undefined, type, occurredOn, notes: notes.trim() || undefined,
      endsOn: type === 'quarantine' ? endsOn : undefined, remindOn: remindOn || undefined,
    });
    toast('Health event saved');
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Chips label="Type" value={type} onChange={setType} options={HEALTH_TYPES} />
      <Chips label="Who" value={birdId} onChange={setBirdId} options={[{ value: '', label: 'Whole flock' }, ...hens.map((h) => ({ value: h.id, label: h.name }))]} />
      <Field label={type === 'quarantine' ? 'Quarantine starts' : 'Date'}>{(id) => <input id={id} type="date" className="input" value={occurredOn} max={today} onChange={(e) => setOccurredOn(e.target.value)} />}</Field>
      {type === 'quarantine' && (
        <Field label="Quarantine ends" hint="30 days is a common minimum for new birds.">{(id, d) => <input id={id} aria-describedby={d} type="date" className="input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />}</Field>
      )}
      <div className="field">
        <span className="label">Follow-up reminder (optional)</span>
        <div className="chips" style={{ marginBottom: 8 }}>
          {[{ l: '1 week', d: 7 }, { l: '2 weeks', d: 14 }, { l: '1 month', d: 30 }, { l: '3 months', d: 90 }].map((o) => (
            <button type="button" key={o.d} className={'chip' + (remindOn === addDays(occurredOn, o.d) ? ' on' : '')} aria-pressed={remindOn === addDays(occurredOn, o.d)} onClick={() => setRemindOn(addDays(occurredOn, o.d))}>{o.l}</button>
          ))}
          {remindOn && <button type="button" className="chip" onClick={() => setRemindOn('')}>No reminder</button>}
        </div>
        <input type="date" className="input" aria-label="Follow-up reminder date" value={remindOn} min={occurredOn} onChange={(e) => setRemindOn(e.target.value)} />
      </div>
      <Field label="Notes">{(id) => <textarea id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="What you saw, what you used, who you talked to" />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
    </form>
  );
}
