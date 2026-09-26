/**
 * Sample flights for demo mode and for running the app without an API key.
 *
 * These are ILLUSTRATIVE: the routes and schedules are realistic, but the
 * disruptions are invented to show each rule path. The app labels them
 * "Sample" everywhere they appear.
 */

import { airport, carrier } from '../rules/reference';
import type { FlightFacts, PassengerAnswers } from '../rules/types';

export interface SampleFlight {
  id: string;
  title: string;
  subtitle: string;
  facts: FlightFacts;
  /** Answers pre-filled for a one-tap demo */
  demoAnswers: PassengerAnswers;
}

export const SAMPLE_FLIGHTS: SampleFlight[] = [
  {
    id: 'eu-longhaul-delay',
    title: 'Frankfurt → Mumbai',
    subtitle: 'Long-haul, 4h 12m late',
    facts: {
      flightNumber: 'LH 764',
      date: '2026-08-14',
      origin: airport('FRA'),
      destination: airport('BOM'),
      operatingCarrier: carrier('LH'),
      scheduledDepartureUtc: '2026-08-14T19:50:00Z',
      scheduledArrivalUtc: '2026-08-15T03:30:00Z',
      actualDepartureUtc: '2026-08-14T23:55:00Z',
      actualArrivalUtc: '2026-08-15T07:42:00Z',
      status: 'landed',
    },
    demoAnswers: { wasOnFlight: true, reason: 'technical' },
  },
  {
    id: 'eu-short-cancel',
    title: 'Barcelona → London Gatwick',
    subtitle: 'Cancelled 2 days before',
    facts: {
      flightNumber: 'VY 7820',
      date: '2026-08-22',
      origin: airport('BCN'),
      destination: airport('LGW'),
      operatingCarrier: carrier('VY'),
      scheduledDepartureUtc: '2026-08-22T16:05:00Z',
      scheduledArrivalUtc: '2026-08-22T18:10:00Z',
      status: 'cancelled',
    },
    demoAnswers: {
      wasOnFlight: true,
      cancellationNotice: 'under7',
      reroute: { took: true, arrivalDelayMinutes: 310, departedEarlyMinutes: 0 },
      reason: 'crew_shortage',
    },
  },
  {
    id: 'us-domestic-delay',
    title: 'San Francisco → Chicago',
    subtitle: 'US domestic, 3h 40m late',
    facts: {
      flightNumber: 'UA 1542',
      date: '2026-09-05',
      origin: airport('SFO'),
      destination: airport('ORD'),
      operatingCarrier: carrier('UA'),
      scheduledDepartureUtc: '2026-09-05T15:00:00Z',
      scheduledArrivalUtc: '2026-09-05T19:20:00Z',
      actualDepartureUtc: '2026-09-05T18:40:00Z',
      actualArrivalUtc: '2026-09-05T23:00:00Z',
      status: 'landed',
    },
    demoAnswers: { wasOnFlight: true, travelled: false },
  },
  {
    id: 'inbound-not-covered',
    title: 'Mumbai → London Heathrow',
    subtitle: 'Non-European airline into the UK',
    facts: {
      flightNumber: 'AI 131',
      date: '2026-09-10',
      origin: airport('BOM'),
      destination: airport('LHR'),
      operatingCarrier: carrier('AI'),
      scheduledDepartureUtc: '2026-09-10T08:30:00Z',
      scheduledArrivalUtc: '2026-09-10T18:05:00Z',
      actualDepartureUtc: '2026-09-10T13:40:00Z',
      actualArrivalUtc: '2026-09-10T23:10:00Z',
      status: 'landed',
    },
    demoAnswers: { wasOnFlight: true, reason: 'technical' },
  },
];
