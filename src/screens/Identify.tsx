import { useEffect, useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Page, Pill } from '../components/ui';
import { EggDot, NoAiNote, PhotoPicker, Seg, Thinking, useCheck, useVisionAI, type Photo } from '../components/PhotoCheck';
import { birdPrompt, cleanBird, cleanEgg, eggPrompt } from '../ai/prompts';
import { eggColorHex, eggColorLabel, findBreed } from '../content/breeds';
import { Link, useRoute } from '../router';
import type { Bird, BirdIdResult, EggIdResult } from '../contracts/domain';

type Mode = 'bird' | 'egg';

export default function Identify() {
  const route = useRoute();
  const initial: Mode = route.query.get('mode') === 'egg' ? 'egg' : 'bird';
  return (
    <Page title="Identify" subtitle="Snap a bird or an egg and get a best guess" back={route.query.get('from') === 'flock' ? '/flock' : undefined}>
      <IdentifyPanel initialMode={initial} />
    </Page>
  );
}

/** The identifier body. Used on its own page and inside the hen form (with onUseBreed). */
export function IdentifyPanel({ initialMode = 'bird', onUseBreed }: { initialMode?: Mode; onUseBreed?(name: string): void }) {
  const { data } = useApp();
  const { ai, state, markOff } = useVisionAI();
  const [mode, setMode] = useState<Mode>(onUseBreed ? 'bird' : initialMode);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const bird = useCheck<BirdIdResult>(ai, markOff);
  const egg = useCheck<EggIdResult>(ai, markOff);
  const check = mode === 'bird' ? bird : egg;
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(m: Mode) {
    if (m === mode) return;
    bird.cancel(); egg.cancel(); bird.clear(); egg.clear();
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setMode(m);
  }
  function go() {
    const blobs = photos.map((p) => p.blob);
    if (mode === 'bird') void bird.run(birdPrompt(blobs.length), blobs, cleanBird);
    else void egg.run(eggPrompt(blobs.length), blobs, cleanEgg);
  }

  const noAi = state === 'none';
  return (
    <div>
      {!onUseBreed && <Seg label="What are you identifying?" value={mode} onChange={switchMode} options={[{ value: 'bird', label: '🐔 Bird' }, { value: 'egg', label: '🥚 Egg' }]} />}
      {noAi && <NoAiNote />}
      <Card>
        <p className="small muted" style={{ marginTop: 0 }}>
          {mode === 'bird'
            ? 'Photograph the whole bird from the side in daylight. A second close-up of the head, comb or legs helps.'
            : 'Set the egg on a plain white surface in daylight. Add a known egg next to it for size.'}
        </p>
        <PhotoPicker photos={photos} onChange={(p) => { setPhotos(p); check.clear(); }} disabled={noAi || state === 'checking' || check.thinking} />
        <button type="button" className="btn primary block" disabled={noAi || state !== 'ready' || photos.length === 0 || check.thinking} onClick={go}>
          {mode === 'bird' ? 'Identify this bird' : 'Identify this egg'}
        </button>
      </Card>
      {check.thinking && <Thinking onCancel={check.cancel} />}
      {check.error && <div className="notice" role="alert">{check.error}</div>}
      {mode === 'bird' && bird.result && <BirdResults r={bird.result} onUseBreed={onUseBreed} />}
      {mode === 'egg' && egg.result && <EggResults r={egg.result} birds={data.birds} />}
      <p className="small muted">Photo IDs are a best guess from what the camera can see. Many backyard birds are mixes.</p>
    </div>
  );
}

const CONF_TONE = { high: 'good', medium: 'info', low: undefined } as const;

function BirdResults({ r, onUseBreed }: { r: BirdIdResult; onUseBreed?(name: string): void }) {
  if (!r.isChicken) {
    return <Card title="Hmm, that may not be a chicken"><p>{r.notes || 'We could not find a chicken in that photo. Try a clearer shot of the whole bird.'}</p></Card>;
  }
  return (
    <section aria-label="Identification results">
      <h2 className="section-title">Best matches</h2>
      {r.topMatches.length === 0 && <Card><p>No confident match. {r.notes}</p></Card>}
      {r.topMatches.map((m, i) => {
        const guide = findBreed(m.breed);
        return (
          <article key={i} className="card match">
            <div className="row gap between" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <p className="match-rank small muted">{i === 0 ? 'Top match' : `Match ${i + 1}`}</p>
                <h3>{guide?.name ?? m.breed}</h3>
              </div>
              <Pill tone={CONF_TONE[m.confidence]}>{m.confidence === 'high' ? 'High confidence' : m.confidence === 'medium' ? 'Medium confidence' : 'Low confidence'}</Pill>
            </div>
            {m.why && <p className="small" style={{ marginTop: 6 }}>{m.why}</p>}
            {guide && <p className="small muted" style={{ marginBottom: 0 }}><EggDot hex={eggColorHex(guide.eggColor)} /> {eggColorLabel(guide.eggColor)} eggs · {guide.eggsPerYear[0]} to {guide.eggsPerYear[1]} a year</p>}
            <div className="row gap wrap" style={{ marginTop: 10 }}>
              {onUseBreed && <button type="button" className="btn primary small" onClick={() => onUseBreed(guide?.name ?? m.breed)}>Use this breed</button>}
              {guide && <Link to={`/breeds/${guide.slug}`} className="btn small">Breed guide</Link>}
            </div>
          </article>
        );
      })}
      <Card className="soft">
        <dl className="facts">
          <dt>Looks like</dt><dd>{r.sex === 'hen' ? 'A hen' : r.sex === 'rooster' ? 'A rooster' : 'Hard to tell hen or rooster'}</dd>
          {r.ageGuess && (<><dt>Age guess</dt><dd>{r.ageGuess}</dd></>)}
        </dl>
        {r.notes && <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>{r.notes}</p>}
      </Card>
    </section>
  );
}

/** Active hens whose guide breed lays this color or is one of the likely breeds. */
export function possibleLayers(r: EggIdResult, birds: Bird[]): { bird: Bird; breedName: string }[] {
  const likely = new Set(r.likelyBreeds.map((l) => findBreed(l.breed)?.slug).filter(Boolean));
  const out: { bird: Bird; breedName: string }[] = [];
  for (const b of birds) {
    if (b.status !== 'active') continue;
    const br = findBreed(b.breed);
    if (br && (br.eggColor === r.eggColor || likely.has(br.slug))) out.push({ bird: b, breedName: b.breed ?? br.name });
  }
  return out;
}

function EggResults({ r, birds }: { r: EggIdResult; birds: Bird[] }) {
  const layers = possibleLayers(r, birds);
  return (
    <section aria-label="Egg results">
      <Card>
        <div className="row gap">
          <EggDot big hex={eggColorHex(r.eggColor)} />
          <div className="grow">
            <p className="small muted" style={{ margin: 0 }}>Shell color</p>
            <h3>{eggColorLabel(r.eggColor)}</h3>
            {r.sizeGuess !== 'unsure' && <p className="small muted" style={{ margin: 0 }}>Size looks {r.sizeGuess === 'pullet' ? 'like a pullet egg' : r.sizeGuess}</p>}
          </div>
        </div>
        <div className="notice info" role="note" style={{ margin: '12px 0 0' }}>
          Egg color narrows it to a group of breeds. It cannot prove which hen laid it.
        </div>
      </Card>
      {layers.length > 0 && (
        <Card className="soft" title="Could be from">
          <ul className="list">
            {layers.map(({ bird, breedName }) => (
              <li key={bird.id}>
                <Link to={`/flock/${bird.id}`} className="item">
                  <span className="avatar" aria-hidden="true">{bird.photo ? <img src={bird.photo} alt="" /> : '🐔'}</span>
                  <span className="item-main"><span className="item-title" style={{ display: 'block' }}>{bird.name} ({breedName})</span><span className="item-sub">In your flock</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {r.likelyBreeds.length > 0 && <h2 className="section-title">Breeds that lay eggs like this</h2>}
      {r.likelyBreeds.map((m, i) => {
        const guide = findBreed(m.breed);
        return (
          <article key={i} className="card match">
            <h3>{guide?.name ?? m.breed}</h3>
            {m.why && <p className="small" style={{ marginTop: 4 }}>{m.why}</p>}
            {guide && <Link to={`/breeds/${guide.slug}`} className="btn small">Breed guide</Link>}
          </article>
        );
      })}
      {r.notes && <Card className="soft"><p className="small" style={{ margin: 0 }}>{r.notes}</p></Card>}
    </section>
  );
}
