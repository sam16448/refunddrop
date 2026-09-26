import { evaluate, formatMoney, type Money } from '@/rules';
import type { ClaimStatus, SavedClaim } from '@/state/claims';

/** Total compensation a saved claim asks for (all passengers), if it is a money claim. */
export function claimValue(claim: SavedClaim): Money | undefined {
  const v = evaluate(claim.facts, claim.answers);
  if (!v.estimate || (v.outcome !== 'likely' && v.outcome !== 'possible')) return undefined;
  const n = 1 + (claim.details.otherPassengers?.length ?? 0);
  return { amount: v.estimate.perPassenger.amount * n, currency: v.estimate.perPassenger.currency };
}

/** Sum money per currency and format, e.g. "€850 + £220". Empty list gives "€0". */
export function sumMoney(values: (Money | undefined)[]): string {
  const totals = new Map<Money['currency'], number>();
  for (const m of values) if (m) totals.set(m.currency, (totals.get(m.currency) ?? 0) + m.amount);
  if (totals.size === 0) return formatMoney({ amount: 0, currency: 'EUR' });
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amount]) => formatMoney({ amount, currency }))
    .join(' + ');
}

const OPEN: ClaimStatus[] = ['drafted', 'sent', 'replied', 'rejected'];

export function walletTotals(claims: SavedClaim[]): { open: string; received: string; openCount: number; paidCount: number } {
  const open = claims.filter((c) => OPEN.includes(c.status));
  const paid = claims.filter((c) => c.status === 'paid');
  return {
    open: sumMoney(open.map(claimValue)),
    received: sumMoney(paid.map(claimValue)),
    openCount: open.length,
    paidCount: paid.length,
  };
}
