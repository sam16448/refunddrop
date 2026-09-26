import { describe, expect, it } from 'vitest';
import { buildClaimLetter, buildEscalationLetter, buildFollowUpLetter, enforcementBody } from '../src/claim/letters';
import { SAMPLE_FLIGHTS } from '../src/data/sampleFlights';
import { evaluate } from '../src/rules';

const details = { passengerName: 'Asha Rao', otherPassengers: [], bookingRef: 'X7K2PQ', email: 'asha@example.com' };
const sample = (id: string) => SAMPLE_FLIGHTS.find((s) => s.id === id)!;

describe('claim letters', () => {
  it('EU long-haul delay letter cites Sturgeon, Art. 7 and the right amount', () => {
    const s = sample('eu-longhaul-delay');
    const v = evaluate(s.facts, s.demoAnswers);
    const l = buildClaimLetter(v, s.facts, s.demoAnswers, details);
    expect(l.subject).toMatch(/EU261 — LH 764/);
    expect(l.body).toMatch(/Sturgeon \(C-402\/07\)/);
    expect(l.body).toMatch(/4h 12m/);
    expect(l.body).toMatch(/compensation of €600/);
    expect(l.body).toMatch(/Wallentin-Hermann/);
    expect(l.body).toMatch(/X7K2PQ/);
    expect(l.body).toMatch(/asha@example.com/);
  });

  it('multiplies the amount for several passengers', () => {
    const s = sample('eu-longhaul-delay');
    const v = evaluate(s.facts, s.demoAnswers);
    const l = buildClaimLetter(v, s.facts, s.demoAnswers, { ...details, otherPassengers: ['Ravi Rao'] });
    expect(l.body).toMatch(/€1,200 \(€600 for each of 2 passengers\)/);
    expect(l.body).toMatch(/We \(Asha Rao, Ravi Rao\)/);
  });

  it('cancellation letter mentions notice and the replacement flight', () => {
    const s = sample('eu-short-cancel');
    const v = evaluate(s.facts, s.demoAnswers);
    const l = buildClaimLetter(v, s.facts, s.demoAnswers, details);
    expect(l.body).toMatch(/less than seven days/);
    expect(l.body).toMatch(/Article 5\(1\)\(c\)/);
    expect(l.body).toMatch(/5h 10m/);
  });

  it('asks the airline to prove extraordinary circumstances when the cause is unknown', () => {
    const s = sample('eu-longhaul-delay');
    const answers = { wasOnFlight: true };
    const v = evaluate(s.facts, answers);
    const l = buildClaimLetter(v, s.facts, answers, details);
    expect(l.body).toMatch(/not aware of any extraordinary circumstance/);
    expect(l.body).toMatch(/Article 5\(3\)/);
  });

  it('US letter asks for a cash refund, not compensation', () => {
    const s = sample('us-domestic-delay');
    const v = evaluate(s.facts, s.demoAnswers);
    const l = buildClaimLetter(v, s.facts, s.demoAnswers, details);
    expect(l.subject).toMatch(/14 CFR Part 260/);
    expect(l.body).toMatch(/do not accept a voucher/);
    expect(l.body).not.toMatch(/Article 7/);
  });

  it('follow-up and escalation name the right enforcement body', () => {
    const s = sample('eu-longhaul-delay');
    const v = evaluate(s.facts, s.demoAnswers);
    expect(enforcementBody(v, s.facts)).toMatch(/Luftfahrt-Bundesamt/);
    const f = buildFollowUpLetter(v, s.facts, details, '2026-09-01');
    expect(f.body).toMatch(/1 September 2026/);
    expect(f.body).toMatch(/Luftfahrt-Bundesamt/);
    const e = buildEscalationLetter(v, s.facts, details, '2026-09-01');
    expect(e.to).toMatch(/Luftfahrt-Bundesamt/);
  });
});
