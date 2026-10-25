import { FED_SITE, SHOP_CATEGORIES } from '../content/shop';
import { Card, Page } from '../components/ui';

const EMOJI: Record<string, string> = { supplements: '🌿', treats: '🍓', 'coop-care': '🏡', 'chick-care': '🐣' };

export default function Shop() {
  return (
    <Page title="Shop" subtitle="Fresh Eggs Daily products for happy, healthy hens">
      <div className="notice info" role="note">Ordering happens on the Fresh Eggs Daily site. Links open in a new tab.</div>
      <div className="grid-auto">
        {SHOP_CATEGORIES.map((c) => (
          <Card key={c.slug}>
            <div style={{ fontSize: '2rem' }} aria-hidden="true">{EMOJI[c.slug]}</div>
            <h2 style={{ margin: '6px 0' }}>{c.title}</h2>
            <p className="muted small">{c.blurb}</p>
            <a className="btn block" href={c.url} target="_blank" rel="noopener noreferrer">Browse on Fresh Eggs Daily<span className="sr-only"> (opens in a new tab)</span></a>
          </Card>
        ))}
      </div>
      <Card className="soft">
        <h2>About Fresh Eggs Daily</h2>
        <p className="small muted" style={{ marginTop: 6 }}>Founded by backyard chicken keeper and author Lisa Steele, Fresh Eggs Daily shares natural, practical ways to raise a healthy flock.</p>
        <a className="link-btn" style={{ paddingLeft: 0 }} href={FED_SITE} target="_blank" rel="noopener noreferrer">Visit fresheggsdaily.com</a>
      </Card>
    </Page>
  );
}
