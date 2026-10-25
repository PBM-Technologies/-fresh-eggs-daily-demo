import { RECIPES } from '../content/recipes';
import { Card, Empty, Page, Stat } from '../components/ui';
import { Chevron } from '../components/Icons';
import { Link, useRoute } from '../router';
import { useApp } from '../state/AppData';
import { eggsOnHand } from '../logic/eggs';

export default function Recipes() {
  const route = useRoute();
  const { data } = useApp();
  const onHand = eggsOnHand(data.egg_collections, data.egg_inventory);
  const slug = route.query.get('r');
  if (slug) {
    const r = RECIPES.find((x) => x.slug === slug);
    if (!r) return <Page title="Recipe not found" back="/recipes"><Card><Empty icon="🍳" title="That recipe moved" action={<Link to="/recipes" className="btn primary">All recipes</Link>} /></Card></Page>;
    return (
      <Page title={r.title} back="/recipes" subtitle={r.summary}>
        <div className="grid3" style={{ marginBottom: 14 }}>
          <Stat value={r.eggs} label="Eggs" /><Stat value={`${r.minutes}m`} label="Time" /><Stat value={r.serves} label="Makes" />
        </div>
        <article className="card article">
          <h2 style={{ marginTop: 0 }}>Ingredients</h2>
          <ul>{r.ingredients.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>Steps</h2>
          <ol>{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </article>
      </Page>
    );
  }
  const sorted = [...RECIPES].sort((a, b) => b.eggs - a.eggs);
  return (
    <Page title="Recipes" subtitle={`You have about ${onHand} eggs on hand`}>
      <Card>
        <ul className="list">
          {sorted.map((r) => (
            <li key={r.slug}>
              <Link to={`/recipes?r=${r.slug}`} className="item">
                <span className="avatar" aria-hidden="true">🍳</span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block', whiteSpace: 'normal' }}>{r.title}</span>
                  <span className="item-sub">{r.eggs} eggs · {r.minutes} min{onHand > 0 && r.eggs <= onHand ? ' · you have enough' : ''}</span>
                </span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
