import { useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Page } from '../components/ui';
import { useWeather } from '../data/weather';
import { AlertList, ForecastStrip, PlacePicker, ProductPicks, useAlerts } from '../components/Seasonal';
import { SEASON_TIPS, seasonOf } from '../logic/seasonal';

const SEASON_EMOJI = { winter: '❄️', spring: '🌱', summer: '☀️', fall: '🍂' } as const;

export default function Weather() {
  const { today } = useApp();
  const w = useWeather();
  const alerts = useAlerts(w.days);
  const [changing, setChanging] = useState(false);
  const season = seasonOf(today);
  const s = SEASON_TIPS[season];

  return (
    <Page title="Weather & season" subtitle="What the forecast means for your flock">
      <Card title={w.place && !changing ? w.place.name : 'Your coop location'}
        action={w.place && !changing ? <button className="link-btn" onClick={() => setChanging(true)}>Change</button> : undefined}>
        {!w.place || changing ? (
          <>
            <p className="small muted">Your location stays on this device and is only used to get the forecast.</p>
            <PlacePicker onPick={(p) => { w.setPlace(p); setChanging(false); }} />
            {w.place && <button className="link-btn" onClick={() => setChanging(false)}>Cancel</button>}
          </>
        ) : w.status === 'error' ? (
          <div className="stack"><p className="error-text" role="alert">{w.error}</p><button className="btn" onClick={() => void w.refresh()}>Try again</button></div>
        ) : w.days.length ? (
          <ForecastStrip days={w.days} today={today} />
        ) : <p className="small muted">Loading the forecast…</p>}
      </Card>

      {w.place && w.days.length > 0 && (
        <Card title="Flock alerts">
          <AlertList alerts={alerts} />
        </Card>
      )}

      <Card className="season" title={<>{SEASON_EMOJI[season]} {season[0].toUpperCase() + season.slice(1)}: {s.headline}</>}>
        <ul className="tips">
          {s.tips.map((t) => <li key={t.title}><strong>{t.title}.</strong> <span className="muted">{t.detail}</span></li>)}
        </ul>
      </Card>

      <Card title="Picked for your flock" action={<span className="small muted">Fresh Eggs Daily</span>}>
        <ProductPicks alerts={alerts} limit={4} />
      </Card>
    </Page>
  );
}
