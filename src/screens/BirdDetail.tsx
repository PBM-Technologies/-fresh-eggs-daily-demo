import { useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Confirm, Empty, Page, Pill, Sheet, Stat } from '../components/ui';
import BirdForm from '../components/BirdForm';
import { Link, navigate } from '../router';
import { addDays, ageLabel, formatDate, relativeDay } from '../logic/dates';
import { birdEggTotal, sum } from '../logic/eggs';
import { healthEmoji, healthLabel, inQuarantine } from '../logic/care';

export default function BirdDetail({ birdId }: { birdId: string }) {
  const { data, today, remove, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const bird = data.birds.find((b) => b.id === birdId);
  if (!bird) {
    return (
      <Page title="Hen not found" back="/flock">
        <Card><Empty icon="🐔" title="We could not find this hen" action={<Link to="/flock" className="btn primary">Back to flock</Link>}>She may have been deleted.</Empty></Card>
      </Page>
    );
  }
  const total = birdEggTotal(data.egg_collections, bird.id);
  const last30 = sum(data.egg_collections.filter((l) => l.birdId === bird.id && l.collectedOn > addDays(today, -30)).map((l) => l.count));
  const lastEgg = data.egg_collections.filter((l) => l.birdId === bird.id).map((l) => l.collectedOn).sort().pop();
  const events = data.bird_health_events.filter((e) => e.birdId === bird.id).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  const flock = data.flocks.find((f) => f.id === bird.flockId);

  async function del() {
    await remove('birds', bird!.id);
    toast(`${bird!.name} was deleted`);
    navigate('/flock', true);
  }

  return (
    <Page title={bird.name} back="/flock" subtitle={[bird.breed, flock?.name].filter(Boolean).join(' · ')}
      action={<button className="btn small" onClick={() => setEditing(true)}>Edit</button>}>
      <Card>
        <div className="row gap" style={{ alignItems: 'flex-start' }}>
          <div className="avatar lg" aria-hidden="true">{bird.photo ? <img src={bird.photo} alt="" /> : '🐔'}</div>
          <div className="grow">
            <div className="row gap wrap" style={{ marginBottom: 6 }}>
              <Pill tone={bird.status === 'active' ? 'good' : undefined}>{bird.status === 'active' ? 'Active' : bird.status === 'rehomed' ? 'Rehomed' : 'Deceased'}</Pill>
              {inQuarantine(data.bird_health_events, bird.id, today) && <Pill tone="warn">In quarantine</Pill>}
            </div>
            <dl className="small" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
              <dt className="muted">Age</dt><dd style={{ margin: 0 }}>{ageLabel(bird.hatchDate, today) ?? 'Unknown'}</dd>
              {bird.hatchDate && (<><dt className="muted">Hatched</dt><dd style={{ margin: 0 }}>{formatDate(bird.hatchDate, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></>)}
              {bird.color && (<><dt className="muted">Color</dt><dd style={{ margin: 0 }}>{bird.color}</dd></>)}
            </dl>
          </div>
        </div>
        {bird.notes && <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{bird.notes}</p>}
      </Card>
      <div className="grid3" style={{ marginBottom: 14 }}>
        <Stat value={total} label="Eggs total" />
        <Stat value={last30} label="Last 30 days" />
        <Stat value={lastEgg ? relativeDay(lastEgg, today) : 'None'} label="Last egg" />
      </div>
      <p className="small muted" style={{ marginTop: -6 }}>Egg totals count logs where you picked {bird.name} as the layer.</p>
      <Link to={`/health-check?bird=${bird.id}`} className="btn block" style={{ marginBottom: 14 }}>📷 Check this hen with a photo</Link>
      <Card title="Health log" action={<Link to={`/care?bird=${bird.id}`} className="link-btn">+ Add</Link>}>
        {events.length === 0 ? (
          <Empty icon="🩺" title="No health events">Deworming, checks, injuries and vet visits for {bird.name} show up here.</Empty>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className="item">
                <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>{healthEmoji(e.type)}</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{healthLabel(e.type)}</span>
                  <span className="item-sub">{formatDate(e.occurredOn, { month: 'short', day: 'numeric', year: 'numeric' })}{e.notes ? ` · ${e.notes}` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <button className="btn danger block" onClick={() => setConfirm(true)}>Delete {bird.name}</button>
      <p className="small muted center" style={{ marginTop: 8 }}>Tip: if she was rehomed or passed away, edit her status instead to keep her history.</p>
      <Sheet open={editing} title={`Edit ${bird.name}`} onClose={() => setEditing(false)}>
        <BirdForm bird={bird} onDone={() => setEditing(false)} />
      </Sheet>
      <Confirm open={confirm} onClose={() => setConfirm(false)} danger confirmLabel="Delete" title={`Delete ${bird.name}?`}
        body={<>This removes her profile. Egg logs stay in your totals but will no longer be linked to her. This cannot be undone.</>} onConfirm={() => void del()} />
    </Page>
  );
}

