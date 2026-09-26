import { describe, expect, it } from 'vitest';
import { SAMPLE_FLIGHTS } from '../src/data/sampleFlights';
import { airport, carrier, evaluate, greatCircleKm } from '../src/rules';
import type { FlightFacts, PassengerAnswers } from '../src/rules';

/** Build a flight that lands `delay` minutes late. Times are arbitrary but consistent. */
function flight(
  from: string,
  to: string,
  airline: string,
  opts: { arrivalDelay?: number; departureDelay?: number; status?: FlightFacts['status']; marketedAs?: string[] } = {},
): FlightFacts {
  const schedDep = Date.parse('2026-08-01T10:00:00Z');
  const schedArr = Date.parse('2026-08-01T14:00:00Z');
  const iso = (t: number) => new Date(t).toISOString();
  const status = opts.status ?? 'landed';
  return {
    flightNumber: `${airline} 100`,
    date: '2026-08-01',
    origin: airport(from),
    destination: airport(to),
    operatingCarrier: carrier(airline),
    marketedAs: opts.marketedAs,
    scheduledDepartureUtc: iso(schedDep),
    scheduledArrivalUtc: iso(schedArr),
    actualDepartureUtc:
      status === 'cancelled' ? undefined : iso(schedDep + (opts.departureDelay ?? opts.arrivalDelay ?? 0) * 60000),
    actualArrivalUtc:
      status === 'cancelled' || opts.arrivalDelay === undefined ? undefined : iso(schedArr + opts.arrivalDelay * 60000),
    status,
  };
}

const technical: PassengerAnswers = { wasOnFlight: true, reason: 'technical' };

describe('scope: which regime applies', () => {
  it('EU261 covers any airline departing the EU', () => {
    const v = evaluate(flight('CDG', 'DXB', 'EK', { arrivalDelay: 240 }), technical);
    expect(v.regime).toBe('EU261');
    expect(v.steps[0].ruleRef).toBe('EU261 Art. 3(1)(a)');
  });

  it('EU261 covers flights into the EU on an EU airline', () => {
    const v = evaluate(flight('JFK', 'FRA', 'LH', { arrivalDelay: 240 }), technical);
    expect(v.regime).toBe('EU261');
    expect(v.steps[0].ruleRef).toBe('EU261 Art. 3(1)(b)');
  });

  it('EU261 does not cover flights into the EU on a non-EU airline', () => {
    const v = evaluate(flight('JFK', 'CDG', 'DL', { arrivalDelay: 240 }), technical);
    expect(v.regime).toBe('US_DOT');
    expect(v.outcome).not.toBe('likely');
    expect(v.steps.some((s) => s.label === 'Not covered by EU261 or UK261')).toBe(true);
  });

  it('UK261 covers UK departures and pays in pounds', () => {
    const v = evaluate(flight('LHR', 'JFK', 'BA', { arrivalDelay: 300 }), technical);
    expect(v.regime).toBe('UK261');
    expect(v.estimate?.perPassenger).toEqual({ amount: 520, currency: 'GBP' });
  });

  it('UK261 covers flights into the UK on an EU airline', () => {
    const v = evaluate(flight('YYZ', 'LHR', 'KL', { arrivalDelay: 300 }), technical);
    expect(v.regime).toBe('UK261');
  });

  it('EU departure wins when a flight could fall under both EU261 and UK261', () => {
    const v = evaluate(flight('CDG', 'LHR', 'BA', { arrivalDelay: 200 }), technical);
    expect(v.regime).toBe('EU261');
    expect(v.estimate?.perPassenger.currency).toBe('EUR');
  });

  it('a non-European airline flying into the UK is not covered', () => {
    const v = evaluate(flight('BOM', 'LHR', 'AI', { arrivalDelay: 305 }), technical);
    expect(v.outcome).toBe('not_covered');
    expect(v.estimate).toBeUndefined();
  });

  it('routes outside EU, UK and US are reported as not covered', () => {
    const v = evaluate(flight('BOM', 'DXB', '6E', { arrivalDelay: 400 }), technical);
    expect(v.regime).toBe('NONE');
    expect(v.outcome).toBe('not_covered');
  });

  it('an unknown airline flying into the EU is only possibly covered', () => {
    const v = evaluate(flight('DXB', 'FRA', 'XY', { arrivalDelay: 400 }), technical);
    expect(v.outcome).toBe('possible');
    expect(v.openQuestions.join(' ')).toMatch(/licensed/);
  });
});

describe('distance bands', () => {
  it('computes great-circle distance', () => {
    const km = greatCircleKm(airport('CDG'), airport('JFK'));
    expect(km).toBeGreaterThan(5800);
    expect(km).toBeLessThan(5870);
  });

  it('short flights (≤1,500 km) earn €250', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 200 }), technical);
    expect(v.estimate?.band).toBe('short');
    expect(v.estimate?.perPassenger.amount).toBe(250);
  });

  it('medium flights (1,500–3,500 km) earn £350 under UK261', () => {
    const v = evaluate(flight('LHR', 'ATH', 'BA', { arrivalDelay: 200 }), technical);
    expect(v.estimate?.band).toBe('medium');
    expect(v.estimate?.perPassenger).toEqual({ amount: 350, currency: 'GBP' });
  });

  it('long flights (>3,500 km) earn €600', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 300 }), technical);
    expect(v.estimate?.band).toBe('long');
    expect(v.estimate?.perPassenger.amount).toBe(600);
  });

  it('long flights within the EU are capped at €400', () => {
    const v = evaluate(flight('CDG', 'RUN', 'AF', { arrivalDelay: 300 }), technical);
    expect(v.estimate?.distanceKm).toBeGreaterThan(3500);
    expect(v.estimate?.perPassenger.amount).toBe(400);
  });
});

describe('delays', () => {
  it('2h59m arrival delay is not enough', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 179 }), technical);
    expect(v.outcome).toBe('not_eligible');
  });

  it('exactly 3h arrival delay qualifies', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 180 }), technical);
    expect(v.outcome).toBe('likely');
  });

  it('measures arrival, not departure, delay', () => {
    const v = evaluate(flight('MAD', 'AMS', 'KL', { departureDelay: 240, arrivalDelay: 170 }), technical);
    expect(v.outcome).toBe('not_eligible');
  });

  it('halves long-haul compensation for a 3–4h delay', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 210 }), technical);
    expect(v.estimate?.reduced).toBe(true);
    expect(v.estimate?.perPassenger.amount).toBe(300);
    expect(v.estimate?.fullAmount.amount).toBe(600);
  });

  it('pays the full long-haul amount at 4h or more', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 240 }), technical);
    expect(v.estimate?.reduced).toBe(false);
    expect(v.estimate?.perPassenger.amount).toBe(600);
  });

  it('does not halve medium-haul delays over 3h', () => {
    const v = evaluate(flight('MAD', 'HEL', 'AY', { arrivalDelay: 190 }), technical);
    expect(v.estimate?.band).toBe('medium');
    expect(v.estimate?.reduced).toBe(false);
  });

  it('bad weather is an extraordinary circumstance', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 300 }), { wasOnFlight: true, reason: 'weather' });
    expect(v.outcome).toBe('not_eligible');
  });

  it("a strike by the airline's own staff does not excuse it", () => {
    const v = evaluate(flight('CPH', 'OSL', 'SK', { arrivalDelay: 300 }), { wasOnFlight: true, reason: 'airline_staff_strike' });
    expect(v.outcome).toBe('likely');
  });

  it('an unknown cause makes the result "possible", with the full amount as upper bound', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 300 }), { wasOnFlight: true });
    expect(v.outcome).toBe('possible');
    expect(v.headline).toMatch(/up to €250/);
  });

  it('asks for the arrival time when the API has none', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY'), technical);
    expect(v.outcome).toBe('possible');
    expect(v.openQuestions).toContain('What time did you actually arrive?');
  });

  it('offers the refund option once a delay reaches 5 hours', () => {
    const v = evaluate(flight('BCN', 'LGW', 'VY', { arrivalDelay: 310 }), technical);
    expect(v.otherRights.join(' ')).toMatch(/5 hours/);
  });
});

describe('connections', () => {
  it('uses final-destination delay and distance when legs share one booking', () => {
    const v = evaluate(flight('LIS', 'FRA', 'TP', { arrivalDelay: 45 }), {
      ...technical,
      connection: { sameBooking: true, finalDestination: airport('SIN'), finalArrivalDelayMinutes: 300 },
    });
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.band).toBe('long');
    expect(v.delayMinutes).toBe(300);
  });

  it('ignores a missed connection on a separate booking', () => {
    const v = evaluate(flight('LIS', 'FRA', 'TP', { arrivalDelay: 45 }), {
      ...technical,
      connection: { sameBooking: false, finalDestination: airport('SIN'), finalArrivalDelayMinutes: 600 },
    });
    expect(v.outcome).toBe('not_eligible');
  });
});

describe('cancellations', () => {
  const cancelled = (from = 'BCN', to = 'LGW', airline = 'VY') => flight(from, to, airline, { status: 'cancelled' });

  it('no compensation when told 14+ days ahead', () => {
    const v = evaluate(cancelled(), { ...technical, cancellationNotice: '14plus' });
    expect(v.outcome).toBe('not_eligible');
    expect(v.otherRights.join(' ')).toMatch(/refund or a replacement/);
  });

  it('short-notice cancellation without a replacement earns the full amount', () => {
    const v = evaluate(cancelled(), { wasOnFlight: true, reason: 'crew_shortage', cancellationNotice: 'under7' });
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.perPassenger.amount).toBe(250);
  });

  it('under 7 days: a close replacement flight cancels the claim', () => {
    const v = evaluate(cancelled(), {
      ...technical,
      cancellationNotice: 'under7',
      reroute: { took: true, departedEarlyMinutes: 0, arrivalDelayMinutes: 90 },
    });
    expect(v.outcome).toBe('not_eligible');
  });

  it('7–13 days: a replacement within 2h early / 4h late cancels the claim', () => {
    const v = evaluate(cancelled(), {
      ...technical,
      cancellationNotice: '7to13',
      reroute: { took: true, departedEarlyMinutes: 60, arrivalDelayMinutes: 180 },
    });
    expect(v.outcome).toBe('not_eligible');
  });

  it('a replacement arriving far later still pays in full', () => {
    const v = evaluate(cancelled(), {
      ...technical,
      cancellationNotice: 'under7',
      reroute: { took: true, departedEarlyMinutes: 0, arrivalDelayMinutes: 310 },
    });
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.reduced).toBe(false);
  });

  it('halves compensation when the replacement lands within the band window', () => {
    const v = evaluate(cancelled('MAD', 'HEL', 'AY'), {
      ...technical,
      cancellationNotice: 'under7',
      reroute: { took: true, departedEarlyMinutes: 0, arrivalDelayMinutes: 150 },
    });
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.perPassenger.amount).toBe(200);
  });

  it('asks when the passenger was told if notice is unknown', () => {
    const v = evaluate(cancelled(), technical);
    expect(v.outcome).toBe('possible');
    expect(v.openQuestions).toContain('When did the airline tell you about the cancellation?');
  });
});

describe('denied boarding', () => {
  it('involuntary denied boarding pays even in bad weather', () => {
    const v = evaluate(flight('FRA', 'ATH', 'LH', { arrivalDelay: 0 }), {
      wasOnFlight: true,
      reason: 'weather',
      deniedBoarding: { happened: true, voluntary: false },
    });
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.perPassenger.amount).toBe(400);
  });

  it('volunteers get no fixed compensation', () => {
    const v = evaluate(flight('FRA', 'ATH', 'LH'), { wasOnFlight: true, deniedBoarding: { happened: true, voluntary: true } });
    expect(v.outcome).toBe('not_eligible');
  });

  it('missing travel documents are valid grounds', () => {
    const v = evaluate(flight('FRA', 'ATH', 'LH'), {
      wasOnFlight: true,
      deniedBoarding: { happened: true, voluntary: false, reasonableGrounds: true },
    });
    expect(v.outcome).toBe('not_eligible');
  });

  it('halves compensation when rebooked close to the original time', () => {
    const v = evaluate(flight('FRA', 'ATH', 'LH'), {
      wasOnFlight: true,
      deniedBoarding: { happened: true, voluntary: false },
      reroute: { took: true, arrivalDelayMinutes: 150 },
    });
    expect(v.estimate?.perPassenger.amount).toBe(200);
  });
});

describe('US DOT refunds', () => {
  it('domestic 3h+ delay and did not travel → full cash refund', () => {
    const v = evaluate(flight('SFO', 'ORD', 'UA', { arrivalDelay: 220 }), { travelled: false });
    expect(v.regime).toBe('US_DOT');
    expect(v.outcome).toBe('refund_only');
    expect(v.headline).toBe('Full cash refund owed');
    expect(v.estimate).toBeUndefined();
  });

  it('domestic 2h delay is below the threshold', () => {
    const v = evaluate(flight('SFO', 'ORD', 'UA', { arrivalDelay: 120 }), { travelled: false });
    expect(v.outcome).toBe('not_eligible');
  });

  it('international flights need 6h', () => {
    const v = evaluate(flight('JFK', 'YYZ', 'AA', { arrivalDelay: 300 }), { travelled: false });
    expect(v.outcome).toBe('not_eligible');
  });

  it('no refund if the passenger flew anyway', () => {
    const v = evaluate(flight('SFO', 'ORD', 'UA', { arrivalDelay: 220 }), { travelled: true });
    expect(v.outcome).toBe('not_eligible');
  });

  it('cancellation with unknown travel → refund owed if they did not fly', () => {
    const v = evaluate(flight('SFO', 'ORD', 'UA', { status: 'cancelled' }), {});
    expect(v.outcome).toBe('refund_only');
    expect(v.openQuestions).toContain('Did you take this flight or an alternative?');
  });

  it('EU departures to the US mention US refund rights too', () => {
    const v = evaluate(flight('CDG', 'JFK', 'AF', { arrivalDelay: 300 }), technical);
    expect(v.regime).toBe('EU261');
    expect(v.otherRights.join(' ')).toMatch(/US DOT/);
  });
});

describe('general', () => {
  it('names the operating carrier on codeshares', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 300, marketedAs: ['AI 8764'] }), technical);
    expect(v.claimAgainst.name).toBe('Lufthansa');
    expect(v.steps.some((s) => s.label === 'Claim from Lufthansa')).toBe(true);
  });

  it('requires a booking on the flight', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 300 }), { wasOnFlight: false, reason: 'technical' });
    expect(v.outcome).toBe('not_eligible');
  });

  it('every verdict carries the disclaimer and a rules version', () => {
    const v = evaluate(flight('FRA', 'BOM', 'LH', { arrivalDelay: 300 }), technical);
    expect(v.disclaimer).toMatch(/not legal advice/);
    expect(v.rulesVersion).toMatch(/EU261/);
  });
});

describe('sample flights', () => {
  const expected: Record<string, { outcome: string; amount?: number }> = {
    'eu-longhaul-delay': { outcome: 'likely', amount: 600 },
    'eu-short-cancel': { outcome: 'likely', amount: 250 },
    'us-domestic-delay': { outcome: 'refund_only' },
    'inbound-not-covered': { outcome: 'not_covered' },
  };

  for (const sample of SAMPLE_FLIGHTS) {
    it(`${sample.id} → ${expected[sample.id].outcome}`, () => {
      const v = evaluate(sample.facts, sample.demoAnswers);
      expect(v.outcome).toBe(expected[sample.id].outcome);
      if (expected[sample.id].amount !== undefined) {
        expect(v.estimate?.perPassenger.amount).toBe(expected[sample.id].amount);
      }
    });
  }
});
