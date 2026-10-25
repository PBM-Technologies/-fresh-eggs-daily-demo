import { useMemo, useState } from 'react';
import { useApp } from '../state/AppData';
import { Card, Empty, Page, Stat } from '../components/ui';
import { Link } from '../router';
import { addMonths, formatDate, formatMonth, monthKey } from '../logic/dates';
import { money } from '../logic/eggs';
import { monthlySpend, monthStart, monthSummary, type CategoryTotal } from '../logic/spending';
import { costsCsv } from '../data/service';
import { downloadText } from '../components/helpers';
import type { CostCategory } from '../contracts/domain';

const CAT: Record<CostCategory, { label: string; emoji: string }> = {
  feed: { label: 'Feed', emoji: '🌾' }, bedding: { label: 'Bedding', emoji: '🪵' }, vet: { label: 'Vet', emoji: '🩺' },
  equipment: { label: 'Equipment', emoji: '🔧' }, other: { label: 'Other', emoji: '📦' },
};

export default function Spending() {
  const { data, today } = useApp();
  const current = monthKey(today);
  const [month, setMonth] = useState(current);
  const hens = data.birds.filter((b) => b.status === 'active').length;
  const sum = useMemo(() => monthSummary(data.egg_collections, data.egg_inventory, data.flock_costs, month, hens), [data, month, hens]);
  const trend = useMemo(() => monthlySpend(data.flock_costs, month, 6), [data.flock_costs, month]);
  const monthLabel = formatDate(monthStart(month), { month: 'long', year: 'numeric' });
  const net = sum.revenue - sum.costs;

  return (
    <Page title="Spending" subtitle="What the flock costs, month by month"
      action={<button className="btn small" onClick={() => downloadText(`fed-costs-${today}.csv`, costsCsv(data), 'text/csv')}>Export CSV</button>}>
      <div className="month-nav" role="group" aria-label="Month">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonth(monthKey(addMonths(monthStart(month), -1)))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button type="button" className="icon-btn" aria-label="Next month" disabled={month >= current} onClick={() => setMonth(monthKey(addMonths(monthStart(month), 1)))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <Card className="hero">
        <p className="muted small" style={{ margin: 0 }}>Spent in {formatDate(monthStart(month), { month: 'long' })}</p>
        <p className="spend-total" data-testid="month-total">{money(sum.costs)}</p>
        <div className="grid2">
          <Stat value={sum.perHen === null ? 'No hens' : money(sum.perHen)} label="Per hen this month" />
          <Stat value={sum.perDozen === null ? 'No eggs' : money(sum.perDozen)} label="Cost per dozen" />
          <Stat value={money(sum.revenue)} label="Egg sales" />
          <Stat value={(net < 0 ? '-' : '') + money(Math.abs(net))} label={net >= 0 ? 'Net after egg sales' : 'Net cost after egg sales'} />
        </div>
      </Card>

      <Card title="By category">
        {sum.categories.length === 0 ? (
          <Empty icon="🧾" title="Nothing spent this month" action={<Link to="/eggs/history?tab=costs" className="btn primary">Add a cost</Link>}>Log feed, bedding, vet and equipment costs, or add a price when you restock feed.</Empty>
        ) : <CategoryBars rows={sum.categories} total={sum.costs} />}
      </Card>

      <Card title="Last 6 months">
        <TrendChart rows={trend} current={month} />
        <p className="small muted center" style={{ margin: '6px 0 0' }}>
          {money(trend.reduce((a, b) => a + b.total, 0))} over 6 months · average {money(trend.reduce((a, b) => a + b.total, 0) / trend.length)} a month
        </p>
      </Card>

      <Card className="soft">
        <p className="small muted" style={{ margin: 0 }}>
          Cost per hen uses {hens} active hen{hens === 1 ? '' : 's'}. Cost per dozen is this month's costs divided by usable dozens collected. Net is egg sales minus costs. Add costs on <Link to="/eggs/history?tab=costs">Egg history, Costs</Link> or with a price when you restock on <Link to="/feed">Feed</Link>.
        </p>
      </Card>
    </Page>
  );
}

function CategoryBars({ rows, total }: { rows: CategoryTotal[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  const rowH = 34;
  const w = 320;
  const labelW = 104;
  const valW = 70;
  const barW = w - labelW - valW;
  return (
    <figure className="chart spend-bars">
      <svg viewBox={`0 0 ${w} ${rows.length * rowH}`} role="img" aria-label={`Spending by category. ${rows.map((r) => `${CAT[r.category].label} ${money(r.total)}`).join(', ')}.`}>
        {rows.map((r, i) => {
          const y = i * rowH;
          const bw = Math.max(4, (r.total / max) * barW);
          return (
            <g key={r.category}>
              <text x={0} y={y + rowH / 2 + 4} className="cat-label">{CAT[r.category].emoji} {CAT[r.category].label}</text>
              <rect x={labelW} y={y + 8} width={barW} height={rowH - 16} rx={6} className="track" />
              <rect x={labelW} y={y + 8} width={bw} height={rowH - 16} rx={6} className="bar"><title>{`${CAT[r.category].label}: ${money(r.total)}`}</title></rect>
              <text x={w} y={y + rowH / 2 + 4} className="cat-val" textAnchor="end">{money(r.total)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{rows.map((r) => `${CAT[r.category].label}: ${Math.round((r.total / total) * 100)} percent`).join('. ')}</figcaption>
    </figure>
  );
}

function TrendChart({ rows, current }: { rows: { key: string; total: number }[]; current: string }) {
  const w = 320;
  const h = 130;
  const pad = 18;
  const max = Math.max(1, ...rows.map((r) => r.total));
  const bw = (w - 8) / rows.length;
  return (
    <figure className="chart spend-trend">
      <svg viewBox={`0 0 ${w} ${h + pad}`} role="img" aria-label={`Spending, last 6 months. ${rows.map((r) => `${formatMonth(r.key)} ${money(r.total)}`).join(', ')}.`}>
        <line x1="0" x2={w} y1={h} y2={h} className="axis" />
        {rows.map((r, i) => {
          const bh = r.total ? Math.max(3, (r.total / max) * (h - 20)) : 0;
          const x = 4 + i * bw + bw * 0.18;
          return (
            <g key={r.key}>
              <rect x={x} y={h - bh} width={bw * 0.64} height={bh} rx={6} className={'bar' + (r.key === current ? ' now' : '')}><title>{`${formatMonth(r.key)}: ${money(r.total)}`}</title></rect>
              {r.total > 0 && <text x={x + bw * 0.32} y={h - bh - 4} className="bar-val" textAnchor="middle">{`$${Math.round(r.total)}`}</text>}
              <text x={x + bw * 0.32} y={h + 13} className="tick" textAnchor="middle">{formatMonth(r.key)}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
