import { SAMPLE_FLIGHTS, type SampleFlight } from '@/data/sampleFlights';
import { normalizeFlightNumber } from '@/lib/format';
import type { FlightFacts } from '@/rules';

const PROXY_URL = process.env.EXPO_PUBLIC_FLIGHT_PROXY_URL?.replace(/\/$/, '');

export const liveLookupEnabled = Boolean(PROXY_URL);

export type LookupResult =
  | { kind: 'sample'; sample: SampleFlight }
  | { kind: 'live'; flights: FlightFacts[] }
  | { kind: 'error'; message: string };

function findSample(number: string): SampleFlight | undefined {
  return SAMPLE_FLIGHTS.find((s) => normalizeFlightNumber(s.facts.flightNumber) === number);
}

/**
 * Look up a flight. Sample flight numbers always resolve locally so the demo
 * never depends on the network; everything else goes through the proxy.
 */
export async function lookupFlight(rawNumber: string, date: string): Promise<LookupResult> {
  const number = normalizeFlightNumber(rawNumber);
  const sample = findSample(number);
  if (sample) return { kind: 'sample', sample };

  if (!PROXY_URL) {
    return {
      kind: 'error',
      message: "Live flight lookup isn't connected in this build. Try one of the sample flights below.",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${PROXY_URL}/flight?number=${encodeURIComponent(number)}&date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 404) return { kind: 'error', message: `We couldn't find ${number} on ${date}. Check the number and date.` };
    if (res.status === 429) return { kind: 'error', message: 'Flight data limit reached for now. Try a sample flight.' };
    if (!res.ok) return { kind: 'error', message: 'Flight data is unavailable right now. Try again or use a sample flight.' };
    const body = (await res.json()) as { flights?: FlightFacts[] };
    const flights = body.flights ?? [];
    if (flights.length === 0) return { kind: 'error', message: `We couldn't find ${number} on ${date}.` };
    return { kind: 'live', flights };
  } catch {
    return { kind: 'error', message: "Couldn't reach flight data. Check your connection or try a sample flight." };
  }
}
