/**
 * Versioned rules configuration.
 *
 * Every threshold and amount the engine uses lives here, not in the logic.
 * The EU261 reform agreed in June 2026 is expected to apply from 2027; when it
 * does, a new config version is added and selected by flight date — the engine
 * code does not change.
 */

import type { Region } from './types';

export interface CompensationRules {
  version: string;
  /** Flights on or after this date use this rule set (inclusive, YYYY-MM-DD) */
  appliesFrom: string;
  currency: 'EUR' | 'GBP';
  /** Distance band edges in km (great-circle) */
  shortMaxKm: number;
  mediumMaxKm: number;
  amounts: { short: number; medium: number; long: number };
  /** Intra-area flights longer than mediumMaxKm are capped at the medium amount */
  intraAreaLongCappedToMedium: boolean;
  /** Minimum arrival delay (minutes) that triggers compensation */
  delayThresholdMinutes: number;
  /**
   * Art. 7(2): compensation may be halved when the passenger arrives within
   * this many minutes of the original schedule (per band). Also applied to
   * long-haul delays of 3–4 hours (CJEU Sturgeon / Nelson).
   */
  reductionWindowMinutes: { short: number; medium: number; long: number };
  /** Cancellations notified at least this many days ahead earn no compensation */
  cancellationNoticeDays: number;
  /** Delay (minutes) after which the passenger may abandon the trip for a refund (Art. 6(1)(c)(iii)) */
  refundOptionDelayMinutes: number;
  /** Regions whose airports / carriers this regime treats as "inside" */
  area: Region[];
}

export const EU261_V2004: CompensationRules = {
  version: 'EU261-2004 (as interpreted by CJEU, current to Sep 2026)',
  appliesFrom: '2005-02-17',
  currency: 'EUR',
  shortMaxKm: 1500,
  mediumMaxKm: 3500,
  amounts: { short: 250, medium: 400, long: 600 },
  intraAreaLongCappedToMedium: true,
  delayThresholdMinutes: 180,
  reductionWindowMinutes: { short: 120, medium: 180, long: 240 },
  cancellationNoticeDays: 14,
  refundOptionDelayMinutes: 300,
  area: ['EU'],
};

export const UK261_V2021: CompensationRules = {
  version: 'UK261 (retained EU261, current to Sep 2026)',
  appliesFrom: '2021-01-01',
  currency: 'GBP',
  shortMaxKm: 1500,
  mediumMaxKm: 3500,
  amounts: { short: 220, medium: 350, long: 520 },
  intraAreaLongCappedToMedium: true,
  delayThresholdMinutes: 180,
  reductionWindowMinutes: { short: 120, medium: 180, long: 240 },
  cancellationNoticeDays: 14,
  refundOptionDelayMinutes: 300,
  area: ['UK'],
};

export interface UsRefundRules {
  version: string;
  domesticSignificantDelayMinutes: number;
  internationalSignificantDelayMinutes: number;
  cardRefundBusinessDays: number;
  otherRefundCalendarDays: number;
}

export const US_DOT_2024: UsRefundRules = {
  version: 'US DOT Refunds rule (14 CFR 260), current to Sep 2026',
  domesticSignificantDelayMinutes: 180,
  internationalSignificantDelayMinutes: 360,
  cardRefundBusinessDays: 7,
  otherRefundCalendarDays: 20,
};

/** Pick the rule set in force for a flight date. Only one version exists today. */
export function eu261For(_date: string): CompensationRules {
  return EU261_V2004;
}

export function uk261For(_date: string): CompensationRules {
  return UK261_V2021;
}

export const DISCLAIMER =
  'RefundDrop gives general information based on published passenger-rights rules. ' +
  'It is not legal advice. Final eligibility depends on facts the airline must confirm, ' +
  'such as the cause of the disruption.';
