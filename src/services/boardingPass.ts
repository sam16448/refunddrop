/**
 * Parser for IATA Bar Coded Boarding Passes (BCBP, Resolution 792).
 *
 * Every airline boarding pass barcode (PDF417, Aztec or QR) starts with the
 * same fixed-width "M" record, so decoding it needs no network and no AI.
 *
 * Leg 1 mandatory fields (60 chars):
 *   0     format code "M"         1   number of legs
 *   2-21  passenger name          22  e-ticket indicator
 *   23-29 PNR (booking ref)       30-32 from   33-35 to
 *   36-38 operating carrier       39-43 flight number
 *   44-46 date (day of year)      47  compartment   48-51 seat
 *   52-56 check-in sequence       57  passenger status
 *   58-59 size of variable field (hex)
 * Each further leg repeats PNR…size (37 chars) after the previous leg's variable field.
 */

export interface BoardingPassLeg {
  from: string;
  to: string;
  carrier: string;
  /** "LH 764" */
  flightNumber: string;
  /** Day of the year, 1–366 */
  dayOfYear: number;
  /** YYYY-MM-DD, year inferred as the most recent date not in the future (+2 day tolerance) */
  date: string;
  seat?: string;
}

export interface BoardingPass {
  passengerName: string;
  bookingRef: string;
  legs: BoardingPassLeg[];
}

export class BoardingPassError extends Error {}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** "RAO/ASHA MS" → "Asha Rao" (drops common titles) */
export function formatPassengerName(raw: string): string {
  const [surname, given = ''] = raw.trim().split('/');
  const cleanGiven = given.replace(/\s+(MR|MRS|MS|MISS|MSTR|DR)$/i, '').trim();
  return titleCase([cleanGiven, surname].filter(Boolean).join(' ').replace(/\s+/g, ' '));
}

/** Resolve a day-of-year to a date, picking the most recent year that isn't in the future. */
export function dayOfYearToDate(day: number, now: Date = new Date()): string {
  const build = (year: number) => {
    const d = new Date(Date.UTC(year, 0, 1));
    d.setUTCDate(day);
    return d;
  };
  const tolerance = 2 * 24 * 3600 * 1000;
  let candidate = build(now.getUTCFullYear());
  if (candidate.getTime() > now.getTime() + tolerance) candidate = build(now.getUTCFullYear() - 1);
  return candidate.toISOString().slice(0, 10);
}

function parseLeg(seg: string, now: Date): BoardingPassLeg {
  // seg starts at the PNR position
  const from = seg.slice(7, 10).trim();
  const to = seg.slice(10, 13).trim();
  const carrier = seg.slice(13, 16).trim();
  const rawFlight = seg.slice(16, 21).trim();
  const dayOfYear = Number.parseInt(seg.slice(21, 24), 10);
  const seat = seg.slice(25, 29).trim().replace(/^0+/, '') || undefined;

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) throw new BoardingPassError('Airport codes not found');
  if (!/^[A-Z0-9]{2,3}$/.test(carrier)) throw new BoardingPassError('Airline code not found');
  const num = rawFlight.match(/^0*(\d{1,4})([A-Z]?)$/);
  if (!num) throw new BoardingPassError('Flight number not found');
  if (!(dayOfYear >= 1 && dayOfYear <= 366)) throw new BoardingPassError('Flight date not found');

  return {
    from,
    to,
    carrier,
    flightNumber: `${carrier} ${num[1]}${num[2]}`,
    dayOfYear,
    date: dayOfYearToDate(dayOfYear, now),
    seat,
  };
}

export function parseBoardingPass(data: string, now: Date = new Date()): BoardingPass {
  const s = data.replace(/\r?\n/g, '');
  if (s.length < 60 || s[0] !== 'M') throw new BoardingPassError('Not a boarding pass barcode');
  const legCount = Number.parseInt(s[1], 10);
  if (!(legCount >= 1 && legCount <= 4)) throw new BoardingPassError('Invalid number of legs');

  const passengerName = formatPassengerName(s.slice(2, 22));
  const bookingRef = s.slice(23, 30).trim();

  const legs: BoardingPassLeg[] = [];
  let pos = 23; // PNR position of leg 1
  for (let i = 0; i < legCount; i++) {
    const seg = s.slice(pos, pos + 37);
    if (seg.length < 37) break;
    legs.push(parseLeg(seg, now));
    const varSize = Number.parseInt(seg.slice(35, 37), 16);
    pos += 37 + (Number.isNaN(varSize) ? 0 : varSize);
  }
  if (legs.length === 0) throw new BoardingPassError('No flight found on this boarding pass');

  return { passengerName, bookingRef, legs };
}
