import { useMemo, useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Empty, Page, Pill } from '../components/ui';
import { Chevron } from '../components/Icons';
import { EggDot, Meter } from '../components/PhotoCheck';
import { breedBySlug, EGG_COLORS, eggColorHex, eggColorLabel, findBreed, GUIDE_BREEDS } from '../content/breeds';
import { recommendBreeds, type Climate, type Goal, type RecommendPrefs, type Space } from '../logic/recommend';
import { Link } from '../router';
import type { Breed, EggColor } from '../contracts/domain';

type TraitFilter = 'cold' | 'heat' | 'beginner' | 'kids' | 'broody' | 'bantam';
const TRAIT_FILTERS: { value: TraitFilter; label: string; test(b: Breed): boolean }[] = [
  { value: 'cold', label: 'Cold hardy', test: (b) => b.coldHardy === 3 },
  { value: 'heat', label: 'Heat tolerant', test: (b) => b.heatTolerant === 3 },
  { value: 'beginner', label: 'Beginner friendly', test: (b) => b.goodForBeginners },
  { value: 'kids', label: 'Good with kids', test: (b) => b.goodWithKids },
  { value: 'broody', label: 'Broody', test: (b) => b.broody === 'high' },
  { value: 'bantam', label: 'Bantam', test: (b) => b.bantamAvailable || b.bodySize === 'bantam only' },
];

/** Two short traits for list rows. */
export function rowTraits(b: Breed): string[] {
  const t: string[] = [];
  if (b.temperament === 'calm' || b.temperament === 'friendly') t.push(b.temperament === 'calm' ? 'Calm' : 'Friendly');
  if (b.coldHardy === 3) t.push('Cold hardy');
  if (b.heatTolerant === 3) t.push('Heat tolerant');
  if (b.broody === 'high') t.push('Broody');
  if (b.temperament === 'active' || b.temperament === 'flighty') t.push(b.temperament === 'active' ? 'Active' : 'Flighty');
  if (b.bodySize === 'bantam only') t.unshift('Bantam');
  return t.slice(0, 2);
}

export default function Breeds() {
  const [q, setQ] = useState('');
  const [color, setColor] = useState<EggColor | 'any'>('any');
  const [traits, setTraits] = useState<TraitFilter[]>([]);
  const needle = q.trim().toLowerCase();
  const list = GUIDE_BREEDS.filter((b) =>
    (!needle || (b.name + ' ' + (b.aliases ?? []).join(' ') + ' ' + b.origin).toLowerCase().includes(needle)) &&
    (color === 'any' || b.eggColor === color) &&
    traits.every((t) => TRAIT_FILTERS.find((f) => f.value === t)!.test(b))
  ).sort((a, b) => a.name.localeCompare(b.name));
  const toggle = (t: TraitFilter) => setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <Page title="Breed guide" subtitle={`${GUIDE_BREEDS.length} breeds and what to add next`}>
      <Recommender />
      <h2 className="section-title" id="all-breeds">All breeds</h2>
      <div className="field">
        <label className="sr-only" htmlFor="breed-q">Search breeds</label>
        <input id="breed-q" className="input" type="search" placeholder="Search: Orpington, blue eggs, France…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips scroll" role="radiogroup" aria-label="Egg color" style={{ marginBottom: 8 }}>
        <button type="button" role="radio" aria-checked={color === 'any'} className={'chip' + (color === 'any' ? ' on' : '')} onClick={() => setColor('any')}>Any egg color</button>
        {EGG_COLORS.map((c) => (
          <button key={c.value} type="button" role="radio" aria-checked={color === c.value} className={'chip' + (color === c.value ? ' on' : '')} onClick={() => setColor(c.value)}>
            <EggDot hex={c.hex} /> {c.label}
          </button>
        ))}
      </div>
      <div className="chips scroll" role="group" aria-label="Traits" style={{ marginBottom: 14 }}>
        {TRAIT_FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={traits.includes(f.value)} className={'chip' + (traits.includes(f.value) ? ' on' : '')} onClick={() => toggle(f.value)}>{f.label}</button>
        ))}
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty icon="🔍" title="No breeds match" action={<button className="btn" onClick={() => { setQ(''); setColor('any'); setTraits([]); }}>Clear filters</button>}>Try fewer filters.</Empty>
        ) : (
          <ul className="list" aria-label="Breeds">
            {list.map((b) => (
              <li key={b.slug}>
                <Link to={`/breeds/${b.slug}`} className="item">
                  <EggDot hex={eggColorHex(b.eggColor)} label={`${eggColorLabel(b.eggColor)} eggs`} />
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block' }}>{b.name}</span>
                    <span className="item-sub">{b.eggsPerYear[0]} to {b.eggsPerYear[1]} eggs/yr · {rowTraits(b).join(' · ')}</span>
                  </span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="small muted">Egg counts are typical estimates for a healthy young hen. Every bird and line is a little different.</p>
    </Page>
  );
}

const CLIMATES: { value: Climate; label: string; emoji: string }[] = [
  { value: 'cold', label: 'Cold winters', emoji: '❄️' }, { value: 'hot', label: 'Hot summers', emoji: '☀️' },
  { value: 'both', label: 'Both', emoji: '🌡️' }, { value: 'mild', label: 'Mild', emoji: '🌤️' },
];
const GOALS: { value: Goal; label: string; emoji: string }[] = [
  { value: 'eggs', label: 'More eggs', emoji: '🥚' }, { value: 'colors', label: 'Egg basket colors', emoji: '🎨' },
  { value: 'kids', label: 'Pets and kids', emoji: '🧒' }, { value: 'broody', label: 'Broody hens to hatch', emoji: '🐣' },
  { value: 'rare', label: 'Rare and pretty', emoji: '✨' },
];
const SPACES: { value: Space; label: string }[] = [{ value: 'small', label: 'Small backyard, confined' }, { value: 'free', label: 'Free range' }];

function Recommender() {
  const { data } = useApp();
  const [climate, setClimate] = useState<Climate | undefined>();
  const [goal, setGoal] = useState<Goal | undefined>();
  const [space, setSpace] = useState<Space | undefined>();
  const ready = climate && goal && space;
  const prefs: RecommendPrefs | null = ready ? { climate, goal, space } : null;
  const recs = useMemo(() => (prefs ? recommendBreeds(prefs, data.birds) : []), [prefs?.climate, prefs?.goal, prefs?.space, data.birds]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title="What to add next" className="recommender">
      <p className="small muted" style={{ marginTop: -6 }}>Three quick taps. We match breeds to your setup and the hens you already have.</p>
      <Chips label="Your climate" value={climate} onChange={setClimate} options={CLIMATES} />
      <Chips label="Your main goal" value={goal} onChange={setGoal} options={GOALS} />
      <Chips label="Your space" value={space} onChange={setSpace} options={SPACES} />
      {!ready ? (
        <p className="small muted" style={{ margin: 0 }}>Pick one of each to see your top 5.</p>
      ) : (
        <ol className="recs" aria-label="Recommended breeds">
          {recs.map((r, i) => (
            <li key={r.breed.slug}>
              <Link to={`/breeds/${r.breed.slug}`} className="rec">
                <span className="rec-rank" aria-hidden="true">{i + 1}</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block' }}>{r.breed.name} <EggDot hex={eggColorHex(r.breed.eggColor)} label={`${eggColorLabel(r.breed.eggColor)} eggs`} /></span>
                  <span className="small muted" style={{ display: 'block' }}>Why this fits you</span>
                  <ul className="why">{r.reasons.map((x, j) => <li key={j}>{x}</li>)}</ul>
                </span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const BOOL = (v: boolean) => (v ? 'Yes' : 'No');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function BreedDetail({ slug }: { slug: string }) {
  const { data } = useApp();
  const b = breedBySlug(slug);
  if (!b) {
    return (
      <Page title="Breed not found" back="/breeds">
        <Card><Empty icon="🐔" title="We do not have that breed yet" action={<Link to="/breeds" className="btn primary">All breeds</Link>} /></Card>
      </Page>
    );
  }
  const hens = data.birds.filter((x) => x.status === 'active' && findBreed(x.breed)?.slug === b.slug);
  const lvl = (n: 1 | 2 | 3) => (n === 3 ? 3 : n === 2 ? 2 : 1) as 1 | 2 | 3;
  const broodyLvl = (b.broody === 'high' ? 3 : b.broody === 'medium' ? 2 : 1) as 1 | 2 | 3;
  return (
    <Page title={b.name} back="/breeds" subtitle={`${b.origin} · ${cap(b.purpose === 'dual' ? 'dual purpose' : b.purpose === 'eggs' ? 'egg layer' : b.purpose)}`}>
      <Card>
        <div className="row gap" style={{ marginBottom: 10 }}>
          <EggDot big hex={eggColorHex(b.eggColor)} />
          <div>
            <p style={{ fontWeight: 800, margin: 0 }}>{eggColorLabel(b.eggColor)} eggs</p>
            <p className="small muted" style={{ margin: 0 }}>{b.eggsPerYear[0]} to {b.eggsPerYear[1]} a year · {b.eggSize}</p>
          </div>
        </div>
        <p style={{ margin: 0 }}>{b.description}</p>
      </Card>
      {hens.length > 0 && (
        <Card className="soft" title="Hens in your flock of this breed">
          <ul className="list">
            {hens.map((h) => (
              <li key={h.id}><Link to={`/flock/${h.id}`} className="item">
                <span className="avatar" aria-hidden="true">{h.photo ? <img src={h.photo} alt="" /> : '🐔'}</span>
                <span className="item-main"><span className="item-title" style={{ display: 'block' }}>{h.name}</span><span className="item-sub">{h.breed}</span></span>
                <Chevron />
              </Link></li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="At a glance">
        <table className="facts-table">
          <tbody>
            <tr><th scope="row">Cold hardy</th><td><Meter value={lvl(b.coldHardy)} label="Cold hardy" /></td></tr>
            <tr><th scope="row">Heat tolerant</th><td><Meter value={lvl(b.heatTolerant)} label="Heat tolerant" /></td></tr>
            <tr><th scope="row">Goes broody</th><td><Meter value={broodyLvl} label="Goes broody" /></td></tr>
            <tr><th scope="row">Forager</th><td><Meter value={lvl(b.foraging)} label="Forager" /></td></tr>
            <tr><th scope="row">Temperament</th><td>{cap(b.temperament)}</td></tr>
            <tr><th scope="row">Body size</th><td>{cap(b.bodySize)}{b.bodySize !== 'bantam only' ? (b.bantamAvailable ? ', bantam available' : '') : ''}</td></tr>
            <tr><th scope="row">Beginner friendly</th><td>{BOOL(b.goodForBeginners)}</td></tr>
            <tr><th scope="row">Good with kids</th><td>{BOOL(b.goodWithKids)}</td></tr>
            <tr><th scope="row">Fine in a run</th><td>{BOOL(b.confinementTolerant)}</td></tr>
            <tr><th scope="row">Feathered feet</th><td>{BOOL(b.featherFeet)}</td></tr>
            <tr><th scope="row">Crest or beard</th><td>{BOOL(b.crestOrBeard)}</td></tr>
            {b.aliases?.length ? <tr><th scope="row">Also called</th><td>{b.aliases.join(', ')}</td></tr> : null}
          </tbody>
        </table>
      </Card>
      <Card title="Good to know">
        <ul className="bullets">{b.goodToKnow.map((g, i) => <li key={i}>{g}</li>)}</ul>
      </Card>
      <div className="notice info" role="note">🐣 Find chicks or hatching eggs at a local farm store. Spring is the busiest season, so ask early.</div>
      <div className="row gap wrap">
        <Link to="/identify" className="btn grow">Identify from a photo</Link>
        <Link to="/breeds" className="btn grow">All breeds</Link>
      </div>
      {hens.length === 0 && <p className="small muted" style={{ marginTop: 10 }}><Pill>Tip</Pill> Add a hen with this breed and she will show up here.</p>}
    </Page>
  );
}
