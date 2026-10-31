import { describe, expect, it } from 'vitest';
import { productPicks, seasonOf, weatherAlerts, type DayForecast } from '../logic/seasonal';
import { buyerSummaries, standingEggsPerWeek, suggestedPrice, totalOwed } from '../logic/buyers';
import { emptySnapshot } from '../data/service';
import type { EggCustomer, EggDisposition } from '../contracts/domain';
import { FED_COOP, FED_TREATS } from '../content/shop';

const day = (date: string, o: Partial<DayForecast> = {}): DayForecast => ({ date, highF: 70, lowF: 50, precipIn: 0, windMph: 5, code: 1, ...o });
const ts = '2026-01-01T00:00:00Z';

describe('seasons and weather alerts', () => {
  it('maps months to seasons', () => {
    expect(seasonOf('2026-01-10')).toBe('winter');
    expect(seasonOf('2026-04-10')).toBe('spring');
    expect(seasonOf('2026-07-10')).toBe('summer');
    expect(seasonOf('2026-10-31')).toBe('fall');
  });
  it('flags heat, hard freeze and storms once each, act-level first', () => {
    const a = weatherAlerts([day('2026-07-01', { highF: 92 }), day('2026-07-02', { highF: 97 }), day('2026-07-03', { code: 95 })], '2026-07-01');
    expect(a.map((x) => x.id)).toEqual(['storm', 'heat']);
    expect(a.find((x) => x.id === 'heat')?.when).toBe('Today');
    const c = weatherAlerts([day('2026-01-01', { lowF: 30 }), day('2026-01-02', { lowF: 8 })], '2026-01-01');
    expect(c.map((x) => x.id)).toEqual(['cold']);
    expect(c[0].when).toBe('Tomorrow');
    expect(weatherAlerts([day('2026-05-01')], '2026-05-01')).toEqual([]);
  });
});

describe('Fresh Eggs Daily product picks', () => {
  it('leads with molt support after a logged molt and falls back to seasonal picks', () => {
    const s = emptySnapshot();
    s.bird_health_events = [{ id: 'm', householdId: 'h', flockId: 'f', type: 'molt', occurredOn: '2026-10-20', createdAt: ts, updatedAt: ts }];
    const p = productPicks(s, '2026-10-31');
    expect(p[0].id).toBe('molt');
    expect(p[0].url).toBe(FED_TREATS);
    expect(p.length).toBe(3);
    expect(new Set(p.map((x) => x.id)).size).toBe(3);
  });
  it('adds cold fuel when a freeze is forecast, and always has a nest box pick available', () => {
    const p = productPicks(emptySnapshot(), '2026-05-01', weatherAlerts([day('2026-05-01', { lowF: 28 })], '2026-05-01'), 5);
    expect(p.map((x) => x.id)).toContain('cold');
    expect(p.some((x) => x.url === FED_COOP)).toBe(true);
  });
});

describe('egg buyers', () => {
  const jan: EggCustomer = { id: 'c1', householdId: 'h', name: 'Jan', pricePerDozen: 6, standingDozens: 2, createdAt: ts, updatedAt: ts };
  const bo: EggCustomer = { id: 'c2', householdId: 'h', name: 'Bo', createdAt: ts, updatedAt: ts };
  const sale = (o: Partial<EggDisposition>): EggDisposition => ({ id: Math.random().toString(), householdId: 'h', occurredOn: '2026-10-20', kind: 'sold', count: 12, amount: 6, createdAt: ts, updatedAt: ts, ...o });
  const out = [
    sale({ customerId: 'c1', paid: true }),
    sale({ customerId: 'c1', paid: false, amount: 9, count: 18, occurredOn: '2026-10-28' }),
    sale({ customer: 'bo', paid: false }), // older entry matched by name
    sale({ kind: 'given', customerId: 'c1', amount: undefined }),
  ];
  it('totals owed and sorts the biggest balance first', () => {
    expect(totalOwed(out)).toBe(15);
    const rows = buyerSummaries([bo, jan], out, '2026-10-31');
    expect(rows[0].customer.id).toBe('c1');
    expect(rows[0]).toMatchObject({ owed: 9, eggs: 30, spent: 15, lastBought: '2026-10-28' });
    expect(rows[1]).toMatchObject({ owed: 6, eggs: 12 });
  });
  it('prices from per-dozen and counts standing orders', () => {
    expect(suggestedPrice(jan, 18)).toBe(9);
    expect(suggestedPrice(bo, 12)).toBeNull();
    expect(standingEggsPerWeek([jan, bo])).toBe(24);
  });
});
