import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Confirm, Empty, Field, Page, Pill, Sheet, Stat, Stepper } from '../components/ui';
import { batchStatus, brooderGuide, expectedHatch, hatchRate, incubationDay, MILESTONES, milestoneDate, nextMilestone } from '../logic/incubation';
import { ageInWeeks, formatDate, isDateKey, relativeDay } from '../logic/dates';
import type { IncubationBatch } from '../contracts/domain';

export default function Brooder() {
  const { data, today } = useApp();
  const [adding, setAdding] = useState(false);
  const [recording, setRecording] = useState<IncubationBatch | null>(null);
  const [del, setDel] = useState<IncubationBatch | null>(null);
  const { remove } = useApp();
  const hatchByBatch = new Map(data.hatch_events.map((h) => [h.batchId, h]));
  const batches = [...data.incubation_batches].sort((a, b) => b.setOn.localeCompare(a.setOn));
  const chickBirds = data.birds.filter((b) => b.status === 'active' && b.hatchDate && ageInWeeks(b.hatchDate, today) < 6 && ageInWeeks(b.hatchDate, today) >= 0);
  const guide = brooderGuide();
  const nowWeek = chickBirds.length ? Math.min(...chickBirds.map((b) => ageInWeeks(b.hatchDate as string, today))) + 1 : null;

  return (
    <Page title="Brooder and incubation" action={<button className="btn primary small" onClick={() => setAdding(true)}>+ Batch</button>}>
      <Card title="Incubation batches">
        {batches.length === 0 ? (
          <Empty icon="🥚" title="No eggs in the incubator" action={<button className="btn primary" onClick={() => setAdding(true)}>Start a batch</button>}>
            Track set date, candling on days 7 and 14, lockdown on day 18 and hatch day 21.
          </Empty>
        ) : (
          <ul className="list">
            {batches.map((b) => {
              const h = hatchByBatch.get(b.id);
              const day = incubationDay(b.setOn, today);
              const st = batchStatus(b, h, today);
              const next = nextMilestone(b.setOn, today);
              const rate = h ? hatchRate(h.hatched, h.unhatched) : null;
              return (
                <li key={b.id} style={{ padding: '14px 0' }}>
                  <div className="row gap between">
                    <div>
                      <h3>{b.name}</h3>
                      <p className="small muted" style={{ margin: 0 }}>{b.eggCount} eggs set {formatDate(b.setOn, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    {st === 'hatched' ? <Pill tone="good">Hatched</Pill> : st === 'due' ? <Pill tone="warn">Hatch window</Pill> : st === 'overdue' ? <Pill tone="bad">Past due</Pill> : <div className="center"><div className="day-badge">{Math.max(0, day)}</div><div className="small muted">day of 21</div></div>}
                  </div>
                  {!h && (
                    <>
                      <div className="timeline" aria-label="Milestones">
                        {MILESTONES.map((m) => (
                          <div key={m.key} className={day > m.day ? 'past' : day === m.day ? 'now' : ''}>
                            <div>Day {m.day}</div>
                            <div style={{ fontWeight: 600 }}>{m.key.startsWith('candle') ? 'Candle' : m.key === 'lockdown' ? 'Lockdown' : 'Hatch'}</div>
                            <div className="muted" style={{ fontWeight: 600 }}>{formatDate(milestoneDate(b.setOn, m.day))}</div>
                          </div>
                        ))}
                      </div>
                      {next && <p className="small" style={{ marginTop: 10 }}><strong>{next.title}</strong> {relativeDay(milestoneDate(b.setOn, next.day), today).toLowerCase()}. {next.detail}</p>}
                      {!next && <p className="small" style={{ marginTop: 10 }}>Expected hatch was {relativeDay(expectedHatch(b.setOn), today).toLowerCase()}. Record the results when you are done.</p>}
                    </>
                  )}
                  {h && (
                    <div className="grid3" style={{ marginTop: 10 }}>
                      <Stat value={h.hatched} label="Hatched" tone="good" />
                      <Stat value={h.unhatched} label="Did not hatch" />
                      <Stat value={rate === null ? 'None' : `${rate}%`} label="Hatch rate" />
                    </div>
                  )}
                  <div className="row gap" style={{ marginTop: 10 }}>
                    <button className="btn small" onClick={() => setRecording(b)}>{h ? 'Edit results' : 'Record hatch'}</button>
                    <button className="btn small ghost" onClick={() => setDel(b)}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Brooder temperature guide">
        <p className="small muted">General guidance for chicks under a heat source. Watch your chicks: huddling means too cold, panting and spreading away means too hot.</p>
        <table className="guide">
          <thead><tr><th scope="col">Chick age</th><th scope="col">Under heat</th><th scope="col">Celsius</th></tr></thead>
          <tbody>
            {guide.map((g) => (
              <tr key={g.week} className={nowWeek === g.week ? 'now' : ''}>
                <td>Week {g.week}</td><td>About {g.tempF}F</td><td>About {g.tempC}C</td>
              </tr>
            ))}
            <tr><td>After week 6</td><td colSpan={2}>Fully feathered chicks usually no longer need extra heat</td></tr>
          </tbody>
        </table>
        {nowWeek && <p className="small" style={{ marginTop: 10 }}>Your youngest chick is in week {nowWeek}.</p>}
      </Card>
      <Sheet open={adding} title="New incubation batch" onClose={() => setAdding(false)}>
        {adding && <BatchForm onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet open={!!recording} title="Hatch results" onClose={() => setRecording(null)}>
        {recording && <HatchForm batch={recording} onDone={() => setRecording(null)} />}
      </Sheet>
      <Confirm open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete" title={`Delete ${del?.name}?`} body="The batch and its hatch results will be removed."
        onConfirm={() => { if (del) { void remove('incubation_batches', del.id); const h = hatchByBatch.get(del.id); if (h) void remove('hatch_events', h.id); } }} />
    </Page>
  );
}

function BatchForm({ onDone }: { onDone(): void }) {
  const { data, today, save, toast } = useApp();
  const [name, setName] = useState(`Batch ${data.incubation_batches.length + 1}`);
  const [setOn, setSetOn] = useState(today);
  const [eggs, setEggs] = useState(12);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr('Name the batch.');
    if (!isDateKey(setOn) || setOn > today) return setErr('Set date must be today or earlier.');
    if (eggs < 1) return setErr('Set at least one egg.');
    await save('incubation_batches', { name: name.trim(), setOn, eggCount: eggs, notes: notes.trim() || undefined });
    toast('Batch started. Good luck!');
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Field label="Batch name">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
      <Field label="Date set in the incubator" hint={isDateKey(setOn) ? `Expected hatch ${formatDate(expectedHatch(setOn), { weekday: 'short', month: 'short', day: 'numeric' })}` : undefined}>
        {(id, d) => <input id={id} aria-describedby={d} type="date" className="input" value={setOn} max={today} onChange={(e) => setSetOn(e.target.value)} />}
      </Field>
      <div className="field"><span className="label">Eggs set</span><Stepper value={eggs} onChange={setEggs} min={1} max={500} label="Eggs set" /></div>
      <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Breed, source, incubator" maxLength={200} />}</Field>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Start batch</button></div>
    </form>
  );
}

function HatchForm({ batch, onDone }: { batch: IncubationBatch; onDone(): void }) {
  const { data, today, save, toast } = useApp();
  const existing = data.hatch_events.find((h) => h.batchId === batch.id);
  const [hatched, setHatched] = useState(existing?.hatched ?? 0);
  const [unhatched, setUnhatched] = useState(existing?.unhatched ?? batch.eggCount);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const rate = hatchRate(hatched, unhatched);
  async function submit(e: FormEvent) {
    e.preventDefault();
    await save('hatch_events', { ...(existing ?? {}), batchId: batch.id, recordedOn: existing?.recordedOn ?? today, hatched, unhatched, notes: notes.trim() || undefined } as never);
    toast(`Saved. Hatch rate ${rate ?? 0}%`);
    onDone();
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="muted">{batch.eggCount} eggs were set. Include eggs removed at candling in "did not hatch" if you want the rate to reflect the full set.</p>
      <div className="field"><span className="label">Hatched</span><Stepper value={hatched} onChange={(n) => { setHatched(n); if (n + unhatched !== batch.eggCount && n <= batch.eggCount) setUnhatched(batch.eggCount - n); }} max={999} label="Chicks hatched" /></div>
      <div className="field"><span className="label">Did not hatch</span><Stepper value={unhatched} onChange={setUnhatched} max={999} label="Eggs that did not hatch" /></div>
      <div className="stat good" style={{ marginBottom: 14 }}><div className="stat-value">{rate === null ? 'None' : `${rate}%`}</div><div className="stat-label">Hatch rate</div></div>
      <Field label="Notes">{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />}</Field>
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onDone}>Cancel</button><button type="submit" className="btn primary grow">Save results</button></div>
    </form>
  );
}
