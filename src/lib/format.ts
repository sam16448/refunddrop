/** Display helpers. Times are stored in UTC; shown in the airport's local zone when known. */

export function localTime(iso: string | undefined, tz: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz ?? 'UTC' }).format(d);
  } catch {
    return `${d.toISOString().slice(11, 16)} UTC`;
  }
}

export function localDate(iso: string | undefined, tz: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: tz ?? 'UTC' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function yesterdayIso(): string {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** "lh 764" → "LH764" */
export function normalizeFlightNumber(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function isValidFlightNumber(input: string): boolean {
  return /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(normalizeFlightNumber(input));
}

export function isValidDate(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input));
}
