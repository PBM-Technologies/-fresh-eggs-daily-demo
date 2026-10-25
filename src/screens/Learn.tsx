import { useState } from 'react';
import { ARTICLES } from '../content/articles';
import { Card, Empty, Page } from '../components/ui';
import { Chevron } from '../components/Icons';
import { Link, useRoute } from '../router';
import type { Article } from '../contracts/domain';

const TOPICS = ['All', 'Chicks', 'Eggs', 'Seasons', 'Coop', 'Health', 'Flock'] as const;

export default function Learn() {
  const route = useRoute();
  const slug = route.query.get('a');
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('All');
  const [q, setQ] = useState('');
  if (slug) {
    const a = ARTICLES.find((x) => x.slug === slug);
    return a ? <ArticleView a={a} /> : (
      <Page title="Guide not found" back="/learn"><Card><Empty icon="📖" title="That guide moved" action={<Link to="/learn" className="btn primary">All guides</Link>} /></Card></Page>
    );
  }
  const needle = q.trim().toLowerCase();
  const list = ARTICLES.filter((a) => (topic === 'All' || a.topic === topic) && (!needle || (a.title + a.problem).toLowerCase().includes(needle)));
  return (
    <Page title="Learn" subtitle="Practical guides: the problem first, then what to do">
      <div className="field">
        <label className="sr-only" htmlFor="learn-q">Search guides</label>
        <input id="learn-q" className="input" type="search" placeholder="Search: molting, winter, predators…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips scroll" role="radiogroup" aria-label="Topic" style={{ marginBottom: 14 }}>
        {TOPICS.map((t) => <button key={t} role="radio" aria-checked={topic === t} className={'chip' + (topic === t ? ' on' : '')} onClick={() => setTopic(t)}>{t}</button>)}
      </div>
      <Link to="/breeds" className="card cta-card">
        <span className="cta-emoji" aria-hidden="true">🐓</span>
        <span className="item-main">
          <span className="item-title" style={{ display: 'block' }}>Breed guide</span>
          <span className="item-sub">{'Egg colors, temperament and what to add next'}</span>
        </span>
        <Chevron />
      </Link>
      <Card>
        {list.length === 0 ? <Empty icon="🔍" title="No guides match">Try a different word or topic.</Empty> : (
          <ul className="list">
            {list.map((a) => (
              <li key={a.slug}>
                <Link to={`/learn?a=${a.slug}`} className="item">
                  <span className="item-main">
                    <span className="item-title" style={{ display: 'block', whiteSpace: 'normal' }}>{a.title}</span>
                    <span className="item-sub">{a.topic} · {a.minutes} min read</span>
                  </span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="small muted">General backyard poultry guidance for healthy flocks. It is not a substitute for a veterinarian.</p>
    </Page>
  );
}

function ArticleView({ a }: { a: Article }) {
  return (
    <Page title={a.title} back="/learn" subtitle={`${a.topic} · ${a.minutes} min read`}>
      <article className="card article">
        <h2>The problem</h2>
        <p>{a.problem}</p>
        <h2>Why it happens</h2>
        <p>{a.why}</p>
        <h2>What to do</h2>
        <ol>{a.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {a.getHelp && (<><h2>When to get help</h2><p>{a.getHelp}</p></>)}
      </article>
      <p className="small muted">General guidance only. Fresh Eggs Daily does not give veterinary diagnosis.</p>
    </Page>
  );
}
