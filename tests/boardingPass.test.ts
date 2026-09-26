import { describe, expect, it } from 'vitest';
import { SAMPLE_BOARDING_PASS } from '../src/data/sampleBoardingPass';
import { BoardingPassError, dayOfYearToDate, formatPassengerName, parseBoardingPass } from '../src/services/boardingPass';

/** Assemble a leg-1 record field by field so lengths are always right. */
function bcbp(opts: {
  legs?: number;
  name: string;
  pnr: string;
  from: string;
  to: string;
  carrier: string;
  flight: string;
  day: string;
  seat?: string;
  variable?: string;
  extraLegs?: string;
}): string {
  const variable = opts.variable ?? '';
  return (
    'M' +
    String(opts.legs ?? 1) +
    opts.name.padEnd(20) +
    'E' +
    opts.pnr.padEnd(7) +
    opts.from +
    opts.to +
    opts.carrier.padEnd(3) +
    opts.flight.padEnd(5) +
    opts.day +
    'Y' +
    (opts.seat ?? '012A') +
    '0023 ' +
    '1' +
    variable.length.toString(16).toUpperCase().padStart(2, '0') +
    variable +
    (opts.extraLegs ?? '')
  );
}

const NOW = new Date('2026-09-26T12:00:00Z');

describe('boarding pass (IATA BCBP) parser', () => {
  it('parses the IATA specification example', () => {
    const bp = parseBoardingPass('M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 326J001A0025 100', NOW);
    expect(bp.passengerName).toBe('Luc Desmarais');
    expect(bp.bookingRef).toBe('ABC123');
    expect(bp.legs[0]).toMatchObject({ from: 'YUL', to: 'FRA', carrier: 'AC', flightNumber: 'AC 834', dayOfYear: 326 });
  });

  it('parses a leg and infers the year from the day of year', () => {
    const bp = parseBoardingPass(
      bcbp({ name: 'RAO/ASHA MS', pnr: 'X7K2PQ', from: 'FRA', to: 'BOM', carrier: 'LH', flight: '0764', day: '226' }),
      NOW,
    );
    expect(bp.passengerName).toBe('Asha Rao');
    expect(bp.legs[0].flightNumber).toBe('LH 764');
    expect(bp.legs[0].date).toBe('2026-08-14');
    expect(bp.legs[0].seat).toBe('12A');
  });

  it('uses last year for a day that is still in the future this year', () => {
    expect(dayOfYearToDate(350, NOW)).toBe('2025-12-16');
    expect(dayOfYearToDate(270, NOW)).toBe('2026-09-27'); // tomorrow is fine (tolerance)
  });

  it('keeps flight-number suffix letters', () => {
    const bp = parseBoardingPass(
      bcbp({ name: 'LEE/SAM', pnr: 'QWE123', from: 'LHR', to: 'JFK', carrier: 'BA', flight: '0117A', day: '200' }),
      NOW,
    );
    expect(bp.legs[0].flightNumber).toBe('BA 117A');
  });

  it('reads a second leg after the variable-size section', () => {
    const leg2 = 'X7K2PQ ' + 'FRA' + 'SIN' + 'LH ' + '0778 ' + '227' + 'Y' + '034C' + '0101 ' + '1' + '00';
    const bp = parseBoardingPass(
      bcbp({ legs: 2, name: 'RAO/ASHA', pnr: 'X7K2PQ', from: 'LIS', to: 'FRA', carrier: 'TP', flight: '0572', day: '226', variable: '>5321', extraLegs: leg2 }),
      NOW,
    );
    expect(bp.legs).toHaveLength(2);
    expect(bp.legs[1]).toMatchObject({ from: 'FRA', to: 'SIN', flightNumber: 'LH 778' });
  });

  it('rejects barcodes that are not boarding passes', () => {
    expect(() => parseBoardingPass('https://example.com', NOW)).toThrow(BoardingPassError);
    expect(() => parseBoardingPass('M1' + 'X'.repeat(58), NOW)).toThrow(BoardingPassError);
  });

  it('the built-in sample pass resolves to the LH 764 sample flight', () => {
    const bp = parseBoardingPass(SAMPLE_BOARDING_PASS, NOW);
    expect(bp).toMatchObject({ passengerName: 'Asha Rao', bookingRef: 'X7K2PQ' });
    expect(bp.legs[0]).toMatchObject({ flightNumber: 'LH 764', date: '2026-08-14' });
  });

  it('formats names with titles removed', () => {
    expect(formatPassengerName('SMITH/JOHN MR')).toBe('John Smith');
    expect(formatPassengerName('DE LA CRUZ/MARIA')).toBe('Maria De La Cruz');
  });
});
