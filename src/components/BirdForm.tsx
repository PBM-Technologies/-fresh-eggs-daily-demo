import { useState, type FormEvent } from 'react';
import type { Bird, BirdStatus } from '../contracts/domain';
import { useApp } from '../state/AppData';
import { BREEDS } from '../content/breeds';
import { Chips, Field, Sheet } from './ui';
import { compressImage } from './helpers';
import { isDateKey } from '../logic/dates';

const STATUS: { value: BirdStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'rehomed', label: 'Rehomed' },
  { value: 'deceased', label: 'Deceased' },
];

export default function BirdForm({ bird, onDone }: { bird?: Bird; onDone(saved?: Bird): void }) {
  const { data, activeFlockId, save, today, toast } = useApp();
  const knownBreed = bird?.breed && BREEDS.includes(bird.breed);
  const [name, setName] = useState(bird?.name ?? '');
  const [breed, setBreed] = useState<string | undefined>(bird?.breed ? (knownBreed ? bird.breed : 'Other') : undefined);
  const [otherBreed, setOtherBreed] = useState(bird?.breed && !knownBreed ? bird.breed : '');
  const [breedOpen, setBreedOpen] = useState(false);
  const [hatchDate, setHatchDate] = useState(bird?.hatchDate ?? '');
  const [color, setColor] = useState(bird?.color ?? '');
  const [photo, setPhoto] = useState<string | undefined>(bird?.photo);
  const [status, setStatus] = useState<BirdStatus>(bird?.status ?? 'active');
  const [flockId, setFlockId] = useState(bird?.flockId ?? activeFlockId ?? data.flocks[0]?.id ?? '');
  const [notes, setNotes] = useState(bird?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
      setErrors((e) => ({ ...e, photo: '' }));
    } catch (err) {
      setErrors((e) => ({ ...e, photo: err instanceof Error ? err.message : 'Could not use that photo.' }));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Every hen needs a name.';
    if (hatchDate && !isDateKey(hatchDate)) next.hatchDate = 'Use a valid date.';
    else if (hatchDate && hatchDate > today) next.hatchDate = 'Hatch date cannot be in the future.';
    if (!flockId) next.flock = 'Pick a flock.';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      const finalBreed = breed === 'Other' ? otherBreed.trim() || undefined : breed;
      const saved = await save('birds', {
        ...(bird ?? {}),
        flockId, name: name.trim(), breed: finalBreed, hatchDate: hatchDate || undefined, color: color.trim() || undefined,
        photo, status, notes: notes.trim() || undefined,
      } as Bird);
      toast(bird ? 'Hen updated' : `${saved.name} joined the flock`);
      onDone(saved);
    } catch {
      setErrors({ form: 'Could not save. Your device storage may be full; try a smaller photo.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field photo-pick">
        <div className="avatar lg" aria-hidden="true">{photo ? <img src={photo} alt="" /> : '🐔'}</div>
        <div className="stack">
          <label className="btn small">
            {photo ? 'Change photo' : 'Add photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} aria-label="Hen photo" />
          </label>
          {photo && <button type="button" className="link-btn" onClick={() => setPhoto(undefined)}>Remove photo</button>}
        </div>
      </div>
      {errors.photo && <p className="error-text" role="alert">{errors.photo}</p>}
      <Field label="Name" error={errors.name}>
        {(id, d) => <input id={id} aria-describedby={d} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />}
      </Field>
      <div className="field">
        <span className="label" id="breed-label">Breed</span>
        <button type="button" className="input" style={{ textAlign: 'left', cursor: 'pointer' }} id="breed-btn" aria-labelledby="breed-label breed-btn" aria-haspopup="dialog" onClick={() => setBreedOpen(true)}>
          {breed ? (breed === 'Other' ? `Other${otherBreed ? `: ${otherBreed}` : ''}` : breed) : <span className="muted">Choose a breed</span>}
        </button>
      </div>
      {breed === 'Other' && (
        <Field label="Breed name">
          {(id) => <input id={id} className="input" value={otherBreed} onChange={(e) => setOtherBreed(e.target.value)} maxLength={40} />}
        </Field>
      )}
      <Sheet open={breedOpen} title="Choose a breed" onClose={() => setBreedOpen(false)}>
        <div className="chips" role="radiogroup" aria-label="Breed">
          {[...BREEDS, 'Other'].map((b) => (
            <button key={b} type="button" role="radio" aria-checked={breed === b} className={'chip' + (breed === b ? ' on' : '')} onClick={() => { setBreed(b); setBreedOpen(false); }}>{b}</button>
          ))}
        </div>
      </Sheet>
      <Field label="Hatch date" hint="Optional. Used to show her age." error={errors.hatchDate}>
        {(id, d) => <input id={id} aria-describedby={d} type="date" className="input" value={hatchDate} max={today} onChange={(e) => setHatchDate(e.target.value)} />}
      </Field>
      <Field label="Color and markings">
        {(id) => <input id={id} className="input" value={color} onChange={(e) => setColor(e.target.value)} maxLength={60} placeholder="Golden buff, black tail" />}
      </Field>
      {data.flocks.length > 1 && (
        <Chips label="Flock" value={flockId} options={data.flocks.map((f) => ({ value: f.id, label: f.name }))} onChange={setFlockId} />
      )}
      <Chips label="Status" value={status} options={STATUS} onChange={setStatus} />
      <Field label="Notes">
        {(id) => <textarea id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />}
      </Field>
      {errors.form && <p className="error-text" role="alert">{errors.form}</p>}
      <div className="row gap">
        <button type="button" className="btn ghost grow" onClick={() => onDone()}>Cancel</button>
        <button type="submit" className="btn primary grow" disabled={busy}>{busy ? 'Saving…' : bird ? 'Save changes' : 'Add hen'}</button>
      </div>
    </form>
  );
}
