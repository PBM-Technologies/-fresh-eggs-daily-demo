import type { Reminder } from '../contracts/domain';
import { Empty, Pill } from '../components/ui';
import { Chevron } from '../components/Icons';

const EMOJI: Record<Reminder['kind'], string> = { chore: '🧹', care: '🩺', feed: '🌾', incubation: '🐣' };

export default function RemindersList({ reminders, onNavigate, limit }: { reminders: Reminder[]; onNavigate?(): void; limit?: number }) {
  if (!reminders.length) return <Empty icon="✅" title="All caught up">Nothing is due right now. Enjoy the flock.</Empty>;
  const shown = limit ? reminders.slice(0, limit) : reminders;
  return (
    <ul className="list" aria-label="Reminders">
      {shown.map((r) => (
        <li key={r.id}>
          <a className="item" href={r.href} onClick={onNavigate}>
            <span className="avatar" aria-hidden="true" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>{EMOJI[r.kind]}</span>
            <span className="item-main">
              <span className="item-title" style={{ display: 'block' }}>{r.title}</span>
              <span className="item-sub">{r.detail}</span>
            </span>
            {r.overdue && <Pill tone="bad">Overdue</Pill>}
            <Chevron />
          </a>
        </li>
      ))}
    </ul>
  );
}
