import type { BirdHealthEvent, DateKey, HealthEventType } from '../contracts/domain';

export const HEALTH_TYPES: { value: HealthEventType; label: string; emoji: string }[] = [
  { value: 'deworming', label: 'Deworming', emoji: '💊' },
  { value: 'mites_lice_check', label: 'Mites and lice check', emoji: '🔍' },
  { value: 'injury', label: 'Injury', emoji: '🩹' },
  { value: 'molt', label: 'Molt', emoji: '🪶' },
  { value: 'vaccination', label: 'Vaccination', emoji: '💉' },
  { value: 'vet_visit', label: 'Vet visit', emoji: '🩺' },
  { value: 'quarantine', label: 'Quarantine', emoji: '🚧' },
  { value: 'photo_check', label: 'Photo check', emoji: '📷' },
  { value: 'other', label: 'Other', emoji: '📝' },
];
export const healthLabel = (t: HealthEventType) => HEALTH_TYPES.find((h) => h.value === t)?.label ?? t;
export const healthEmoji = (t: HealthEventType) => HEALTH_TYPES.find((h) => h.value === t)?.emoji ?? '📝';

export interface CareReminder { event: BirdHealthEvent; on: DateKey; kind: 'quarantine_end' | 'follow_up' }

/** Open reminders: follow-ups not yet marked done and quarantines that have not ended. Sorted by date. */
export function careReminders(events: BirdHealthEvent[], today: DateKey, horizonDays = 30): CareReminder[] {
  const limit = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + horizonDays)).toISOString().slice(0, 10);
  const out: CareReminder[] = [];
  for (const e of events) {
    if (e.reminderDone) continue;
    if (e.remindOn && e.remindOn <= limit) out.push({ event: e, on: e.remindOn, kind: 'follow_up' });
    if (e.type === 'quarantine' && e.endsOn && e.endsOn <= limit && (!e.remindOn || e.remindOn !== e.endsOn)) out.push({ event: e, on: e.endsOn, kind: 'quarantine_end' });
  }
  return out.sort((a, b) => a.on.localeCompare(b.on));
}
export function inQuarantine(events: BirdHealthEvent[], birdId: string, today: DateKey): boolean {
  return events.some((e) => e.type === 'quarantine' && e.birdId === birdId && e.occurredOn <= today && (!e.endsOn || e.endsOn >= today) && !e.reminderDone);
}
