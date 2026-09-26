import { describe, expect, it } from 'vitest';
import { SAMPLE_FLIGHTS } from '../src/data/sampleFlights';
import { claimValue, sumMoney, walletTotals } from '../src/lib/money';
import type { SavedClaim } from '../src/state/claims';

const lh = SAMPLE_FLIGHTS.find((s) => s.facts.flightNumber === 'LH 764')!;
const vy = SAMPLE_FLIGHTS.find((s) => s.facts.flightNumber === 'VY 7820')!;

function claim(sample: typeof lh, status: SavedClaim['status'], others: string[] = []): SavedClaim {
  return {
    id: `${sample.id}-${status}`,
    createdAt: '2026-09-01T00:00:00Z',
    facts: sample.facts,
    answers: { wasOnFlight: true, reason: 'technical', ...sample.demoAnswers },
    experience: sample.facts.status === 'cancelled' ? 'cancel' : 'delay',
    details: { passengerName: 'Asha Rao', otherPassengers: others, bookingRef: 'X7K2PQ', email: '' },
    summary: { regime: 'EU261', outcome: 'likely' },
    status,
  };
}

describe('claim wallet', () => {
  it('values a claim for every passenger on it', () => {
    expect(claimValue(claim(lh, 'drafted'))).toEqual({ amount: 600, currency: 'EUR' });
    expect(claimValue(claim(lh, 'drafted', ['Ravi Rao']))).toEqual({ amount: 1200, currency: 'EUR' });
  });

  it('sums per currency and never mixes them', () => {
    expect(sumMoney([])).toBe('€0');
    expect(sumMoney([{ amount: 600, currency: 'EUR' }, { amount: 250, currency: 'EUR' }])).toBe('€850');
    expect(sumMoney([{ amount: 220, currency: 'GBP' }, { amount: 600, currency: 'EUR' }, undefined])).toBe('€600 + £220');
  });

  it('splits open and received money', () => {
    const w = walletTotals([claim(lh, 'sent'), claim(vy, 'paid')]);
    expect(w).toMatchObject({ open: '€600', received: '€250', openCount: 1, paidCount: 1 });
  });
});
