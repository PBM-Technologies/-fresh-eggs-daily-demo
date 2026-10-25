import { IS_DEMO, resetDemo } from './data/demo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './state/AppData';
import { match, useRoute, Link } from './router';
import { EggLogo, IconBell, IconCoop, IconEgg, IconFlock, IconHome, IconMore } from './components/Icons';
import { Sheet, Spinner } from './components/ui';
import { remindersFor } from './logic/reminders';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import FlockScreen from './screens/Flock';
import BirdDetail from './screens/BirdDetail';
import Eggs from './screens/Eggs';
import EggHistory from './screens/EggHistory';
import Coop from './screens/Coop';
import Care from './screens/Care';
import Feed from './screens/Feed';
import Brooder from './screens/Brooder';
import Learn from './screens/Learn';
import Recipes from './screens/Recipes';
import Shop from './screens/Shop';
import Account from './screens/Account';
import NotFound from './screens/NotFound';
import RemindersList from './screens/RemindersList';

export const MORE_LINKS = [
  { to: '/care', emoji: '🩺', title: 'Care', sub: 'Health and biosecurity' },
  { to: '/feed', emoji: '🌾', title: 'Feed', sub: 'Supplies and usage' },
  { to: '/brooder', emoji: '🐣', title: 'Brooder', sub: 'Incubation and chicks' },
  { to: '/learn', emoji: '📖', title: 'Learn', sub: 'Practical guides' },
  { to: '/recipes', emoji: '🍳', title: 'Recipes', sub: 'Use those eggs' },
  { to: '/shop', emoji: '🛍️', title: 'Shop', sub: 'Fresh Eggs Daily' },
  { to: '/account', emoji: '⚙️', title: 'Account', sub: 'Flocks and backups' },
];

const ROUTES: { pattern: string; render(p: Record<string, string>): JSX.Element }[] = [
  { pattern: '/', render: () => <Home /> },
  { pattern: '/flock', render: () => <FlockScreen /> },
  { pattern: '/flock/:birdId', render: (p) => <BirdDetail birdId={p.birdId} /> },
  { pattern: '/eggs', render: () => <Eggs /> },
  { pattern: '/eggs/history', render: () => <EggHistory /> },
  { pattern: '/coop', render: () => <Coop /> },
  { pattern: '/care', render: () => <Care /> },
  { pattern: '/feed', render: () => <Feed /> },
  { pattern: '/brooder', render: () => <Brooder /> },
  { pattern: '/learn', render: () => <Learn /> },
  { pattern: '/recipes', render: () => <Recipes /> },
  { pattern: '/shop', render: () => <Shop /> },
  { pattern: '/account', render: () => <Account /> },
];

export default function App() {
  const { status, error, data, today, reload, toastMsg } = useApp();
  const route = useRoute();
  const [moreOpen, setMoreOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Close sheets and move focus to the page heading on navigation.
  useEffect(() => {
    setMoreOpen(false);
    setBellOpen(false);
    window.scrollTo(0, 0);
    const h = document.getElementById('page-title');
    if (h && document.activeElement && document.activeElement !== document.body) h.focus({ preventScroll: true });
  }, [route.path, route.query.toString()]);

  const reminders = useMemo(() => (status === 'ready' ? remindersFor(data, today) : []), [status, data, today]);

  if (status === 'loading') return <Spinner label="Opening the coop" />;
  if (status === 'error')
    return (
      <main>
        <div className="card center" role="alert">
          <h1>Something went wrong</h1>
          <p className="muted">{error}</p>
          <button className="btn primary" onClick={() => void reload()}>Try again</button>
        </div>
      </main>
    );
  if (!data.household) return <Onboarding />;

  let content: JSX.Element = <NotFound />;
  for (const r of ROUTES) {
    const p = match(r.pattern, route.path);
    if (p) { content = r.render(p); break; }
  }

  const section = route.path.split('/')[1] ?? '';
  const tabs = [
    { to: '/', label: 'Home', icon: <IconHome />, active: section === '' },
    { to: '/flock', label: 'Flock', icon: <IconFlock />, active: section === 'flock' },
    { to: '/eggs', label: 'Eggs', icon: <IconEgg />, active: section === 'eggs' },
    { to: '/coop', label: 'Coop', icon: <IconCoop />, active: section === 'coop' },
  ];
  const moreActive = MORE_LINKS.some((m) => m.to === '/' + section);

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Fresh Eggs Daily home"><EggLogo /> Fresh Eggs Daily</Link>
        <span className="spacer" />
        <button className="icon-btn bell" aria-label={`Reminders, ${reminders.length} due`} onClick={() => setBellOpen(true)}>
          <IconBell />
          {reminders.length > 0 && <span className="dot" aria-hidden="true">{reminders.length > 9 ? '9+' : reminders.length}</span>}
        </button>
      </header>
      {IS_DEMO && <DemoBanner />}
      <main id="main" ref={mainRef} tabIndex={-1}>{content}</main>
      <nav className="tabbar" aria-label="Main">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className="tab" aria-current={t.active ? 'page' : undefined}>{t.icon}<span>{t.label}</span></Link>
        ))}
        <button className="tab" aria-haspopup="dialog" aria-current={moreActive ? 'page' : undefined} onClick={() => setMoreOpen(true)}><IconMore /><span>More</span></button>
      </nav>
      <Sheet open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <nav className="more-grid" aria-label="More sections">
          {MORE_LINKS.map((m) => (
            <Link key={m.to} to={m.to} className="more-tile" onClick={() => setMoreOpen(false)}>
              <span className="emoji" aria-hidden="true">{m.emoji}</span>
              <strong>{m.title}</strong>
              <span className="muted">{m.sub}</span>
            </Link>
          ))}
        </nav>
      </Sheet>
      <Sheet open={bellOpen} title="Due today" onClose={() => setBellOpen(false)}>
        <RemindersList reminders={reminders} onNavigate={() => setBellOpen(false)} />
      </Sheet>
      {toastMsg && <div className="toast" role="status" aria-live="polite">{toastMsg}</div>}
    </div>
  );
}

function DemoBanner() {
  const { adapter, today, reload, toast } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <div className="demo-banner" role="note">
      <span><strong>Demo</strong> with a sample flock</span>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); await resetDemo(adapter, today); await reload(); setBusy(false); location.hash = '#/'; toast('Demo reset'); }}>Reset demo</button>
    </div>
  );
}
