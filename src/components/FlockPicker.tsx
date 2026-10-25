import { useApp } from '../state/AppData';

/** Tap-friendly flock switcher; hidden when there is only one flock. */
export default function FlockPicker({ allowAll, value, onChange }: { allowAll?: boolean; value?: string | 'all'; onChange?(id: string | 'all'): void }) {
  const { data, activeFlockId, setActiveFlockId } = useApp();
  if (data.flocks.length < 2) return null;
  const current = value ?? activeFlockId;
  const set = (id: string | 'all') => (onChange ? onChange(id) : id !== 'all' && setActiveFlockId(id));
  return (
    <div className="chips scroll" role="radiogroup" aria-label="Flock" style={{ marginBottom: 14 }}>
      {allowAll && (
        <button type="button" role="radio" aria-checked={current === 'all'} className={'chip' + (current === 'all' ? ' on' : '')} onClick={() => set('all')}>All flocks</button>
      )}
      {data.flocks.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={current === f.id} className={'chip' + (current === f.id ? ' on' : '')} onClick={() => set(f.id)}>{f.name}</button>
      ))}
    </div>
  );
}
