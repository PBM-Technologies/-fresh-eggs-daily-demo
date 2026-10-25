import { useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Field, Page, Pill } from '../components/ui';
import { NoAiNote, PhotoPicker, Thinking, useCheck, useVisionAI, type Photo } from '../components/PhotoCheck';
import { cleanHealth, healthPrompt, relatedArticles, SYMPTOMS } from '../ai/prompts';
import { ARTICLES } from '../content/articles';
import { Link, navigate, useRoute } from '../router';
import { addDays, ageLabel, isDateKey } from '../logic/dates';
import type { HealthCheckResult, Urgency } from '../contracts/domain';

const URGENCY: Record<Urgency, { title: string; body: string; cls: string; emoji: string }> = {
  urgent: { title: 'Urgent: call a vet today', body: 'Some signs here can get worse quickly. Separate her somewhere warm and quiet and reach a poultry vet now.', cls: 'urgent', emoji: '🚨' },
  soon: { title: 'Keep a close eye', body: 'Worth acting on in the next day or two. Look her over closely and start the care steps.', cls: 'soon', emoji: '⚠️' },
  routine: { title: 'Looks routine', body: 'Nothing here looks pressing. Keep watching and check again if anything changes.', cls: 'routine', emoji: '🌿' },
};
const LIKELY_TONE = { likely: 'warn', possible: 'info', 'less likely': undefined } as const;
export const DISCLAIMER = 'This is a photo check, not a diagnosis. When in doubt, call a poultry vet or your local extension office.';

export default function HealthCheck() {
  const { data, today } = useApp();
  const route = useRoute();
  const { ai, state, markOff } = useVisionAI();
  const hens = data.birds.filter((b) => b.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const [birdId, setBirdId] = useState(route.query.get('bird') ?? '');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const check = useCheck<HealthCheckResult>(ai, markOff);
  const bird = data.birds.find((b) => b.id === birdId);
  const noAi = state === 'none';

  function toggle(s: string) { setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])); check.clear(); }
  function go() {
    const ctx = bird ? [bird.breed, ageLabel(bird.hatchDate, today) ? `${ageLabel(bird.hatchDate, today)} old` : ''].filter(Boolean).join(', ') : undefined;
    void check.run(healthPrompt(photos.length, symptoms, ctx || undefined), photos.map((p) => p.blob), cleanHealth);
  }

  return (
    <Page title="Photo health check" subtitle={bird ? `Checking ${bird.name}` : 'Mites, bumblefoot, injuries and more'} back={bird ? `/flock/${bird.id}` : '/care'}>
      {noAi && <NoAiNote />}
      <Card>
        {hens.length > 0 && (
          <Chips label="Which bird?" value={birdId} onChange={(v) => { setBirdId(v); check.clear(); }} options={[{ value: '', label: 'Not sure or not listed' }, ...hens.map((h) => ({ value: h.id, label: h.name }))]} />
        )}
        <PhotoPicker photos={photos} onChange={(p) => { setPhotos(p); check.clear(); }} disabled={noAi || state === 'checking' || check.thinking}
          hint="Up to 3 photos. Close-ups help: feet for bumblefoot, under the wings and around the vent for mites and lice." />
        <div className="field">
          <span className="label" id="sym-label">Anything else you noticed? (optional)</span>
          <div className="chips" role="group" aria-labelledby="sym-label">
            {SYMPTOMS.map((s) => (
              <button key={s} type="button" className={'chip' + (symptoms.includes(s) ? ' on' : '')} aria-pressed={symptoms.includes(s)} onClick={() => toggle(s)}>{s}</button>
            ))}
          </div>
        </div>
        <button type="button" className="btn primary block" disabled={noAi || state !== 'ready' || photos.length === 0 || check.thinking} onClick={go}>Check this photo</button>
      </Card>
      {check.thinking && <Thinking onCancel={check.cancel} />}
      {check.error && <div className="notice" role="alert">{check.error}</div>}
      {check.result && <Results r={check.result} birdId={birdId} birdName={bird?.name} />}
      <p className="disclaimer small" role="note">{DISCLAIMER}</p>
    </Page>
  );
}

function Results({ r, birdId, birdName }: { r: HealthCheckResult; birdId: string; birdName?: string }) {
  const u = URGENCY[r.urgency];
  const articles = relatedArticles(r.possibleIssues.map((i) => i.name)).map((s) => ARTICLES.find((a) => a.slug === s)).filter((a): a is (typeof ARTICLES)[number] => !!a);
  return (
    <section aria-label="Health check results">
      <div className={'urgency ' + u.cls} role="status">
        <span className="urgency-emoji" aria-hidden="true">{u.emoji}</span>
        <div>
          <strong>{u.title}</strong>
          <p>{r.summary || u.body}</p>
        </div>
      </div>
      {!r.photoUsable && <div className="notice" role="note">The photo was hard to read, so these are rough guesses. A sharper close-up in daylight would help.</div>}
      {r.possibleIssues.map((iss, i) => (
        <article key={i} className="card issue">
          <div className="row gap between" style={{ alignItems: 'flex-start' }}>
            <h3 className="grow">{iss.name}</h3>
            <Pill tone={LIKELY_TONE[iss.likelihood]}>{iss.likelihood === 'likely' ? 'Likely' : iss.likelihood === 'possible' ? 'Possible' : 'Less likely'}</Pill>
          </div>
          {iss.signsSeen && (<><h4>What we noticed</h4><p className="small">{iss.signsSeen}</p></>)}
          {iss.checkAtHome.length > 0 && (<><h4>Check at home</h4><CheckList items={iss.checkAtHome} /></>)}
          {iss.careSteps.length > 0 && (<><h4>Care steps</h4><ul className="bullets small">{iss.careSteps.map((s, j) => <li key={j}>{s}</li>)}</ul></>)}
        </article>
      ))}
      {r.seeVetIf.length > 0 && (
        <Card title="See a vet if">
          <ul className="bullets small">{r.seeVetIf.map((s, j) => <li key={j}>{s}</li>)}</ul>
          <p className="small muted" style={{ marginBottom: 0 }}>Talk with a poultry vet or your extension office before giving any medicine. Sudden deaths or many sick birds should be reported to your state veterinarian or local extension office.</p>
        </Card>
      )}
      <SaveToLog r={r} birdId={birdId} birdName={birdName} />
      {articles.length > 0 && (
        <Card className="soft" title="Related guides">
          <ul className="list">
            {articles.map((a) => <li key={a.slug}><Link className="item" to={`/learn?a=${a.slug}`}><span className="item-main"><span className="item-title" style={{ display: 'block', whiteSpace: 'normal' }}>{a.title}</span></span></Link></li>)}
          </ul>
        </Card>
      )}
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  return (
    <div className="mini-checks">
      {items.map((t, i) => (
        <button key={i} type="button" role="checkbox" aria-checked={done[i]} className="check" onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}>
          <span className="box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" /></svg></span>
          <span className="item-main small">{t}</span>
        </button>
      ))}
    </div>
  );
}

function SaveToLog({ r, birdId, birdName }: { r: HealthCheckResult; birdId: string; birdName?: string }) {
  const { data, today, save, toast, activeFlockId } = useApp();
  const [remindOn, setRemindOn] = useState(addDays(today, 3));
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  async function submit() {
    if (remindOn && (!isDateKey(remindOn) || remindOn < today)) return setErr('Pick a follow-up date from today on.');
    const bird = data.birds.find((b) => b.id === birdId);
    const issues = r.possibleIssues.map((i) => i.name).join(', ');
    const notes = [`Photo check (${r.urgency}).`, r.summary, issues ? `Possible: ${issues}.` : ''].filter(Boolean).join(' ').slice(0, 1000);
    await save('bird_health_events', {
      flockId: bird?.flockId ?? activeFlockId ?? data.flocks[0]?.id ?? '', birdId: birdId || undefined, type: 'photo_check', occurredOn: today, notes, remindOn: remindOn || undefined,
    });
    setSaved(true);
    toast('Saved to health log');
  }
  if (saved) {
    return (
      <Card className="soft">
        <p style={{ fontWeight: 800, margin: 0 }}>Saved to the health log{birdName ? ` for ${birdName}` : ''}.</p>
        <div className="row gap wrap" style={{ marginTop: 10 }}>
          {birdId && <button type="button" className="btn small" onClick={() => navigate(`/flock/${birdId}`)}>Open {birdName}</button>}
          <Link to="/care" className="btn small">Care log</Link>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Save to health log">
      <p className="small muted" style={{ marginTop: -6 }}>Adds a photo check entry {birdName ? `for ${birdName}` : 'for the whole flock'} dated today with this summary.</p>
      <div className="field">
        <span className="label">Follow-up reminder</span>
        <div className="chips" style={{ marginBottom: 8 }}>
          {[{ l: 'Tomorrow', d: 1 }, { l: '3 days', d: 3 }, { l: '1 week', d: 7 }].map((o) => (
            <button type="button" key={o.d} className={'chip' + (remindOn === addDays(today, o.d) ? ' on' : '')} aria-pressed={remindOn === addDays(today, o.d)} onClick={() => setRemindOn(addDays(today, o.d))}>{o.l}</button>
          ))}
          <button type="button" className={'chip' + (!remindOn ? ' on' : '')} aria-pressed={!remindOn} onClick={() => setRemindOn('')}>No reminder</button>
        </div>
        <Field label="Follow-up date">{(id) => <input id={id} type="date" className="input" value={remindOn} min={today} onChange={(e) => setRemindOn(e.target.value)} />}</Field>
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button type="button" className="btn primary block" onClick={() => void submit()}>Save to health log</button>
    </Card>
  );
}
