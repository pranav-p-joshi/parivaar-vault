import {
  daysUntil,
  expiryStatus,
  formatRelativeDays,
  parseAnyDate,
  toIsoDate,
  toIsoFromAny,
} from './dates';
import { initials, maskNumber, normalizeTags } from './text';
import {
  isValidAadhaar,
  isValidEpic,
  isValidPan,
  verhoeffCheck,
} from './validators';
import { arrayBufferToBase64, base64ToArrayBuffer, formatBytes } from './bytes';

describe('dates', () => {
  const today = new Date(2026, 9, 20);

  it('counts days until a date in either format', () => {
    expect(daysUntil('2026-10-25', today)).toBe(5);
    expect(daysUntil('25/10/2026', today)).toBe(5);
    expect(daysUntil('2026-10-19', today)).toBe(-1);
  });

  it('parses Indian date formats', () => {
    expect(toIsoFromAny('14/03/1994')).toBe('1994-03-14');
    expect(toIsoFromAny('02-02-2029')).toBe('2029-02-02');
    expect(parseAnyDate('—')).toBeNull();
  });

  it('classifies expiry status', () => {
    expect(expiryStatus(undefined, today)).toBe('none');
    expect(expiryStatus('2026-10-01', today)).toBe('expired');
    expect(expiryStatus('10/11/2026', today)).toBe('critical');
    expect(expiryStatus('2027-01-10', today)).toBe('soon');
    expect(expiryStatus('2030-01-01', today)).toBe('ok');
  });

  it('formats relative days', () => {
    expect(formatRelativeDays(0)).toBe('Today');
    expect(formatRelativeDays(-3)).toBe('3 days ago');
    expect(formatRelativeDays(12)).toBe('In 12 days');
  });

  it('round-trips an ISO date', () => {
    expect(toIsoDate(today)).toBe('2026-10-20');
  });
});

describe('text', () => {
  it('builds initials', () => {
    expect(initials('Pranav Joshi')).toBe('PJ');
    expect(initials('  single ')).toBe('S');
  });

  it('normalizes tags', () => {
    expect(normalizeTags(' Tax, tax ,ID ')).toEqual(['tax', 'id']);
  });

  it('masks numbers', () => {
    expect(maskNumber('123456789012')).toBe('XXXX XXXX 9012');
  });
});

describe('validators', () => {
  it('validates the Verhoeff checksum', () => {
    // 2234 5678 9012 is not valid; find a valid one by construction.
    expect(verhoeffCheck('236')).toBe(true);
    expect(verhoeffCheck('235')).toBe(false);
  });

  it('validates PAN, Aadhaar and EPIC formats', () => {
    expect(isValidPan('ABCDE1234F')).toBe(true);
    expect(isValidPan('ABCD1234F')).toBe(false);
    expect(isValidAadhaar('0345 6789 0123')).toBe(false);
    expect(isValidEpic('MTX0441027')).toBe(true);
    expect(isValidEpic('MT/09/078/441027')).toBe(true);
  });
});

describe('bytes', () => {
  it('round-trips base64', () => {
    const input = new Uint8Array([1, 2, 3, 250, 255]).buffer;
    const b64 = arrayBufferToBase64(input);
    expect(new Uint8Array(base64ToArrayBuffer(b64))).toEqual(
      new Uint8Array(input),
    );
  });

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
