import { useState, type FormEvent } from 'react';
import { useApp } from '../state/AppData';
import { Card, Confirm, Field, Page, Pill, Sheet } from '../components/ui';
import { buildBackup, costsCsv, deleteEverything, eggsCsv, parseBackup, restoreBackup, salesCsv } from '../data/service';
import { downloadText } from '../components/helpers';
import { Link, navigate } from '../router';
import type { Flock } from '../contracts/domain';

export default function Account() {
  const { data, adapter, save, remove, reload, toast, activeFlockId, setActiveFlockId, today } = useApp();
  const [name, setName] = useState(data.household?.name ?? '');
  const [flockEdit, setFlockEdit] = useState<Flock | 'new' | null>(null);
  const [flockDel, setFlockDel] = useState<Flock | null>(null);
  const [wipe, setWipe] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const [importErr, setImportErr] = useState('');
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);
  const stamp = today;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!data.household || !name.trim()) return;
    await adapter.profile.saveHousehold({ ...data.household, name: name.trim(), updatedAt: new Date().toISOString() });
    await reload();
    toast('Household name saved');
  }
  function exportJson() {
    try {
      downloadText(`fresh-eggs-daily-backup-${stamp}.json`, JSON.stringify(buildBackup(data), null, 2), 'application/json');
      toast('Backup downloaded');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed');
    }
  }
  async function onImport(file: File | undefined) {
    setImportErr('');
    if (!file) return;
    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Could not read that file.');
    }
  }
  async function doImport() {
    if (!pendingImport) return;
    await restoreBackup(adapter, pendingImport);
    setPendingImport(null);
    await reload();
    toast('Backup restored');
  }
  async function doWipe() {
    await deleteEverything(adapter);
    try { window.localStorage.removeItem('fed:ui:activeFlock'); } catch { /* ignore */ }
    await reload();
    navigate('/', true);
  }
  const birdsIn = (id: string) => data.birds.filter((b) => b.flockId === id).length;

  return (
    <Page title="Account" subtitle="Your household, flocks and data">
      <form className="card" onSubmit={(e) => void saveName(e)}>
        <Field label="Household name">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
        <button className="btn primary" type="submit" disabled={!name.trim() || name.trim() === data.household?.name}>Save name</button>
      </form>

      <Card title="Flocks" action={<button className="btn small" onClick={() => setFlockEdit('new')}>+ Flock</button>}>
        <ul className="list">
          {data.flocks.map((f) => (
            <li key={f.id} className="item">
              <span className="item-main">
                <span className="item-title" style={{ display: 'block' }}>{f.name}</span>
                <span className="item-sub">{birdsIn(f.id)} birds{f.coopName ? ` · ${f.coopName}` : ''}</span>
              </span>
              {f.id === activeFlockId ? <Pill tone="good">Current</Pill> : <button className="btn small ghost" onClick={() => setActiveFlockId(f.id)}>Use</button>}
              <button className="btn small ghost" onClick={() => setFlockEdit(f)} aria-label={`Edit ${f.name}`}>Edit</button>
            </li>
          ))}
        </ul>
      </Card>

      <Members />

      <Link to="/spending" className="card cta-card">
        <span className="cta-emoji" aria-hidden="true">💰</span>
        <span className="item-main"><strong style={{ display: 'block' }}>Flock spending</strong><span className="small muted">Monthly costs, cost per hen and net after egg sales</span></span>
      </Link>

      <Card title="Your data">
        <p className="small muted">Everything is saved in this browser on this device{adapter.persistent ? '' : '. Storage is blocked here, so data lasts only until you close this tab. Export a backup to keep it'}. Export a backup regularly, especially before clearing your browser.</p>
        {!adapter.persistent && <div className="notice" role="alert">Browser storage is unavailable. Your changes will be lost when this tab closes.</div>}
        <div className="stack">
          <button className="btn primary block" onClick={exportJson}>Download full backup (JSON)</button>
          <div className="grid3">
            <button className="btn small" onClick={() => downloadText(`fed-eggs-${stamp}.csv`, eggsCsv(data), 'text/csv')}>Eggs CSV</button>
            <button className="btn small" onClick={() => downloadText(`fed-sales-${stamp}.csv`, salesCsv(data), 'text/csv')}>Sales CSV</button>
            <button className="btn small" onClick={() => downloadText(`fed-costs-${stamp}.csv`, costsCsv(data), 'text/csv')}>Costs CSV</button>
          </div>
          <label className="btn block">
            Restore from backup
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {importErr && <p className="error-text" role="alert">{importErr}</p>}
        </div>
      </Card>

      <Card title="Danger zone">
        <p className="small muted">Delete every flock, hen, log and setting on this device.</p>
        <button className="btn danger block" onClick={() => setWipe(true)}>Delete all data</button>
      </Card>
      <p className="small muted center">Fresh Eggs Daily app preview · data stays on your device · no account required</p>

      <Sheet open={!!flockEdit} title={flockEdit === 'new' ? 'New flock' : 'Edit flock'} onClose={() => setFlockEdit(null)}>
        {flockEdit && (
          <FlockForm key={flockEdit === 'new' ? 'n' : flockEdit.id} flock={flockEdit === 'new' ? undefined : flockEdit}
            canDelete={data.flocks.length > 1}
            onDelete={(f) => { setFlockEdit(null); setFlockDel(f); }}
            onSave={async (f) => { const saved = await save('flocks', f); if (flockEdit === 'new') setActiveFlockId(saved.id); toast('Flock saved'); setFlockEdit(null); }}
            onCancel={() => setFlockEdit(null)} />
        )}
      </Sheet>
      <Confirm open={!!flockDel} onClose={() => setFlockDel(null)} danger confirmLabel="Delete flock" title={`Delete ${flockDel?.name}?`}
        body={`This deletes the flock and its ${flockDel ? birdsIn(flockDel.id) : 0} birds and their egg logs. This cannot be undone.`}
        onConfirm={() => {
          const f = flockDel; if (!f) return;
          void (async () => {
            for (const b of data.birds.filter((x) => x.flockId === f.id)) await remove('birds', b.id);
            for (const l of data.egg_collections.filter((x) => x.flockId === f.id)) await remove('egg_collections', l.id);
            for (const h of data.bird_health_events.filter((x) => x.flockId === f.id)) await remove('bird_health_events', h.id);
            await remove('flocks', f.id);
            toast('Flock deleted');
          })();
        }} />
      <Confirm open={!!pendingImport} onClose={() => setPendingImport(null)} confirmLabel="Replace my data" danger title="Restore this backup?"
        body={pendingImport ? `This replaces everything on this device with the backup for "${pendingImport.household.name}" (${pendingImport.collections.birds.length} birds, ${pendingImport.collections.egg_collections.length} egg logs).` : ''}
        onConfirm={() => void doImport()} />
      <Sheet open={wipe} title="Delete all data?" onClose={() => { setWipe(false); setWipeText(''); }}>
        <p className="muted">This permanently removes your household, flocks, hens, egg logs, sales, costs, chores, feedings, treats, care, feed and hatch records from this device. Download a backup first if you might want them later.</p>
        <Field label='Type DELETE to confirm'>{(id) => <input id={id} className="input" value={wipeText} onChange={(e) => setWipeText(e.target.value)} autoComplete="off" autoCapitalize="characters" />}</Field>
        <div className="row gap">
          <button className="btn ghost grow" onClick={() => { setWipe(false); setWipeText(''); }}>Cancel</button>
          <button className="btn danger grow" disabled={wipeText.trim().toUpperCase() !== 'DELETE'} onClick={() => void doWipe()}>Delete everything</button>
        </div>
      </Sheet>
    </Page>
  );
}

function Members() {
  const { data, save, remove, toast } = useApp();
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const members = [...data.household_people].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  async function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr('Enter a name.');
    if (members.some((m) => m.name.toLowerCase() === n.toLowerCase())) return setErr('That name is already on the list.');
    await save('household_people', { name: n });
    setName(''); setErr('');
    toast(`${n} added`);
  }
  return (
    <Card title="Household members">
      <p className="small muted">Names only, so you can see who did each feeding. No accounts or emails.</p>
      {members.length > 0 && (
        <ul className="list" style={{ marginBottom: 12 }} aria-label="Household members">
          {members.map((m) => (
            <li key={m.id} className="item">
              <span className="avatar" aria-hidden="true" style={{ width: 40, height: 40, fontSize: '1rem', fontWeight: 800 }}>{m.name.slice(0, 1).toUpperCase()}</span>
              <span className="item-main"><span className="item-title">{m.name}</span></span>
              <button className="btn small ghost" onClick={() => void remove('household_people', m.id)} aria-label={`Remove ${m.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="row gap" style={{ alignItems: 'flex-start' }} onSubmit={(e) => void add(e)} noValidate>
        <div className="grow">
          <Field label="Add a member" error={err}>{(id, d) => <input id={id} aria-describedby={d} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="First name" autoComplete="off" />}</Field>
        </div>
        <button type="submit" className="btn primary" style={{ marginTop: 28 }}>Add</button>
      </form>
    </Card>
  );
}

function FlockForm({ flock, canDelete, onSave, onCancel, onDelete }: { flock?: Flock; canDelete: boolean; onSave(f: Flock): Promise<void>; onCancel(): void; onDelete(f: Flock): void }) {
  const [name, setName] = useState(flock?.name ?? '');
  const [coop, setCoop] = useState(flock?.coopName ?? '');
  const [notes, setNotes] = useState(flock?.notes ?? '');
  const [err, setErr] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return setErr('Name the flock.'); void onSave({ ...(flock ?? {}), name: name.trim(), coopName: coop.trim() || undefined, notes: notes.trim() || undefined } as Flock); }} noValidate>
      <Field label="Flock name" error={err}>{(id, d) => <input id={id} aria-describedby={d} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
      <Field label="Coop name (optional)">{(id) => <input id={id} className="input" value={coop} onChange={(e) => setCoop(e.target.value)} maxLength={60} placeholder="Big red coop" />}</Field>
      <Field label="Notes">{(id) => <textarea id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />}</Field>
      <div className="row gap"><button type="button" className="btn ghost grow" onClick={onCancel}>Cancel</button><button type="submit" className="btn primary grow">Save</button></div>
      {flock && canDelete && <button type="button" className="btn danger block" style={{ marginTop: 12 }} onClick={() => onDelete(flock)}>Delete flock</button>}
    </form>
  );
}
