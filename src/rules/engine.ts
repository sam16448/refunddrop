/**
 * RefundDrop eligibility engine.
 *
 * Pure functions only: no network, no storage, no AI. Given the same facts and
 * answers it always returns the same verdict, and every decision is recorded as
 * a ReasonStep with the rule it relied on.
 */

import { DISCLAIMER, US_DOT_2024, eu261For, uk261For, type CompensationRules } from './config';
import { greatCircleKm, minutesBetween, regionOf } from './geo';
import { isKnownCarrier } from './reference';
import type {
  Airport,
  DisruptionReason,
  Estimate,
  FlightFacts,
  Money,
  Outcome,
  PassengerAnswers,
  ReasonStep,
  RegimeId,
  Verdict,
} from './types';

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export interface Scope {
  regime: RegimeId;
  rules?: CompensationRules;
  /** Inbound flight on a carrier whose licence we don't know */
  carrierUncertain: boolean;
  usRefundApplies: boolean;
  steps: ReasonStep[];
}

export function determineScope(facts: FlightFacts): Scope {
  const dep = regionOf(facts.origin);
  const arr = regionOf(facts.destination);
  const lic = facts.operatingCarrier.licence;
  const known = isKnownCarrier(facts.operatingCarrier.iata);
  const carrierName = facts.operatingCarrier.name;
  const steps: ReasonStep[] = [];
  const usRefundApplies = dep === 'US' || arr === 'US';

  const euApplies = dep === 'EU' || (arr === 'EU' && lic === 'EU');
  const ukApplies = dep === 'UK' || (arr === 'UK' && (lic === 'UK' || lic === 'EU'));

  // Departure regime wins when both could apply; a passenger can only be paid once.
  let regime: RegimeId = 'NONE';
  if (dep === 'EU') regime = 'EU261';
  else if (dep === 'UK') regime = 'UK261';
  else if (euApplies) regime = 'EU261';
  else if (ukApplies) regime = 'UK261';

  if (regime === 'EU261') {
    steps.push({
      label: 'Covered by EU261',
      detail:
        dep === 'EU'
          ? `The flight departs from ${facts.origin.city}, inside the EU/EEA/Switzerland. EU261 covers every airline on departures from there.`
          : `The flight lands in ${facts.destination.city} and is operated by ${carrierName}, an EU-licensed airline.`,
      status: 'pass',
      ruleRef: dep === 'EU' ? 'EU261 Art. 3(1)(a)' : 'EU261 Art. 3(1)(b)',
    });
    return { regime, rules: eu261For(facts.date), carrierUncertain: false, usRefundApplies, steps };
  }

  if (regime === 'UK261') {
    steps.push({
      label: 'Covered by UK261',
      detail:
        dep === 'UK'
          ? `The flight departs from ${facts.origin.city} in the UK. UK261 covers every airline on UK departures.`
          : `The flight lands in the UK and is operated by ${carrierName}, a UK- or EU-licensed airline.`,
      status: 'pass',
      ruleRef: dep === 'UK' ? 'UK261 Art. 3(1)(a)' : 'UK261 Art. 3(1)(b)',
    });
    return { regime, rules: uk261For(facts.date), carrierUncertain: false, usRefundApplies, steps };
  }

  // Inbound to EU/UK on an airline we can't classify: could still be covered.
  if ((arr === 'EU' || arr === 'UK') && !known) {
    const rules = arr === 'EU' ? eu261For(facts.date) : uk261For(facts.date);
    steps.push({
      label: `Coverage depends on ${carrierName}'s licence`,
      detail: `Flights into ${arr === 'EU' ? 'the EU' : 'the UK'} from outside are covered only if the operating airline is ${arr === 'EU' ? 'EU' : 'UK or EU'}-licensed. We couldn't confirm ${carrierName}'s licence.`,
      status: 'unknown',
      ruleRef: arr === 'EU' ? 'EU261 Art. 3(1)(b)' : 'UK261 Art. 3(1)(b)',
    });
    return {
      regime: arr === 'EU' ? 'EU261' : 'UK261',
      rules,
      carrierUncertain: true,
      usRefundApplies,
      steps,
    };
  }

  if ((arr === 'EU' || arr === 'UK') && dep !== 'EU' && dep !== 'UK') {
    steps.push({
      label: 'Not covered by EU261 or UK261',
      detail: `The flight departs from outside Europe and ${carrierName} is not an ${arr === 'EU' ? 'EU' : 'EU or UK'}-licensed airline, so European compensation rules don't apply.`,
      status: 'fail',
      ruleRef: arr === 'EU' ? 'EU261 Art. 3(1)(b)' : 'UK261 Art. 3(1)(b)',
    });
  }

  return {
    regime: usRefundApplies ? 'US_DOT' : 'NONE',
    carrierUncertain: false,
    usRefundApplies,
    steps,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXTRAORDINARY: ReadonlySet<DisruptionReason> = new Set([
  'weather',
  'air_traffic_control',
  'security',
  'bird_strike',
  'medical_emergency',
  'political_unrest',
  'third_party_strike',
]);

const WITHIN_AIRLINE_CONTROL: ReadonlySet<DisruptionReason> = new Set([
  'technical',
  'crew_shortage',
  'airline_staff_strike',
  'operational',
]);

export const REASON_LABELS: Record<DisruptionReason, string> = {
  weather: 'Bad weather',
  air_traffic_control: 'Air traffic control restrictions',
  security: 'Security risk',
  bird_strike: 'Bird strike',
  medical_emergency: 'Medical emergency on board',
  political_unrest: 'Political unrest',
  third_party_strike: 'Strike by airport or ATC staff',
  airline_staff_strike: "Strike by the airline's own staff",
  technical: 'Technical problem with the aircraft',
  crew_shortage: 'Crew shortage',
  operational: 'Operational reasons / late incoming aircraft',
  unknown: "Airline didn't say",
};

const CURRENCY_SYMBOL: Record<Money['currency'], string> = { EUR: '€', GBP: '£', USD: '$' };

export function formatMoney(m: Money): string {
  return `${CURRENCY_SYMBOL[m.currency]}${m.amount.toLocaleString('en-US')}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return h === 0 ? `${m}m` : `${h}h ${m.toString().padStart(2, '0')}m`;
}

type Band = Estimate['band'];

function bandFor(km: number, rules: CompensationRules): Band {
  if (km <= rules.shortMaxKm) return 'short';
  if (km <= rules.mediumMaxKm) return 'medium';
  return 'long';
}

function inArea(a: Airport, rules: CompensationRules): boolean {
  return rules.area.includes(regionOf(a));
}

function buildEstimate(
  origin: Airport,
  end: Airport,
  rules: CompensationRules,
  reduced: boolean,
): { estimate: Estimate; step: ReasonStep } {
  const distanceKm = Math.round(greatCircleKm(origin, end));
  let band = bandFor(distanceKm, rules);
  const intraArea = inArea(origin, rules) && inArea(end, rules);
  const capped = rules.intraAreaLongCappedToMedium && intraArea && band === 'long';
  const amount = capped ? rules.amounts.medium : rules.amounts[band];
  if (capped) band = 'medium';
  const full: Money = { amount, currency: rules.currency };
  const per: Money = { amount: reduced ? amount / 2 : amount, currency: rules.currency };
  const bandText =
    band === 'short'
      ? `up to ${rules.shortMaxKm.toLocaleString('en-US')} km`
      : band === 'medium'
        ? capped
          ? `over ${rules.mediumMaxKm.toLocaleString('en-US')} km but within one area (capped at the middle band)`
          : `${rules.shortMaxKm.toLocaleString('en-US')}–${rules.mediumMaxKm.toLocaleString('en-US')} km`
        : `over ${rules.mediumMaxKm.toLocaleString('en-US')} km`;
  return {
    estimate: { perPassenger: per, fullAmount: full, reduced, distanceKm, band },
    step: {
      label: `${distanceKm.toLocaleString('en-US')} km → ${formatMoney(full)} band`,
      detail: `Great-circle distance ${origin.iata}–${end.iata} is ${distanceKm.toLocaleString('en-US')} km, which is ${bandText}.`,
      status: 'info',
      ruleRef: capped ? 'EU261 Art. 7(1)(b)' : 'EU261 Art. 7(1), 7(4)',
    },
  };
}

function reasonStep(reason: DisruptionReason | undefined, regimeLabel: string): ReasonStep {
  if (!reason || reason === 'unknown') {
    return {
      label: 'Cause not confirmed',
      detail:
        'Airlines can refuse compensation only for extraordinary circumstances they could not have avoided (e.g. storms, ATC restrictions). Most technical faults and crew problems do not count. Your claim letter will ask the airline to state and prove the cause.',
      status: 'unknown',
      ruleRef: `${regimeLabel} Art. 5(3); CJEU C-549/07 Wallentin-Hermann`,
    };
  }
  if (EXTRAORDINARY.has(reason)) {
    return {
      label: `${REASON_LABELS[reason]} is usually an extraordinary circumstance`,
      detail:
        'If the airline can prove this cause and that it took all reasonable measures, it does not have to pay compensation. You still keep your rights to care and to a refund or rebooking.',
      status: 'fail',
      ruleRef: `${regimeLabel} Art. 5(3), Recital 14`,
    };
  }
  const detail =
    reason === 'operational'
      ? 'Scheduling and late incoming aircraft are normally within the airline\'s control. It could only refuse if the earlier delay was itself caused by an extraordinary event.'
      : reason === 'airline_staff_strike'
        ? "A strike by the airline's own staff is part of its normal business and does not excuse it."
        : 'This is part of the airline\'s normal operations, so it is not an extraordinary circumstance.';
  return {
    label: `${REASON_LABELS[reason]} is within the airline's control`,
    detail,
    status: 'pass',
    ruleRef:
      reason === 'technical'
        ? `${regimeLabel} Art. 5(3); CJEU C-549/07 Wallentin-Hermann`
        : reason === 'airline_staff_strike'
          ? `${regimeLabel} Art. 5(3); CJEU C-28/20 Airhelp v SAS`
          : `${regimeLabel} Art. 5(3)`,
  };
}

function combineOutcome(steps: ReasonStep[]): Outcome {
  if (steps.some((s) => s.status === 'fail')) return 'not_eligible';
  if (steps.some((s) => s.status === 'unknown')) return 'possible';
  return 'likely';
}

function careRights(rules: CompensationRules, delayMinutes: number | undefined, kind: 'delay' | 'cancel' | 'denied'): string[] {
  const out: string[] = [];
  if (kind === 'delay') {
    out.push('Meals and refreshments while you wait, and a hotel plus transport if the delay runs overnight (Art. 9).');
    if (delayMinutes !== undefined && delayMinutes >= rules.refundOptionDelayMinutes) {
      out.push('Because the delay reached 5 hours, you could have chosen not to fly and taken a full ticket refund instead (Art. 6(1)(c)(iii)).');
    }
  } else {
    out.push('Your choice of a full refund or a replacement flight (Art. 8).');
    out.push('Meals, refreshments and a hotel if needed while waiting for the replacement (Art. 9).');
  }
  out.push('Receipts for reasonable costs the airline should have covered (meals, hotel, taxis) can be claimed back separately.');
  return out;
}

function usRefundNote(facts: FlightFacts): string {
  const domestic = regionOf(facts.origin) === 'US' && regionOf(facts.destination) === 'US';
  const threshold = domestic ? '3 hours' : '6 hours';
  return `US DOT rules also apply: if the flight was cancelled or delayed ${threshold}+ and you chose not to travel, you are owed a cash refund.`;
}

// ---------------------------------------------------------------------------
// Compensation (EU261 / UK261)
// ---------------------------------------------------------------------------

function evaluateCompensation(facts: FlightFacts, answers: PassengerAnswers, scope: Scope): Verdict {
  const rules = scope.rules!;
  const regimeLabel = scope.regime === 'UK261' ? 'UK261' : 'EU261';
  const steps: ReasonStep[] = [...scope.steps];
  const openQuestions: string[] = [];
  let otherRights: string[] = [];
  let delayMinutes: number | undefined;
  let reduced = false;

  if (scope.carrierUncertain) {
    openQuestions.push(`Is ${facts.operatingCarrier.name} licensed in the ${scope.regime === 'EU261' ? 'EU' : 'UK or EU'}?`);
  }

  if (facts.marketedAs && facts.marketedAs.length > 0) {
    steps.push({
      label: `Claim from ${facts.operatingCarrier.name}`,
      detail: `This flight was sold as ${facts.marketedAs.join(', ')} but operated by ${facts.operatingCarrier.name}. The operating airline owes compensation.`,
      status: 'info',
      ruleRef: `${regimeLabel} Art. 2(b), 3(5)`,
    });
  }

  if (answers.wasOnFlight === false) {
    steps.push({
      label: 'You need a confirmed booking',
      detail: 'Only passengers with a confirmed reservation on the flight can claim.',
      status: 'fail',
      ruleRef: `${regimeLabel} Art. 3(2)`,
    });
  }

  // Journey end: final destination when all legs were on one booking.
  const conn = answers.connection;
  const journeyEnd = conn?.sameBooking && conn.finalDestination ? conn.finalDestination : facts.destination;
  if (conn?.sameBooking && conn.finalDestination) {
    steps.push({
      label: `Measured to your final destination, ${conn.finalDestination.city}`,
      detail: 'Your connecting flights were on one booking, so both the delay and the distance count to where you finally arrived.',
      status: 'info',
      ruleRef: 'CJEU C-11/11 Folkerts; C-559/16 Bossen',
    });
  } else if (conn && !conn.sameBooking) {
    steps.push({
      label: 'Separate bookings are judged one flight at a time',
      detail: 'A missed connection on a separately booked ticket does not count. Only this flight\'s own delay matters.',
      status: 'info',
      ruleRef: `${regimeLabel} Art. 2(h)`,
    });
  }

  const denied = answers.deniedBoarding?.happened === true;
  const reroute = answers.reroute;

  if (denied) {
    // -------------------------------------------------------------- denied boarding
    const db = answers.deniedBoarding!;
    if (db.voluntary === true) {
      steps.push({
        label: 'You gave up your seat voluntarily',
        detail: 'Volunteers receive whatever benefits they agreed with the airline instead of fixed compensation.',
        status: 'fail',
        ruleRef: `${regimeLabel} Art. 4(1)`,
      });
    } else if (db.reasonableGrounds === true) {
      steps.push({
        label: 'The airline cited valid grounds',
        detail: 'Boarding can be refused for health, safety, security or missing travel documents without compensation.',
        status: 'fail',
        ruleRef: `${regimeLabel} Art. 2(j)`,
      });
    } else {
      steps.push({
        label: 'Involuntary denied boarding',
        detail: 'You were refused boarding against your will (for example, overbooking). Compensation is due regardless of how late you arrived, and extraordinary circumstances do not apply.',
        status: db.voluntary === undefined ? 'unknown' : 'pass',
        ruleRef: `${regimeLabel} Art. 4(3)`,
      });
      if (db.voluntary === undefined) openQuestions.push('Did you volunteer to give up your seat?');
    }
    otherRights = careRights(rules, undefined, 'denied');
  } else if (facts.status === 'cancelled') {
    // -------------------------------------------------------------- cancellation
    const notice = answers.cancellationNotice;
    if (!notice) {
      steps.push({
        label: 'When were you told?',
        detail: 'Cancellations announced 14 or more days before departure do not earn compensation.',
        status: 'unknown',
        ruleRef: `${regimeLabel} Art. 5(1)(c)`,
      });
      openQuestions.push('When did the airline tell you about the cancellation?');
    } else if (notice === '14plus') {
      steps.push({
        label: 'Told 14+ days before departure',
        detail: 'Early notice means no compensation. You are still owed a refund or a replacement flight.',
        status: 'fail',
        ruleRef: `${regimeLabel} Art. 5(1)(c)(i)`,
      });
    } else {
      const limits =
        notice === '7to13'
          ? { early: 120, late: 240, ref: 'Art. 5(1)(c)(ii)', text: '7–13 days' }
          : { early: 60, late: 120, ref: 'Art. 5(1)(c)(iii)', text: 'under 7 days' };
      steps.push({
        label: `Short-notice cancellation (${limits.text})`,
        detail: 'Cancellations notified less than 14 days before departure qualify unless the replacement flight kept you close to your original times.',
        status: 'pass',
        ruleRef: `${regimeLabel} ${limits.ref}`,
      });
      if (reroute?.took) {
        const late = reroute.arrivalDelayMinutes;
        const early = reroute.departedEarlyMinutes ?? 0;
        if (late === undefined) {
          steps.push({
            label: 'Replacement arrival time needed',
            detail: `No compensation if the replacement left no more than ${limits.early / 60}h early and arrived less than ${limits.late / 60}h late.`,
            status: 'unknown',
            ruleRef: `${regimeLabel} ${limits.ref}`,
          });
          openQuestions.push('How late did your replacement flight arrive?');
        } else if (early <= limits.early && late < limits.late) {
          steps.push({
            label: 'Replacement kept you close to schedule',
            detail: `Your replacement arrived ${formatDuration(late)} late, inside the ${limits.late / 60}h allowance, so no compensation is due.`,
            status: 'fail',
            ruleRef: `${regimeLabel} ${limits.ref}`,
          });
        } else {
          delayMinutes = late;
          steps.push({
            label: `Replacement arrived ${formatDuration(late)} late`,
            detail: 'That is outside the allowance for a replacement flight, so compensation still applies.',
            status: 'pass',
            ruleRef: `${regimeLabel} ${limits.ref}`,
          });
        }
      }
      steps.push(reasonStep(answers.reason, regimeLabel));
    }
    otherRights = careRights(rules, undefined, 'cancel');
  } else {
    // -------------------------------------------------------------- delay
    if (conn?.sameBooking && conn.finalArrivalDelayMinutes !== undefined) {
      delayMinutes = conn.finalArrivalDelayMinutes;
    } else if (facts.actualArrivalUtc) {
      delayMinutes = minutesBetween(facts.scheduledArrivalUtc, facts.actualArrivalUtc);
    }

    if (delayMinutes === undefined) {
      steps.push({
        label: 'Arrival time not available yet',
        detail: 'Compensation depends on how late you reached your destination. We could not find an actual arrival time.',
        status: 'unknown',
        ruleRef: 'CJEU C-402/07 Sturgeon',
      });
      openQuestions.push('What time did you actually arrive?');
    } else if (delayMinutes < rules.delayThresholdMinutes) {
      steps.push({
        label: `Arrived ${delayMinutes <= 0 ? 'on time' : formatDuration(delayMinutes) + ' late'}`,
        detail: `Compensation starts at an arrival delay of ${rules.delayThresholdMinutes / 60} hours. Departure delay does not count; what matters is when the doors opened at your destination.`,
        status: 'fail',
        ruleRef: 'CJEU C-402/07 Sturgeon; C-452/13 Germanwings',
      });
    } else {
      steps.push({
        label: `Arrived ${formatDuration(delayMinutes)} late`,
        detail: `That is over the ${rules.delayThresholdMinutes / 60}-hour arrival-delay threshold, measured when the doors opened at your destination.`,
        status: 'pass',
        ruleRef: 'CJEU C-402/07 Sturgeon; C-452/13 Germanwings',
      });
    }
    steps.push(reasonStep(answers.reason, regimeLabel));
    otherRights = careRights(rules, delayMinutes, 'delay');
  }

  // ---------------------------------------------------------------- amount
  // Art. 7(2) halving: rerouted arrival (cancellation / denied boarding) or
  // long-haul delay of 3–4h, within the band's window.
  const provisional = buildEstimate(facts.origin, journeyEnd, rules, false);
  const window = rules.reductionWindowMinutes[provisional.estimate.band];
  if (denied && reroute?.took && reroute.arrivalDelayMinutes !== undefined) {
    delayMinutes = reroute.arrivalDelayMinutes;
    reduced = reroute.arrivalDelayMinutes <= window;
  } else if (facts.status === 'cancelled' && reroute?.took && delayMinutes !== undefined) {
    reduced = delayMinutes <= window;
  } else if (!denied && facts.status !== 'cancelled' && delayMinutes !== undefined && delayMinutes >= rules.delayThresholdMinutes) {
    reduced = delayMinutes < window;
  }
  const { estimate, step: distanceStep } = buildEstimate(facts.origin, journeyEnd, rules, reduced);
  steps.push(distanceStep);
  if (reduced) {
    steps.push({
      label: 'Amount may be halved',
      detail: `You arrived within ${window / 60} hours of the original time on a route of this length, so the airline may reduce compensation by 50%.`,
      status: 'info',
      ruleRef: `${regimeLabel} Art. 7(2); CJEU C-402/07 Sturgeon`,
    });
  }

  if (scope.usRefundApplies) otherRights.push(usRefundNote(facts));

  const outcome = combineOutcome(steps);
  const amountText = formatMoney(estimate.perPassenger);
  const headline =
    outcome === 'likely'
      ? `Likely eligible · about ${amountText} per passenger`
      : outcome === 'possible'
        ? `Possibly eligible · up to ${formatMoney(estimate.reduced ? estimate.perPassenger : estimate.fullAmount)} per passenger`
        : 'Not eligible for compensation';

  return {
    regime: scope.regime,
    outcome,
    headline,
    estimate: outcome === 'not_eligible' ? undefined : estimate,
    delayMinutes,
    steps,
    otherRights,
    openQuestions,
    claimAgainst: facts.operatingCarrier,
    rulesVersion: rules.version,
    disclaimer: DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// US DOT refunds
// ---------------------------------------------------------------------------

function evaluateUsRefund(facts: FlightFacts, answers: PassengerAnswers, scope: Scope): Verdict {
  const rules = US_DOT_2024;
  const steps: ReasonStep[] = [...scope.steps];
  const openQuestions: string[] = [];
  const domestic = regionOf(facts.origin) === 'US' && regionOf(facts.destination) === 'US';
  const threshold = domestic ? rules.domesticSignificantDelayMinutes : rules.internationalSignificantDelayMinutes;

  steps.push({
    label: 'US rules: refunds, not compensation',
    detail: 'US law does not require airlines to pay cash compensation for delays or cancellations. It does require a cash refund if the flight was significantly disrupted and you chose not to travel.',
    status: 'info',
    ruleRef: '14 CFR 260.6',
  });

  const depDelay =
    facts.actualDepartureUtc !== undefined ? minutesBetween(facts.scheduledDepartureUtc, facts.actualDepartureUtc) : undefined;
  const arrDelay =
    facts.actualArrivalUtc !== undefined ? minutesBetween(facts.scheduledArrivalUtc, facts.actualArrivalUtc) : undefined;
  const worst = Math.max(depDelay ?? -Infinity, arrDelay ?? -Infinity);
  const delayMinutes = Number.isFinite(worst) ? worst : undefined;

  let significant: boolean | undefined;
  if (facts.status === 'cancelled') {
    significant = true;
    steps.push({ label: 'Flight cancelled', detail: 'A cancellation always qualifies for a refund if you do not travel.', status: 'pass', ruleRef: '14 CFR 260.6(a)' });
  } else if (delayMinutes === undefined) {
    steps.push({ label: 'Delay not known yet', detail: 'We could not find actual departure or arrival times.', status: 'unknown' });
    openQuestions.push('How late did the flight leave or arrive?');
  } else if (delayMinutes >= threshold) {
    significant = true;
    steps.push({
      label: `Delayed ${formatDuration(delayMinutes)} — a significant change`,
      detail: `For ${domestic ? 'domestic' : 'international'} flights, a change of ${threshold / 60}+ hours to departure or arrival is significant.`,
      status: 'pass',
      ruleRef: '14 CFR 260.2 (significant change)',
    });
  } else {
    significant = false;
    steps.push({
      label: `Delayed ${delayMinutes <= 0 ? '0m' : formatDuration(delayMinutes)} — below the refund threshold`,
      detail: `For ${domestic ? 'domestic' : 'international'} flights, the refund right starts at ${threshold / 60} hours.`,
      status: 'fail',
      ruleRef: '14 CFR 260.2 (significant change)',
    });
  }

  if (significant) {
    if (answers.travelled === true) {
      steps.push({
        label: 'You travelled anyway',
        detail: 'The refund right applies only if you did not fly and did not accept an alternative or voucher.',
        status: 'fail',
        ruleRef: '14 CFR 260.6(a)',
      });
    } else if (answers.travelled === undefined) {
      steps.push({ label: 'Did you still fly?', detail: 'The refund is owed only if you chose not to travel.', status: 'unknown', ruleRef: '14 CFR 260.6(a)' });
      openQuestions.push('Did you take this flight or an alternative?');
    } else {
      steps.push({
        label: 'You chose not to travel',
        detail: `The airline must refund the full fare, taxes and bag fees in cash — within ${rules.cardRefundBusinessDays} business days for card payments, ${rules.otherRefundCalendarDays} days otherwise. A voucher is only allowed if you agree to it.`,
        status: 'pass',
        ruleRef: '14 CFR 260.6, 260.9',
      });
    }
  }

  const failed = steps.some((s) => s.status === 'fail');
  const unknown = steps.some((s) => s.status === 'unknown');
  const outcome: Outcome = failed ? 'not_eligible' : 'refund_only';
  const headline = failed
    ? 'No refund or compensation owed'
    : unknown
      ? 'Cash refund owed if you chose not to fly'
      : 'Full cash refund owed';

  return {
    regime: 'US_DOT',
    outcome,
    headline,
    delayMinutes,
    steps,
    otherRights: [
      'Many US airlines promise meal vouchers for controllable delays of 3+ hours in their customer service plans — check the airline\'s commitment page.',
    ],
    openQuestions,
    claimAgainst: facts.operatingCarrier,
    rulesVersion: rules.version,
    disclaimer: DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function evaluate(facts: FlightFacts, answers: PassengerAnswers = {}): Verdict {
  const scope = determineScope(facts);
  if (scope.rules) return evaluateCompensation(facts, answers, scope);
  if (scope.usRefundApplies) return evaluateUsRefund(facts, answers, scope);

  return {
    regime: 'NONE',
    outcome: 'not_covered',
    headline: 'Not covered by the rules we support yet',
    steps: scope.steps.length
      ? scope.steps
      : [
          {
            label: 'Outside EU, UK and US rules',
            detail: 'RefundDrop currently covers EU261, UK261 and US DOT refunds. Other countries have their own passenger rules we have not added yet.',
            status: 'info',
          },
        ],
    otherRights: ['You may still have rights under the airline\'s own conditions of carriage or local law.'],
    openQuestions: [],
    claimAgainst: facts.operatingCarrier,
    rulesVersion: 'n/a',
    disclaimer: DISCLAIMER,
  };
}
