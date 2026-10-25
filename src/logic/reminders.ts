import type { DateKey, Reminder } from '../contracts/domain';
import type { Snapshot } from '../data/service';
import { healthLabel, careReminders } from './care';
import { todaysChecklist } from './chores';
import { relativeDay } from './dates';
import { daysRemaining, stockLevel } from './feed';
import { incubationDay, MILESTONES } from './incubation';

/** Everything due today or overdue, across chores, care, feed and incubation. */
export function remindersFor(s: Snapshot, today: DateKey): Reminder[] {
  const out: Reminder[] = [];
  for (const item of todaysChecklist(s.chore_templates, s.chore_occurrences, today)) {
    if (item.done) continue;
    out.push({ id: `chore:${item.template.id}`, kind: 'chore', title: item.template.title, detail: item.overdue ? `Overdue since ${relativeDay(item.dueOn, today).toLowerCase()}` : 'Due today', href: '#/coop', overdue: item.overdue });
  }
  const birdName = new Map(s.birds.map((b) => [b.id, b.name]));
  for (const r of careReminders(s.bird_health_events, today, 0)) {
    const who = r.event.birdId ? birdName.get(r.event.birdId) ?? 'A hen' : 'Whole flock';
    out.push({
      id: `care:${r.event.id}:${r.kind}`, kind: 'care',
      title: r.kind === 'quarantine_end' ? `Quarantine ends: ${who}` : `${healthLabel(r.event.type)} follow-up: ${who}`,
      detail: relativeDay(r.on, today), href: '#/care', overdue: r.on < today,
    });
  }
  for (const f of s.feed_inventory) {
    const lvl = stockLevel(f, today);
    if (lvl === 'out' || lvl === 'low') {
      const d = daysRemaining(f, today);
      out.push({ id: `feed:${f.id}`, kind: 'feed', title: lvl === 'out' ? `Out of ${f.name}` : `${f.name} is running low`, detail: lvl === 'out' ? 'Restock soon' : `About ${d} day${d === 1 ? '' : 's'} left`, href: '#/feed', overdue: lvl === 'out' });
    }
  }
  const hatched = new Set(s.hatch_events.map((h) => h.batchId));
  for (const b of s.incubation_batches) {
    if (hatched.has(b.id)) continue;
    const day = incubationDay(b.setOn, today);
    const m = MILESTONES.find((x) => x.day === day);
    if (m) out.push({ id: `inc:${b.id}:${m.key}`, kind: 'incubation', title: `${m.title}: ${b.name}`, detail: `Day ${day}. ${m.detail}`, href: '#/brooder', overdue: false });
    else if (day > 21) out.push({ id: `inc:${b.id}:late`, kind: 'incubation', title: `Record hatch results: ${b.name}`, detail: `Day ${day}. Expected hatch was day 21.`, href: '#/brooder', overdue: true });
  }
  return out.sort((a, b) => Number(b.overdue) - Number(a.overdue));
}
