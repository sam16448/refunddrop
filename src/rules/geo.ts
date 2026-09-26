import type { Airport, Region } from './types';

/**
 * Countries where EU261 applies to departing flights: the 27 EU member states,
 * the EEA states (Iceland, Liechtenstein, Norway) and Switzerland.
 * Outermost regions (e.g. Canary Islands, Réunion) use their parent state's code.
 */
export const EU261_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH',
]);

export const UK_COUNTRIES = new Set(['GB']);

export function regionOfCountry(country: string): Region {
  const c = country.toUpperCase();
  if (EU261_COUNTRIES.has(c)) return 'EU';
  if (UK_COUNTRIES.has(c)) return 'UK';
  if (c === 'US') return 'US';
  return 'OTHER';
}

export function regionOf(airport: Airport): Region {
  return regionOfCountry(airport.country);
}

const EARTH_RADIUS_KM = 6371.0088;

/**
 * Great-circle distance in km (haversine). EU261 Art. 7(4) requires the
 * great-circle method for distance bands.
 */
export function greatCircleKm(a: Pick<Airport, 'lat' | 'lon'>, b: Pick<Airport, 'lat' | 'lon'>): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
}
