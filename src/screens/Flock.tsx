import { useEffect, useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Chips, Empty, Page, Pill, Sheet } from '../components/ui';
import BirdForm from '../components/BirdForm';
import FlockPicker from '../components/FlockPicker';
import { Chevron } from '../components/Icons';
import { Link, navigate, useRoute } from '../router';
import { ageLabel } from '../logic/dates';
import { birdEggTotal } from '../logic/eggs';
import { inQuarantine } from '../logic/care';
import type { BirdStatus } from '../contracts/domain';

type Filter = 'active' | 'all' | Exclude<BirdStatus, 'active'>;

export default function FlockScreen() {
  const { data, today, activeFlockId } = useApp();
  const route = useRoute();
  const [adding, setAdding] = useState(route.query.get('add') === '1');
  const [filter, setFilter] = useState<Filter>('active');
  useEffect(() => { if (route.query.get('add') === '1') setAdding(true); }, [route.query]);
  const flock = data.flocks.find((f) => f.id === activeFlockId);
  const inFlock = data.birds.filter((b) => b.flockId === activeFlockId);
  const birds = inFlock.filter((b) => filter === 'all' || b.status === filter).sort((a, b) => a.name.localeCompare(b.name));
  const close = () => { setAdding(false); if (route.query.get('add')) navigate('/flock', true); };

  return (
    <Page title="My flock" subtitle={flock ? `${flock.name} · ${inFlock.filter((b) => b.status === 'active').length} active` : undefined}
      action={<button className="btn primary small" onClick={() => setAdding(true)}>+ Add hen</button>}>
      <FlockPicker />
      {inFlock.length > 0 && (
        <Chips label="Show" hideLabel value={filter} onChange={setFilter} options={[
          { value: 'active', label: 'Active' }, { value: 'all', label: 'All' }, { value: 'rehomed', label: 'Rehomed' }, { value: 'deceased', label: 'Deceased' },
        ]} />
      )}
      <Card>
        {inFlock.length === 0 ? (
          <Empty icon="🐔" title="No hens yet" action={<button className="btn primary" onClick={() => setAdding(true)}>Add your first hen</button>}>
            Add each hen with her breed, hatch date and a photo.
          </Empty>
        ) : birds.length === 0 ? (
          <Empty icon="🔍" title="Nobody here">No hens match this filter.</Empty>
        ) : (
          <ul className="list">
            {birds.map((b) => {
              const age = ageLabel(b.hatchDate, today);
              return (
                <li key={b.id}>
                  <Link to={`/flock/${b.id}`} className="item">
                    <span className="avatar" aria-hidden="true">{b.photo ? <img src={b.photo} alt="" /> : '🐔'}</span>
                    <span className="item-main">
                      <span className="item-title" style={{ display: 'block' }}>{b.name}</span>
                      <span className="item-sub">{[b.breed, age].filter(Boolean).join(' · ') || 'No details yet'}</span>
                    </span>
                    {b.status !== 'active' && <Pill>{b.status === 'rehomed' ? 'Rehomed' : 'Deceased'}</Pill>}
                    {inQuarantine(data.bird_health_events, b.id, today) && <Pill tone="warn">Quarantine</Pill>}
                    <span className="item-end small muted">{birdEggTotal(data.egg_collections, b.id)} 🥚</span>
                    <Chevron />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="row gap wrap">
        <Link to="/identify?from=flock" className="btn grow">📷 Identify a breed</Link>
        <Link to="/breeds" className="btn grow">🐓 Breed guide</Link>
      </div>
      <Sheet open={adding} title="Add a hen" onClose={close}>
        <BirdForm onDone={close} />
      </Sheet>
    </Page>
  );
}
