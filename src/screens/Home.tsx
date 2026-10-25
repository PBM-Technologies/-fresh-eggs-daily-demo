import { useMemo, useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Empty, Page, Stat } from '../components/ui';
import { Link } from '../router';
import { collectedOn, eggsOnHand, layingTrend } from '../logic/eggs';
import { choreStreak, todaysChecklist } from '../logic/chores';
import { remindersFor } from '../logic/reminders';
import { buildSampleFlock } from '../data/sample';
import { removeSample } from '../data/service';
import { formatDate } from '../logic/dates';
import RemindersList from './RemindersList';
import { ARTICLES } from '../content/articles';
import type { CollectionName } from '../contracts/domain';
import { FeedingChecklist } from '../components/Feeding';
import { TreatMeter, useTreatStatus } from './Treats';
import { reorderUrl } from '../content/shop';
import { daysRemaining, stockLevel } from '../logic/feed';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { data, today, activeFlockId, adapter, reload, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const birds = data.birds.filter((b) => b.status === 'active');
  const eggsToday = collectedOn(data.egg_collections, today);
  const checklist = todaysChecklist(data.chore_templates, data.chore_occurrences, today);
  const doneCount = checklist.filter((c) => c.done).length;
  const streak = choreStreak(data.chore_templates, data.chore_occurrences, today);
  const onHand = eggsOnHand(data.egg_collections, data.egg_inventory);
  const trend = layingTrend(data.egg_collections, today);
  const allReminders = useMemo(() => remindersFor(data, today), [data, today]);
  // Low feed has its own card on Home with Reorder, so it is left out of Due today here (the bell still lists it).
  const reminders = allReminders.filter((r) => r.kind !== 'feed');
  const low = data.feed_inventory.filter((f) => ['low', 'out'].includes(stockLevel(f, today)));
  const treats = useTreatStatus(activeFlockId);
  const hasSample = COLLS.some((c) => (data[c] as { sample?: boolean }[]).some((x) => x.sample));
  const tip = ARTICLES[(Number(today.slice(8, 10)) + Number(today.slice(5, 7))) % ARTICLES.length];

  async function loadSample() {
    if (!activeFlockId || !data.household) return;
    setBusy(true);
    try {
      const sample = buildSampleFlock(data.household.id, activeFlockId, today);
      for (const [c, rows] of Object.entries(sample)) {
        const store = adapter.collection(c as CollectionName);
        const existing = await store.list();
        await store.replaceAll([...existing, ...(rows as never[])] as never);
      }
      await reload();
      toast('Sample flock loaded');
    } finally {
      setBusy(false);
    }
  }
  async function clearSample() {
    setBusy(true);
    try {
      await removeSample(adapter);
      await reload();
      toast('Sample data removed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Today" subtitle={formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}>
      <Card className="hero">
        <p style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 12 }}>{greeting()}, {data.household?.name}!</p>
        <div className="grid3">
          <Stat value={birds.length} label={birds.length === 1 ? 'Hen' : 'Hens'} />
          <Stat value={eggsToday} label="Eggs today" />
          <Stat value={`${doneCount}/${checklist.length}`} label="Chores" />
        </div>
        <div className="row gap" style={{ marginTop: 14 }}>
          <Link to="/eggs" className="btn grow" style={{ background: '#fff', color: '#3d5638', borderColor: '#fff' }}>🥚 Log eggs</Link>
          <Link to="/coop" className="btn ghost grow" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>Chores</Link>
        </div>
      </Card>

      {data.flocks.length > 0 && (
        <Card title="Feeding today" action={<Link to="/coop" className="link-btn">Feed times</Link>}>
          <FeedingChecklist />
        </Card>
      )}

      {low.length > 0 && (
        <Card title="Running low" action={<Link to="/feed" className="link-btn">Feed</Link>}>
          <ul className="list" aria-label="Running low">
            {low.map((f) => {
              const url = reorderUrl(f.category);
              const d = daysRemaining(f, today);
              const out = stockLevel(f, today) === 'out';
              return (
                <li key={f.id} className="item">
                  <span className="avatar" aria-hidden="true" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>🌾</span>
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{out ? `Out of ${f.name}` : `${f.name} is running low`}</span>
                    <span className="item-sub">{out ? 'Restock soon' : `About ${d} day${d === 1 ? '' : 's'} left`}</span>
                  </span>
                  {url
                    ? <a className="btn small" href={url} target="_blank" rel="noopener noreferrer">Reorder<span className="sr-only"> {f.name} on Fresh Eggs Daily (opens in a new tab)</span></a>
                    : <Link to="/feed" className="btn small ghost">Restock<span className="sr-only"> {f.name}</span></Link>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <nav className="quick-row" aria-label="Photo tools">
        <Link to="/identify" className="quick"><span aria-hidden="true">📷</span>Identify a breed</Link>
        <Link to="/health-check" className="quick"><span aria-hidden="true">🔍</span>Photo health check</Link>
        <Link to="/breeds" className="quick"><span aria-hidden="true">🐓</span>What to add next</Link>
      </nav>

      {birds.length === 0 && !hasSample && (
        <Card>
          <Empty icon="🐔" title="Your flock is empty" action={
            <div className="stack" style={{ maxWidth: 320, margin: '12px auto 0' }}>
              <Link to="/flock?add=1" className="btn primary block">Add your first hen</Link>
              <button className="btn block" onClick={() => void loadSample()} disabled={busy}>{busy ? 'Loading…' : 'Load sample flock'}</button>
            </div>
          }>
            Add your hens to track who is laying, or load a sample flock to explore the app first.
          </Empty>
        </Card>
      )}
      {hasSample && (
        <div className="notice row gap between">
          <span>You are viewing sample data.</span>
          <button className="link-btn" onClick={() => void clearSample()} disabled={busy}>Remove sample</button>
        </div>
      )}

      <div className="grid-auto">
        <Card title="Due today" action={<span className="pill">{reminders.length}</span>}>
          <RemindersList reminders={reminders} limit={5} />
          {reminders.length > 5 && <p className="small muted center">Plus {reminders.length - 5} more in the bell menu.</p>}
        </Card>
        {birds.length > 0 && (
          <Card title="Treats today" action={<Link to="/treats" className="link-btn">Log a treat</Link>}>
            <TreatMeter status={treats} compact />
          </Card>
        )}
        <Card title="Egg snapshot" action={<Link to="/eggs/history" className="link-btn">History</Link>}>
          <div className="grid2">
            <Stat value={onHand} label="Eggs on hand" />
            <Stat value={trend.recentAvg.toFixed(1)} label="Per day, last 7" tone={trend.direction === 'down' ? 'warn' : trend.direction === 'up' ? 'good' : undefined} />
            <Stat value={streak} label={streak === 1 ? 'Day streak' : 'Day streak'} tone={streak > 0 ? 'good' : undefined} />
            <Stat value={data.flocks.length} label={data.flocks.length === 1 ? 'Flock' : 'Flocks'} />
          </div>
          {trend.direction !== 'none' && trend.changePct !== null && (
            <p className="small muted" style={{ marginTop: 10 }}>
              Laying is {trend.direction === 'steady' ? 'steady' : trend.direction === 'up' ? `up ${Math.round(trend.changePct)}%` : `down ${Math.abs(Math.round(trend.changePct))}%`} compared with the week before.
            </p>
          )}
        </Card>
      </div>

      {tip && (
        <Card className="soft" title="From the Learn library">
          <p style={{ fontWeight: 800 }}>{tip.title}</p>
          <p className="muted small">{tip.problem}</p>
          <Link to={`/learn?a=${tip.slug}`} className="link-btn" style={{ paddingLeft: 0 }}>Read the guide</Link>
        </Card>
      )}
    </Page>
  );
}

const COLLS: CollectionName[] = ['birds', 'egg_collections', 'egg_inventory', 'flock_costs', 'feed_inventory', 'bird_health_events', 'feeding_logs', 'treat_logs', 'household_people'];
