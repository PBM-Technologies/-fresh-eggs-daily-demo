import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { createHousehold, parseBackup, restoreBackup } from '../data/service';
import { EggLogo } from '../components/Icons';
import { Field } from '../components/ui';
import { navigate } from '../router';

export default function Onboarding() {
  const { adapter, today, reload } = useApp();
  const [household, setHousehold] = useState('');
  const [flock, setFlock] = useState('');
  const [errors, setErrors] = useState<{ household?: string; flock?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!household.trim()) next.household = 'Give your household a name.';
    else if (household.trim().length > 60) next.household = 'Keep it under 60 characters.';
    if (!flock.trim()) next.flock = 'Give your first flock a name.';
    else if (flock.trim().length > 60) next.flock = 'Keep it under 60 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await createHousehold(adapter, household, flock, today);
      await reload();
      navigate('/', true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not save. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const b = parseBackup(await file.text());
      await restoreBackup(adapter, b);
      await reload();
      navigate('/', true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not import that file.' });
    }
  }

  return (
    <main style={{ paddingBottom: 40 }}>
      <div className="card hero center" style={{ marginTop: 12 }}>
        <div style={{ width: 72, height: 72, margin: '0 auto 8px' }}><EggLogo /></div>
        <h1 style={{ color: '#fff' }}>Welcome to Fresh Eggs Daily</h1>
        <p className="muted" style={{ marginTop: 8 }}>Track your hens, eggs, chores, care, feed and hatches. Free, private and saved on this device.</p>
      </div>
      <form className="card" onSubmit={submit} noValidate aria-labelledby="ob-title">
        <h2 id="ob-title" style={{ marginBottom: 14 }}>Let's set up your coop</h2>
        <Field label="Household name" hint="For example, The Millers or Maple Street Farm" error={errors.household}>
          {(id, d) => <input id={id} aria-describedby={d} className="input" value={household} onChange={(e) => setHousehold(e.target.value)} autoComplete="off" maxLength={80} />}
        </Field>
        <Field label="First flock name" hint="You can add more flocks later" error={errors.flock}>
          {(id, d) => <input id={id} aria-describedby={d} className="input" value={flock} onChange={(e) => setFlock(e.target.value)} placeholder="Backyard girls" autoComplete="off" maxLength={80} />}
        </Field>
        {errors.form && <p className="error-text" role="alert">{errors.form}</p>}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Start my flock'}</button>
        <p className="hint center" style={{ marginTop: 12 }}>No account or password needed. Your data stays in this browser until you export it.</p>
      </form>
      <div className="center">
        <label className="link-btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
          Restore from a backup file
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importFile(e.target.files?.[0])} />
        </label>
      </div>
    </main>
  );
}
