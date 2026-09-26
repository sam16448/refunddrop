/**
 * Core types for the RefundDrop rules engine.
 *
 * The engine is deliberately split into two kinds of input:
 *  - FlightFacts: what a flight-data API can tell us (route, carrier, times, status)
 *  - PassengerAnswers: what only the passenger knows (reroutes, notice, stated cause)
 *
 * Everything the engine decides is returned as a Verdict with the rule it applied
 * at every step, so the result can always be explained and audited.
 */

export type Region = 'EU' | 'UK' | 'US' | 'OTHER';

export interface Airport {
  iata: string;
  name: string;
  city: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  lat: number;
  lon: number;
  /** IANA time zone, used only for display */
  tz?: string;
}

export interface Carrier {
  iata: string;
  name: string;
  /** Where the airline holds its operating licence */
  licence: Region;
  /** Where a written claim should go (best known public route) */
  claimUrl?: string;
}

export type FlightStatus = 'landed' | 'cancelled' | 'diverted' | 'scheduled' | 'unknown';

export interface FlightFacts {
  flightNumber: string;
  /** Local date of scheduled departure, YYYY-MM-DD */
  date: string;
  origin: Airport;
  destination: Airport;
  /** The airline that actually flew the aircraft (not the codeshare seller) */
  operatingCarrier: Carrier;
  /** Codeshare / marketing flight numbers, if any */
  marketedAs?: string[];
  scheduledDepartureUtc: string;
  scheduledArrivalUtc: string;
  actualDepartureUtc?: string;
  /** Actual arrival (gate/doors) — what EU261 measures delay against */
  actualArrivalUtc?: string;
  status: FlightStatus;
}

/** What the airline said caused the disruption, as the passenger reports it. */
export type DisruptionReason =
  | 'weather'
  | 'air_traffic_control'
  | 'security'
  | 'bird_strike'
  | 'medical_emergency'
  | 'political_unrest'
  | 'third_party_strike' // e.g. airport staff or ATC strike
  | 'airline_staff_strike'
  | 'technical'
  | 'crew_shortage'
  | 'operational' // "operational reasons", late inbound aircraft, scheduling
  | 'unknown';

export type NoticeBucket = 'under7' | '7to13' | '14plus';

export interface RerouteAnswer {
  took: boolean;
  /** Minutes the replacement arrived after the ORIGINAL scheduled arrival */
  arrivalDelayMinutes?: number;
  /** Minutes the replacement departed BEFORE the original scheduled departure (0 if later) */
  departedEarlyMinutes?: number;
}

export interface ConnectionAnswer {
  /** All legs were booked together under one reservation */
  sameBooking: boolean;
  /** Final destination airport of the whole journey */
  finalDestination?: Airport;
  /** Minutes late the passenger reached the final destination */
  finalArrivalDelayMinutes?: number;
}

export interface PassengerAnswers {
  /** Did the passenger hold a booking on this flight? */
  wasOnFlight?: boolean;
  /** Did the passenger actually travel (on this flight or an alternative)? Needed for US refunds. */
  travelled?: boolean;
  reason?: DisruptionReason;
  /** Cancellation only: when the airline told the passenger */
  cancellationNotice?: NoticeBucket;
  reroute?: RerouteAnswer;
  connection?: ConnectionAnswer;
  deniedBoarding?: {
    happened: boolean;
    voluntary?: boolean;
    /** Airline cited health, safety, security or travel documents */
    reasonableGrounds?: boolean;
  };
}

export type Outcome =
  /** All known facts point to compensation */
  | 'likely'
  /** Could go either way; depends on facts the passenger or airline hasn't confirmed */
  | 'possible'
  /** No compensation, but a ticket refund may be owed (US) */
  | 'refund_only'
  /** Covered by a regime, but the facts don't meet the threshold */
  | 'not_eligible'
  /** No supported passenger-rights regime covers this flight */
  | 'not_covered';

export type RegimeId = 'EU261' | 'UK261' | 'US_DOT' | 'NONE';

export type StepStatus = 'pass' | 'fail' | 'unknown' | 'info';

export interface ReasonStep {
  label: string;
  detail: string;
  status: StepStatus;
  /** Article or rule this step relies on, e.g. "EU261 Art. 7(1)" */
  ruleRef?: string;
}

export interface Money {
  amount: number;
  currency: 'EUR' | 'GBP' | 'USD';
}

export interface Estimate {
  /** Estimated compensation per passenger after any reduction */
  perPassenger: Money;
  /** Band amount before reduction */
  fullAmount: Money;
  reduced: boolean;
  distanceKm: number;
  band: 'short' | 'medium' | 'long';
}

export interface Verdict {
  regime: RegimeId;
  outcome: Outcome;
  headline: string;
  estimate?: Estimate;
  /** Delay at the point that counts (final arrival), minutes */
  delayMinutes?: number;
  steps: ReasonStep[];
  /** Rights that apply regardless of compensation (care, refund option, etc.) */
  otherRights: string[];
  /** Answers that are missing and could change the result */
  openQuestions: string[];
  claimAgainst: Carrier;
  rulesVersion: string;
  disclaimer: string;
}
