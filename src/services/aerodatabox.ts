/**
 * Converts AeroDataBox "flight status by number and date" responses into
 * RefundDrop FlightFacts. Shared by the app and the Cloudflare Worker proxy.
 *
 * AeroDataBox returns times as "YYYY-MM-DD HH:mmZ" (utc) and
 * "YYYY-MM-DD HH:mm+hh:mm" (local). Fields are optional, so every access is defensive.
 */

import { AIRPORTS, carrier } from '../rules/reference';
import type { Airport, FlightFacts, FlightStatus } from '../rules/types';

export interface AdbTime {
  utc?: string;
  local?: string;
}

export interface AdbAirport {
  icao?: string;
  iata?: string;
  name?: string;
  shortName?: string;
  municipalityName?: string;
  countryCode?: string;
  timeZone?: string;
  location?: { lat?: number; lon?: number };
}

export interface AdbMovement {
  airport?: AdbAirport;
  scheduledTime?: AdbTime;
  revisedTime?: AdbTime;
  predictedTime?: AdbTime;
  runwayTime?: AdbTime;
}

export interface AdbFlight {
  number?: string;
  status?: string;
  codeshareStatus?: string;
  airline?: { name?: string; iata?: string; icao?: string };
  departure?: AdbMovement;
  arrival?: AdbMovement;
}

/** "2026-07-20 19:50Z" → "2026-07-20T19:50:00.000Z" */
export function adbUtcToIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = Date.parse(value.trim().replace(' ', 'T'));
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function mapStatus(status: string | undefined): FlightStatus {
  const s = (status ?? '').toLowerCase();
  if (s.startsWith('cancel')) return 'cancelled';
  if (s === 'arrived') return 'landed';
  if (s === 'diverted') return 'diverted';
  if (s === 'unknown' || s === '') return 'unknown';
  return 'scheduled';
}

function toAirport(a: AdbAirport | undefined): Airport | undefined {
  if (!a?.iata) return undefined;
  const known = AIRPORTS[a.iata.toUpperCase()];
  const lat = a.location?.lat ?? known?.lat;
  const lon = a.location?.lon ?? known?.lon;
  const country = a.countryCode?.toUpperCase() ?? known?.country;
  if (lat === undefined || lon === undefined || !country) return undefined;
  return {
    iata: a.iata.toUpperCase(),
    name: a.name ?? known?.name ?? a.iata,
    city: a.municipalityName ?? a.shortName ?? known?.city ?? a.iata,
    country,
    lat,
    lon,
    tz: a.timeZone ?? known?.tz,
  };
}

/** Normalize one AeroDataBox flight. Returns undefined if key fields are missing. */
export function normalizeAdbFlight(f: AdbFlight, date: string): FlightFacts | undefined {
  const origin = toAirport(f.departure?.airport);
  const destination = toAirport(f.arrival?.airport);
  const scheduledDepartureUtc = adbUtcToIso(f.departure?.scheduledTime?.utc);
  const scheduledArrivalUtc = adbUtcToIso(f.arrival?.scheduledTime?.utc);
  if (!origin || !destination || !scheduledDepartureUtc || !scheduledArrivalUtc || !f.airline?.iata) return undefined;

  const status = mapStatus(f.status);
  const landed = status === 'landed' || status === 'diverted';
  // Gate arrival ("revised" once arrived) is closest to "doors open"; runway time is the fallback.
  const actualArrivalUtc = landed
    ? adbUtcToIso(f.arrival?.revisedTime?.utc) ?? adbUtcToIso(f.arrival?.runwayTime?.utc)
    : undefined;
  const actualDepartureUtc =
    status === 'cancelled' ? undefined : adbUtcToIso(f.departure?.runwayTime?.utc) ?? adbUtcToIso(f.departure?.revisedTime?.utc);

  return {
    flightNumber: (f.number ?? '').replace(/\s+/g, ' ').trim(),
    date,
    origin,
    destination,
    operatingCarrier: carrier(f.airline.iata, f.airline.name),
    scheduledDepartureUtc,
    scheduledArrivalUtc,
    actualDepartureUtc,
    actualArrivalUtc,
    status,
  };
}

/**
 * Normalize a full response. Codeshare duplicates are dropped in favour of the
 * operating flight, and the marketing numbers are kept on it.
 */
export function normalizeAdbResponse(body: unknown, date: string): FlightFacts[] {
  const list: AdbFlight[] = Array.isArray(body) ? body : [];
  const operators = list.filter((f) => f.codeshareStatus !== 'IsCodeshared');
  const source = operators.length > 0 ? operators : list;
  const marketed = list
    .filter((f) => f.codeshareStatus === 'IsCodeshared' && f.number)
    .map((f) => f.number!.trim());
  return source
    .map((f) => normalizeAdbFlight(f, date))
    .filter((f): f is FlightFacts => Boolean(f))
    .map((f) => (marketed.length && operators.length ? { ...f, marketedAs: marketed } : f));
}
