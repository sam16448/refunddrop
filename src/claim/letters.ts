/**
 * Claim Kit letter generator.
 *
 * Deterministic templates built from the verdict, so every sentence that cites
 * law corresponds to a step the engine actually took. No AI writes these.
 */

import { formatDuration, formatMoney } from '../rules/engine';
import { greatCircleKm } from '../rules/geo';
import type { DisruptionReason, FlightFacts, PassengerAnswers, Verdict } from '../rules/types';

export interface ClaimDetails {
  passengerName: string;
  /** Other passengers on the same booking */
  otherPassengers: string[];
  bookingRef: string;
  email?: string;
}

export interface Letter {
  kind: 'claim' | 'followup' | 'escalation';
  to: string;
  subject: string;
  body: string;
}

/** Enforcement bodies for EU261 (by country of departure airport) and UK261. */
const ENFORCEMENT_BODIES: Record<string, string> = {
  AT: 'Agentur für Passagier- und Fahrgastrechte (apf)',
  BE: 'FPS Mobility and Transport',
  DE: 'Luftfahrt-Bundesamt (LBA)',
  DK: 'Danish Civil Aviation and Railway Authority',
  ES: 'Agencia Estatal de Seguridad Aérea (AESA)',
  FI: 'Consumer Disputes Board (Finland)',
  FR: "Direction générale de l'Aviation civile (DGAC)",
  GR: 'Hellenic Civil Aviation Authority',
  IE: 'Commission for Aviation Regulation',
  IT: "Ente Nazionale per l'Aviazione Civile (ENAC)",
  NL: 'Human Environment and Transport Inspectorate (ILT)',
  PL: 'Civil Aviation Authority of Poland (ULC)',
  PT: 'Autoridade Nacional da Aviação Civil (ANAC)',
  SE: 'Swedish National Board for Consumer Disputes (ARN)',
  CH: 'Federal Office of Civil Aviation (FOCA)',
  NO: 'Norwegian Transport Complaints Board',
  GB: 'Civil Aviation Authority (or the airline’s approved ADR scheme)',
};

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', DE: 'Germany', DK: 'Denmark', ES: 'Spain', FI: 'Finland', FR: 'France',
  GR: 'Greece', IE: 'Ireland', IT: 'Italy', NL: 'the Netherlands', PL: 'Poland', PT: 'Portugal',
  SE: 'Sweden', CH: 'Switzerland', NO: 'Norway', GB: 'the United Kingdom',
};

export function enforcementBody(verdict: Verdict, facts: FlightFacts): string {
  if (verdict.regime === 'UK261') return ENFORCEMENT_BODIES.GB;
  if (verdict.regime === 'US_DOT') return 'U.S. Department of Transportation, Office of Aviation Consumer Protection';
  // EU261: the body in the country where the incident happened (usually departure).
  const country = facts.origin.country in ENFORCEMENT_BODIES ? facts.origin.country : facts.destination.country;
  return (
    ENFORCEMENT_BODIES[country] ??
    `the national enforcement body in ${COUNTRY_NAMES[country] ?? facts.origin.country} (listed on the European Commission's air passenger rights pages)`
  );
}

function longDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function regulationName(verdict: Verdict): string {
  return verdict.regime === 'UK261'
    ? 'Regulation (EC) No 261/2004 as retained in UK law (UK261)'
    : 'Regulation (EC) No 261/2004 (EU261)';
}

function passengerList(d: ClaimDetails): string[] {
  return [d.passengerName, ...d.otherPassengers].map((n) => n.trim()).filter(Boolean);
}

function signature(d: ClaimDetails): string {
  const lines = ['Yours faithfully,', '', d.passengerName.trim() || '[your name]'];
  if (d.email?.trim()) lines.push(d.email.trim());
  return lines.join('\n');
}

function flightLine(facts: FlightFacts, d: ClaimDetails): string {
  const names = passengerList(d);
  const who = names.length > 1 ? `We (${names.join(', ')}) were passengers` : 'I was a passenger';
  return `${who} on flight ${facts.flightNumber} from ${facts.origin.name} (${facts.origin.iata}) to ${facts.destination.name} (${facts.destination.iata}) on ${longDate(facts.date)}, booking reference ${d.bookingRef || '[booking reference]'}, operated by ${facts.operatingCarrier.name}.`;
}

const IN_CONTROL_TEXT: Partial<Record<DisruptionReason, string>> = {
  technical:
    'I was told the disruption was caused by a technical problem with the aircraft. Technical problems arising in the normal operation of an airline are not extraordinary circumstances (CJEU C-549/07 Wallentin-Hermann).',
  crew_shortage:
    'I was told the disruption was caused by a crew shortage. Staffing is part of the normal exercise of an airline’s activity and is not an extraordinary circumstance.',
  airline_staff_strike:
    "I was told the disruption was caused by a strike by your own staff. Such a strike is not an extraordinary circumstance (CJEU C-28/20 Airhelp v SAS).",
  operational:
    'I was told the disruption was due to operational reasons. Scheduling and the late arrival of an aircraft are within the airline’s control and are not extraordinary circumstances.',
};

function causeParagraph(reason: DisruptionReason | undefined): string {
  const known = reason ? IN_CONTROL_TEXT[reason] : undefined;
  const ask =
    'If you consider that an extraordinary circumstance applies, please state precisely what it was and provide evidence of it and of the reasonable measures you took to avoid the disruption, as Article 5(3) requires.';
  return known ? `${known} ${ask}` : `I am not aware of any extraordinary circumstance that caused this disruption. ${ask}`;
}

function disruptionParagraph(verdict: Verdict, facts: FlightFacts, answers: PassengerAnswers): string {
  const reg = regulationName(verdict);
  const km = verdict.estimate?.distanceKm ?? Math.round(greatCircleKm(facts.origin, facts.destination));
  const band = verdict.estimate ? formatMoney(verdict.estimate.fullAmount) : '';
  const distance = `The great-circle distance of the journey is ${km.toLocaleString('en-US')} km, which corresponds to ${band} per passenger under Article 7(1).`;

  if (answers.deniedBoarding?.happened) {
    return `I was denied boarding against my will even though I held a confirmed reservation and presented myself for check-in on time. Under Article 4(3) of ${reg}, passengers denied boarding involuntarily are entitled to compensation under Article 7. ${distance}`;
  }
  if (facts.status === 'cancelled') {
    const notice =
      answers.cancellationNotice === '7to13'
        ? 'between seven days and two weeks before the scheduled departure'
        : 'less than seven days before the scheduled departure';
    const reroute =
      answers.reroute?.took && answers.reroute.arrivalDelayMinutes !== undefined
        ? ` The replacement flight I was offered reached my destination ${formatDuration(answers.reroute.arrivalDelayMinutes)} after the original scheduled arrival.`
        : '';
    return `The flight was cancelled and I was informed ${notice}.${reroute} Under Article 5(1)(c) of ${reg}, passengers are entitled to compensation under Article 7 in these circumstances. ${distance}`;
  }
  const delay = verdict.delayMinutes !== undefined ? formatDuration(verdict.delayMinutes) : 'more than three hours';
  return `The flight reached its final destination ${delay} after the scheduled arrival time. Under ${reg}, as interpreted by the Court of Justice of the EU in Sturgeon (C-402/07) and Nelson (C-581/10), passengers who reach their final destination three hours or more late are entitled to compensation under Article 7. ${distance}`;
}

function totalAmount(verdict: Verdict, d: ClaimDetails): string {
  const n = passengerList(d).length || 1;
  const per = verdict.estimate!.perPassenger;
  const total = formatMoney({ amount: per.amount * n, currency: per.currency });
  return n > 1 ? `${total} (${formatMoney(per)} for each of ${n} passengers)` : total;
}

export function buildClaimLetter(verdict: Verdict, facts: FlightFacts, answers: PassengerAnswers, d: ClaimDetails): Letter {
  const airline = facts.operatingCarrier.name;
  const to = `${airline} Customer Relations`;

  if (verdict.regime === 'US_DOT') {
    const cause = facts.status === 'cancelled' ? 'was cancelled' : `was delayed by ${formatDuration(verdict.delayMinutes ?? 0)}`;
    return {
      kind: 'claim',
      to,
      subject: `Refund request under 14 CFR Part 260 — ${facts.flightNumber}, ${longDate(facts.date)}`,
      body: [
        `Dear ${airline} Customer Relations,`,
        '',
        flightLine(facts, d),
        '',
        `The flight ${cause}, which is a cancellation or significant change under the U.S. Department of Transportation's refund rule (14 CFR Part 260). I chose not to travel and did not accept alternative transportation or travel credit.`,
        '',
        'I therefore request a full refund of the ticket price, including taxes, fees and any ancillary fees paid, to my original form of payment. The rule requires refunds within 7 business days for credit card purchases and 20 calendar days for other forms of payment. I do not accept a voucher or travel credit in place of a refund.',
        '',
        'Please confirm receipt of this request and the date the refund will be issued.',
        '',
        signature(d),
      ].join('\n'),
    };
  }

  const reg = verdict.regime === 'UK261' ? 'UK261' : 'EU261';
  return {
    kind: 'claim',
    to,
    subject: `Compensation claim under ${reg} — ${facts.flightNumber}, ${longDate(facts.date)} (${facts.origin.iata}–${facts.destination.iata})`,
    body: [
      `Dear ${airline} Customer Relations,`,
      '',
      flightLine(facts, d),
      '',
      disruptionParagraph(verdict, facts, answers),
      '',
      answers.deniedBoarding?.happened ? 'Extraordinary circumstances do not apply to denied boarding.' : causeParagraph(answers.reason),
      '',
      `I therefore request compensation of ${totalAmount(verdict, d)}, paid by bank transfer. Please confirm within 14 days of the date of this letter and I will send my bank details.`,
      '',
      'This claim is separate from, and does not affect, any refund or reimbursement of expenses I may also be owed under Articles 8 and 9.',
      '',
      signature(d),
    ].join('\n'),
  };
}

export function buildFollowUpLetter(verdict: Verdict, facts: FlightFacts, d: ClaimDetails, sentOn: string): Letter {
  const airline = facts.operatingCarrier.name;
  const body = enforcementBody(verdict, facts);
  return {
    kind: 'followup',
    to: `${airline} Customer Relations`,
    subject: `Second request — ${facts.flightNumber}, ${longDate(facts.date)}, booking ${d.bookingRef || '[booking reference]'}`,
    body: [
      `Dear ${airline} Customer Relations,`,
      '',
      `On ${longDate(sentOn)} I submitted a ${verdict.regime === 'US_DOT' ? 'refund request' : 'compensation claim'} for flight ${facts.flightNumber} on ${longDate(facts.date)}. I have not yet received a substantive reply.`,
      '',
      `Please respond within 7 days. If I do not receive a satisfactory answer, I will refer the matter to ${body}.`,
      '',
      signature(d),
    ].join('\n'),
  };
}

export function buildEscalationLetter(verdict: Verdict, facts: FlightFacts, d: ClaimDetails, sentOn: string): Letter {
  const body = enforcementBody(verdict, facts);
  const what = verdict.regime === 'US_DOT' ? 'a refund' : `compensation of ${verdict.estimate ? totalAmount(verdict, d) : 'the amount due'}`;
  return {
    kind: 'escalation',
    to: body,
    subject: `Complaint against ${facts.operatingCarrier.name} — ${facts.flightNumber}, ${longDate(facts.date)}`,
    body: [
      'Dear Sir or Madam,',
      '',
      `I wish to complain about ${facts.operatingCarrier.name}'s handling of my ${verdict.regime === 'US_DOT' ? 'refund request' : 'claim under ' + regulationName(verdict)}.`,
      '',
      flightLine(facts, d),
      '',
      `On ${longDate(sentOn)} I asked the airline for ${what}. I followed up, but the airline has not paid or given a valid reason for refusing.`,
      '',
      'I attach my booking confirmation, my original claim, the follow-up and any reply received. I would be grateful if you would review the complaint.',
      '',
      signature(d),
    ].join('\n'),
  };
}
