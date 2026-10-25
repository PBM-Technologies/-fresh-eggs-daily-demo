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
  const reminders = useMemo(() => remindersFor(data, today), [data, today]);
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

const COLLS: CollectionName[] = ['birds', 'egg_collections', 'egg_inventory', 'flock_costs', 'feed_inventory', 'bird_health_events'];
