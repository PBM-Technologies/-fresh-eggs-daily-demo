import type { CostCategory, DateKey, EggDisposition, EggLog, FeedCategory, FlockCost } from '../contracts/domain';
import { addMonths, monthKey } from './dates';
import { economics, sum, type Economics } from './eggs';

export const COST_CATEGORY_ORDER: CostCategory[] = ['feed', 'bedding', 'vet', 'equipment', 'other'];

export const monthStart = (month: string): DateKey => `${month}-01`;
export function monthEnd(month: string): DateKey {
  const next = addMonths(monthStart(month), 1);
  const d = new Date(Date.UTC(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1, 0));
  return `${month}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function monthTotal(costs: FlockCost[], month: string): number {
  return sum(costs.filter((c) => monthKey(c.occurredOn) === month).map((c) => c.amount));
}

export interface CategoryTotal { category: CostCategory; total: number }
/** Spending by category for a month, largest first, zero categories left out. */
export function byCategory(costs: FlockCost[], month: string): CategoryTotal[] {
  return COST_CATEGORY_ORDER
    .map((category) => ({ category, total: sum(costs.filter((c) => c.category === category && monthKey(c.occurredOn) === month).map((c) => c.amount)) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Totals for the `months` months ending with `month` (oldest first). */
export function monthlySpend(costs: FlockCost[], month: string, months = 6): { key: string; total: number }[] {
  return Array.from({ length: months }, (_, i) => {
    const key = monthKey(addMonths(monthStart(month), i - months + 1));
    return { key, total: monthTotal(costs, key) };
  });
}

export function costPerHen(total: number, hens: number): number | null {
  return hens > 0 ? total / hens : null;
}

export interface MonthSummary extends Economics { month: string; perHen: number | null; categories: CategoryTotal[] }
/** One month of flock money: costs, egg sales, net, cost per dozen and per hen. */
export function monthSummary(logs: EggLog[], out: EggDisposition[], costs: FlockCost[], month: string, hens: number): MonthSummary {
  const e = economics(logs, out, costs, monthStart(month), monthEnd(month));
  return { ...e, month, perHen: costPerHen(e.costs, hens), categories: byCategory(costs, month) };
}

/** Which cost category a restock of this inventory item is logged under. */
export function costCategoryForFeed(c: FeedCategory): CostCategory {
  if (c === 'bedding') return 'bedding';
  if (c === 'coop_care' || c === 'other') return 'other';
  return 'feed';
}
