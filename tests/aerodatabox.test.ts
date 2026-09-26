import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/rules';
import { adbUtcToIso, normalizeAdbResponse } from '../src/services/aerodatabox';

/** Shape follows AeroDataBox "flight status by number and date"; values are made up. */
const arrived = [
  {
    number: 'LH 756',
    status: 'Arrived',
    codeshareStatus: 'IsOperator',
    airline: { name: 'Lufthansa', iata: 'LH', icao: 'DLH' },
    departure: {
      airport: { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt-am-Main', municipalityName: 'Frankfurt', countryCode: 'DE', timeZone: 'Europe/Berlin', location: { lat: 50.0333, lon: 8.5706 } },
      scheduledTime: { utc: '2026-07-20 11:40Z', local: '2026-07-20 13:40+02:00' },
      revisedTime: { utc: '2026-07-20 15:10Z', local: '2026-07-20 17:10+02:00' },
      runwayTime: { utc: '2026-07-20 15:22Z', local: '2026-07-20 17:22+02:00' },
    },
    arrival: {
      airport: { iata: 'BOM', icao: 'VABB', name: 'Mumbai', municipalityName: 'Mumbai', countryCode: 'IN', timeZone: 'Asia/Kolkata', location: { lat: 19.0887, lon: 72.8679 } },
      scheduledTime: { utc: '2026-07-20 20:25Z', local: '2026-07-21 01:55+05:30' },
      revisedTime: { utc: '2026-07-21 00:41Z', local: '2026-07-21 06:11+05:30' },
      runwayTime: { utc: '2026-07-21 00:30Z', local: '2026-07-21 06:00+05:30' },
    },
  },
  {
    number: 'AI 8756',
    status: 'Arrived',
    codeshareStatus: 'IsCodeshared',
    airline: { name: 'Air India', iata: 'AI' },
    departure: { airport: { iata: 'FRA', countryCode: 'DE' }, scheduledTime: { utc: '2026-07-20 11:40Z' } },
    arrival: { airport: { iata: 'BOM', countryCode: 'IN' }, scheduledTime: { utc: '2026-07-20 20:25Z' } },
  },
];

describe('AeroDataBox normalizer', () => {
  it('parses AeroDataBox UTC timestamps', () => {
    expect(adbUtcToIso('2026-07-20 11:40Z')).toBe('2026-07-20T11:40:00.000Z');
    expect(adbUtcToIso(undefined)).toBeUndefined();
    expect(adbUtcToIso('garbage')).toBeUndefined();
  });

  it('keeps the operating flight and records codeshare numbers', () => {
    const flights = normalizeAdbResponse(arrived, '2026-07-20');
    expect(flights).toHaveLength(1);
    expect(flights[0].operatingCarrier.name).toBe('Lufthansa');
    expect(flights[0].marketedAs).toEqual(['AI 8756']);
  });

  it('uses gate (revised) arrival time as the actual arrival', () => {
    const [f] = normalizeAdbResponse(arrived, '2026-07-20');
    expect(f.status).toBe('landed');
    expect(f.actualArrivalUtc).toBe('2026-07-21T00:41:00.000Z');
    expect(f.origin.tz).toBe('Europe/Berlin');
  });

  it('feeds straight into the rules engine', () => {
    const [f] = normalizeAdbResponse(arrived, '2026-07-20');
    const v = evaluate(f, { wasOnFlight: true, reason: 'technical' });
    expect(v.delayMinutes).toBe(256);
    expect(v.outcome).toBe('likely');
    expect(v.estimate?.perPassenger.amount).toBe(600);
  });

  it('maps cancellations and drops actual times', () => {
    const cancelled = [{ ...arrived[0], status: 'Canceled' }];
    const [f] = normalizeAdbResponse(cancelled, '2026-07-20');
    expect(f.status).toBe('cancelled');
    expect(f.actualArrivalUtc).toBeUndefined();
  });

  it('falls back to built-in airport coordinates when location is missing', () => {
    const noLoc = [
      {
        ...arrived[0],
        departure: { ...arrived[0].departure, airport: { iata: 'FRA', countryCode: 'DE' } },
      },
    ];
    const [f] = normalizeAdbResponse(noLoc, '2026-07-20');
    expect(f.origin.lat).toBeCloseTo(50.04, 1);
  });

  it('ignores empty or malformed responses', () => {
    expect(normalizeAdbResponse(null, '2026-07-20')).toEqual([]);
    expect(normalizeAdbResponse([{ number: 'XX 1' }], '2026-07-20')).toEqual([]);
  });
});
