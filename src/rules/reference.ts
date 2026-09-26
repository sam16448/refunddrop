import type { Airport, Carrier } from './types';

/**
 * Reference data used when the flight API omits a field and for the sample
 * flights. Live lookups take coordinates from the API response instead.
 * Coordinates are airport reference points, rounded to 4 decimals.
 */
const AIRPORT_LIST: Airport[] = [
  // EU / EEA / Switzerland
  { iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR', lat: 49.0097, lon: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'FR', lat: 48.7262, lon: 2.3652 },
  { iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'DE', lat: 50.0379, lon: 8.5622 },
  { iata: 'MUC', name: 'Munich', city: 'Munich', country: 'DE', lat: 48.3538, lon: 11.7861 },
  { iata: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'DE', lat: 52.3667, lon: 13.5033 },
  { iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL', lat: 52.3105, lon: 4.7683 },
  { iata: 'MAD', name: 'Madrid Barajas', city: 'Madrid', country: 'ES', lat: 40.4983, lon: -3.5676 },
  { iata: 'BCN', name: 'Barcelona El Prat', city: 'Barcelona', country: 'ES', lat: 41.2974, lon: 2.0833 },
  { iata: 'PMI', name: 'Palma de Mallorca', city: 'Palma', country: 'ES', lat: 39.5517, lon: 2.7388 },
  { iata: 'TFS', name: 'Tenerife South', city: 'Tenerife', country: 'ES', lat: 28.0445, lon: -16.5725 },
  { iata: 'LPA', name: 'Gran Canaria', city: 'Las Palmas', country: 'ES', lat: 27.9319, lon: -15.3866 },
  { iata: 'FCO', name: 'Rome Fiumicino', city: 'Rome', country: 'IT', lat: 41.8003, lon: 12.2389 },
  { iata: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'IT', lat: 45.6306, lon: 8.7281 },
  { iata: 'LIS', name: 'Lisbon Humberto Delgado', city: 'Lisbon', country: 'PT', lat: 38.7813, lon: -9.1359 },
  { iata: 'DUB', name: 'Dublin', city: 'Dublin', country: 'IE', lat: 53.4213, lon: -6.2701 },
  { iata: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'DK', lat: 55.618, lon: 12.6508 },
  { iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE', lat: 59.6498, lon: 17.9238 },
  { iata: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO', lat: 60.1976, lon: 11.1004 },
  { iata: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'FI', lat: 60.3172, lon: 24.9633 },
  { iata: 'VIE', name: 'Vienna', city: 'Vienna', country: 'AT', lat: 48.1103, lon: 16.5697 },
  { iata: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'CH', lat: 47.4582, lon: 8.5555 },
  { iata: 'GVA', name: 'Geneva', city: 'Geneva', country: 'CH', lat: 46.2381, lon: 6.109 },
  { iata: 'BRU', name: 'Brussels', city: 'Brussels', country: 'BE', lat: 50.9014, lon: 4.4844 },
  { iata: 'ATH', name: 'Athens', city: 'Athens', country: 'GR', lat: 37.9364, lon: 23.9445 },
  { iata: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'PL', lat: 52.1657, lon: 20.9671 },
  { iata: 'BUD', name: 'Budapest', city: 'Budapest', country: 'HU', lat: 47.4394, lon: 19.2556 },
  { iata: 'PRG', name: 'Prague', city: 'Prague', country: 'CZ', lat: 50.1008, lon: 14.26 },
  { iata: 'KEF', name: 'Keflavík', city: 'Reykjavík', country: 'IS', lat: 63.985, lon: -22.6056 },
  { iata: 'RUN', name: 'Réunion Roland Garros', city: 'Saint-Denis', country: 'FR', lat: -20.8871, lon: 55.5103 },
  // United Kingdom
  { iata: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB', lat: 51.47, lon: -0.4543 },
  { iata: 'LGW', name: 'London Gatwick', city: 'London', country: 'GB', lat: 51.1537, lon: -0.1821 },
  { iata: 'STN', name: 'London Stansted', city: 'London', country: 'GB', lat: 51.886, lon: 0.2389 },
  { iata: 'LTN', name: 'London Luton', city: 'London', country: 'GB', lat: 51.8747, lon: -0.3683 },
  { iata: 'MAN', name: 'Manchester', city: 'Manchester', country: 'GB', lat: 53.365, lon: -2.2728 },
  { iata: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'GB', lat: 55.95, lon: -3.3725 },
  { iata: 'BHX', name: 'Birmingham', city: 'Birmingham', country: 'GB', lat: 52.4539, lon: -1.748 },
  // United States
  { iata: 'JFK', name: 'New York JFK', city: 'New York', country: 'US', lat: 40.6413, lon: -73.7781 },
  { iata: 'EWR', name: 'Newark Liberty', city: 'Newark', country: 'US', lat: 40.6895, lon: -74.1745 },
  { iata: 'BOS', name: 'Boston Logan', city: 'Boston', country: 'US', lat: 42.3656, lon: -71.0096 },
  { iata: 'IAD', name: 'Washington Dulles', city: 'Washington', country: 'US', lat: 38.9531, lon: -77.4565 },
  { iata: 'ORD', name: "Chicago O'Hare", city: 'Chicago', country: 'US', lat: 41.9742, lon: -87.9073 },
  { iata: 'ATL', name: 'Atlanta Hartsfield-Jackson', city: 'Atlanta', country: 'US', lat: 33.6407, lon: -84.4277 },
  { iata: 'MIA', name: 'Miami', city: 'Miami', country: 'US', lat: 25.7959, lon: -80.287 },
  { iata: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'US', lat: 32.8998, lon: -97.0403 },
  { iata: 'SFO', name: 'San Francisco', city: 'San Francisco', country: 'US', lat: 37.6213, lon: -122.379 },
  { iata: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'US', lat: 33.9416, lon: -118.4085 },
  { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'US', lat: 47.4502, lon: -122.3088 },
  // Rest of world
  { iata: 'BOM', name: 'Mumbai Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'IN', lat: 19.0896, lon: 72.8656 },
  { iata: 'DEL', name: 'Delhi Indira Gandhi', city: 'Delhi', country: 'IN', lat: 28.5562, lon: 77.1 },
  { iata: 'BLR', name: 'Bengaluru Kempegowda', city: 'Bengaluru', country: 'IN', lat: 13.1986, lon: 77.7066 },
  { iata: 'DXB', name: 'Dubai', city: 'Dubai', country: 'AE', lat: 25.2532, lon: 55.3657 },
  { iata: 'DOH', name: 'Doha Hamad', city: 'Doha', country: 'QA', lat: 25.2731, lon: 51.6081 },
  { iata: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'TR', lat: 41.2753, lon: 28.7519 },
  { iata: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG', lat: 1.3644, lon: 103.9915 },
  { iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP', lat: 35.5494, lon: 139.7798 },
  { iata: 'HKG', name: 'Hong Kong', city: 'Hong Kong', country: 'HK', lat: 22.308, lon: 113.9185 },
  { iata: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'CA', lat: 43.6777, lon: -79.6248 },
  { iata: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU', lat: -33.9399, lon: 151.1753 },
];

/** Display time zones by country, with overrides for multi-zone countries. */
const COUNTRY_TZ: Record<string, string> = {
  FR: 'Europe/Paris', DE: 'Europe/Berlin', NL: 'Europe/Amsterdam', ES: 'Europe/Madrid', IT: 'Europe/Rome',
  PT: 'Europe/Lisbon', IE: 'Europe/Dublin', DK: 'Europe/Copenhagen', SE: 'Europe/Stockholm', NO: 'Europe/Oslo',
  FI: 'Europe/Helsinki', AT: 'Europe/Vienna', CH: 'Europe/Zurich', BE: 'Europe/Brussels', GR: 'Europe/Athens',
  PL: 'Europe/Warsaw', HU: 'Europe/Budapest', CZ: 'Europe/Prague', IS: 'Atlantic/Reykjavik', GB: 'Europe/London',
  IN: 'Asia/Kolkata', AE: 'Asia/Dubai', QA: 'Asia/Qatar', TR: 'Europe/Istanbul', SG: 'Asia/Singapore',
  JP: 'Asia/Tokyo', HK: 'Asia/Hong_Kong', CA: 'America/Toronto', AU: 'Australia/Sydney',
};
const AIRPORT_TZ: Record<string, string> = {
  TFS: 'Atlantic/Canary', LPA: 'Atlantic/Canary', RUN: 'Indian/Reunion',
  JFK: 'America/New_York', EWR: 'America/New_York', BOS: 'America/New_York', IAD: 'America/New_York',
  MIA: 'America/New_York', ATL: 'America/New_York', ORD: 'America/Chicago', DFW: 'America/Chicago',
  SFO: 'America/Los_Angeles', LAX: 'America/Los_Angeles', SEA: 'America/Los_Angeles',
};

export const AIRPORTS: Record<string, Airport> = Object.fromEntries(
  AIRPORT_LIST.map((a) => [a.iata, { ...a, tz: AIRPORT_TZ[a.iata] ?? COUNTRY_TZ[a.country] }]),
);

export function airport(iata: string): Airport {
  const found = AIRPORTS[iata.toUpperCase()];
  if (!found) throw new Error(`Unknown airport ${iata}`);
  return found;
}

/**
 * Operating licence decides EU261 coverage for flights INTO the EU (Art. 3(1)(b))
 * and UK261 coverage for flights into the UK. Swiss carriers are treated as
 * Community carriers under the EU–Switzerland air transport agreement.
 */
const CARRIER_LIST: Carrier[] = [
  // EU / EEA / CH licence
  { iata: 'LH', name: 'Lufthansa', licence: 'EU' },
  { iata: 'AF', name: 'Air France', licence: 'EU' },
  { iata: 'KL', name: 'KLM', licence: 'EU' },
  { iata: 'IB', name: 'Iberia', licence: 'EU' },
  { iata: 'VY', name: 'Vueling', licence: 'EU' },
  { iata: 'UX', name: 'Air Europa', licence: 'EU' },
  { iata: 'AZ', name: 'ITA Airways', licence: 'EU' },
  { iata: 'SK', name: 'SAS', licence: 'EU' },
  { iata: 'AY', name: 'Finnair', licence: 'EU' },
  { iata: 'OS', name: 'Austrian Airlines', licence: 'EU' },
  { iata: 'LX', name: 'SWISS', licence: 'EU' },
  { iata: 'SN', name: 'Brussels Airlines', licence: 'EU' },
  { iata: 'TP', name: 'TAP Air Portugal', licence: 'EU' },
  { iata: 'FR', name: 'Ryanair', licence: 'EU' },
  { iata: 'W6', name: 'Wizz Air', licence: 'EU' },
  { iata: 'EI', name: 'Aer Lingus', licence: 'EU' },
  { iata: 'EW', name: 'Eurowings', licence: 'EU' },
  { iata: 'DY', name: 'Norwegian', licence: 'EU' },
  { iata: 'LO', name: 'LOT Polish Airlines', licence: 'EU' },
  { iata: 'A3', name: 'Aegean Airlines', licence: 'EU' },
  { iata: 'EC', name: 'easyJet Europe', licence: 'EU' },
  // UK licence
  { iata: 'BA', name: 'British Airways', licence: 'UK' },
  { iata: 'VS', name: 'Virgin Atlantic', licence: 'UK' },
  { iata: 'U2', name: 'easyJet', licence: 'UK' },
  { iata: 'LS', name: 'Jet2', licence: 'UK' },
  { iata: 'BY', name: 'TUI Airways', licence: 'UK' },
  { iata: 'W9', name: 'Wizz Air UK', licence: 'UK' },
  // US licence
  { iata: 'UA', name: 'United Airlines', licence: 'US' },
  { iata: 'AA', name: 'American Airlines', licence: 'US' },
  { iata: 'DL', name: 'Delta Air Lines', licence: 'US' },
  { iata: 'B6', name: 'JetBlue', licence: 'US' },
  { iata: 'WN', name: 'Southwest Airlines', licence: 'US' },
  { iata: 'AS', name: 'Alaska Airlines', licence: 'US' },
  // Other
  { iata: 'EK', name: 'Emirates', licence: 'OTHER' },
  { iata: 'QR', name: 'Qatar Airways', licence: 'OTHER' },
  { iata: 'EY', name: 'Etihad Airways', licence: 'OTHER' },
  { iata: 'AI', name: 'Air India', licence: 'OTHER' },
  { iata: '6E', name: 'IndiGo', licence: 'OTHER' },
  { iata: 'SQ', name: 'Singapore Airlines', licence: 'OTHER' },
  { iata: 'TK', name: 'Turkish Airlines', licence: 'OTHER' },
  { iata: 'AC', name: 'Air Canada', licence: 'OTHER' },
  { iata: 'QF', name: 'Qantas', licence: 'OTHER' },
  { iata: 'CX', name: 'Cathay Pacific', licence: 'OTHER' },
  { iata: 'NH', name: 'ANA', licence: 'OTHER' },
];

export const CARRIERS: Record<string, Carrier> = Object.fromEntries(CARRIER_LIST.map((c) => [c.iata, c]));

/** Unknown carriers get licence OTHER; the engine flags inbound coverage as uncertain. */
export function carrier(iata: string, fallbackName?: string): Carrier {
  return CARRIERS[iata.toUpperCase()] ?? { iata: iata.toUpperCase(), name: fallbackName ?? iata.toUpperCase(), licence: 'OTHER' };
}

export function isKnownCarrier(iata: string): boolean {
  return Boolean(CARRIERS[iata.toUpperCase()]);
}
