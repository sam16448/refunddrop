/**
 * RefundDrop flight proxy (Cloudflare Worker).
 *
 * Keeps the AeroDataBox API key out of the public app, trims the response to
 * the fields the rules engine needs, and caches results so repeated demo
 * lookups don't use up the free quota.
 *
 *   GET /flight?number=LH756&date=2026-07-20  →  { flights: FlightFacts[] }
 */

import { normalizeAdbResponse } from '../../src/services/aerodatabox';

export interface Env {
  RAPIDAPI_KEY: string;
}

const ADB_HOST = 'aerodatabox.p.rapidapi.com';
const CACHE_SECONDS = 60 * 60 * 24; // past flights don't change

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS, ...extra },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true });
    if (url.pathname !== '/flight') return json({ error: 'not_found' }, 404);

    const number = (url.searchParams.get('number') ?? '').replace(/\s+/g, '').toUpperCase();
    const date = url.searchParams.get('date') ?? '';
    if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'bad_request', message: 'Use ?number=LH756&date=YYYY-MM-DD' }, 400);
    }
    if (!env.RAPIDAPI_KEY) return json({ error: 'not_configured' }, 500);

    const cache = caches.default;
    const cacheKey = new Request(`https://refunddrop-cache/flight/${number}/${date}`);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const upstream = await fetch(
      `https://${ADB_HOST}/flights/number/${number}/${date}?withAircraftImage=false&withLocation=false`,
      { headers: { 'x-rapidapi-key': env.RAPIDAPI_KEY, 'x-rapidapi-host': ADB_HOST } },
    );

    if (upstream.status === 204 || upstream.status === 404) return json({ flights: [] }, 404);
    if (upstream.status === 429) return json({ error: 'rate_limited' }, 429);
    if (!upstream.ok) return json({ error: 'upstream_error', status: upstream.status }, 502);

    const flights = normalizeAdbResponse(await upstream.json(), date);
    const response = json({ flights }, flights.length ? 200 : 404, { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
    if (flights.length) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
