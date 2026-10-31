import type { DateKey, EggCustomer, EggDisposition } from '../contracts/domain';
import { addDays } from './dates';

export interface BuyerSummary {
  customer: EggCustomer;
  /** Eggs bought, all time. */
  eggs: number;
  /** Money paid plus owed, all time. */
  spent: number;
  owed: number;
  unpaid: EggDisposition[];
  lastBought?: DateKey;
  /** Eggs bought in the last 30 days. */
  eggs30: number;
}

/** A sale belongs to a buyer by id, or by matching name for older entries. */
export function salesFor(c: EggCustomer, out: EggDisposition[]): EggDisposition[] {
  const name = c.name.trim().toLowerCase();
  return out.filter((d) => d.kind === 'sold' && (d.customerId ? d.customerId === c.id : (d.customer ?? '').trim().toLowerCase() === name));
}

export const isUnpaid = (d: EggDisposition) => d.kind === 'sold' && d.paid === false;

export function buyerSummaries(customers: EggCustomer[], out: EggDisposition[], today: DateKey): BuyerSummary[] {
  const since = addDays(today, -29);
  return customers
    .map((customer) => {
      const sales = salesFor(customer, out);
      const unpaid = sales.filter(isUnpaid).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
      return {
        customer,
        eggs: sales.reduce((a, s) => a + s.count, 0),
        spent: sales.reduce((a, s) => a + (s.amount ?? 0), 0),
        owed: unpaid.reduce((a, s) => a + (s.amount ?? 0), 0),
        unpaid,
        lastBought: sales.map((s) => s.occurredOn).sort().pop(),
        eggs30: sales.filter((s) => s.occurredOn >= since).reduce((a, s) => a + s.count, 0),
      };
    })
    .sort((a, b) => b.owed - a.owed || (b.lastBought ?? '').localeCompare(a.lastBought ?? '') || a.customer.name.localeCompare(b.customer.name));
}

export function totalOwed(out: EggDisposition[]): number {
  return out.filter(isUnpaid).reduce((a, s) => a + (s.amount ?? 0), 0);
}

/** Eggs promised each week by standing orders. */
export function standingEggsPerWeek(customers: EggCustomer[]): number {
  return Math.round(customers.reduce((a, c) => a + (c.standingDozens ?? 0) * 12, 0));
}

/** Suggested price for a sale, from the buyer's per-dozen price. */
export function suggestedPrice(c: EggCustomer | undefined, eggs: number): number | null {
  if (!c?.pricePerDozen) return null;
  return Math.round((c.pricePerDozen * eggs / 12) * 100) / 100;
}
