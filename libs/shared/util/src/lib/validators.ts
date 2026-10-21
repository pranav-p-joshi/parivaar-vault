/** Indian PAN: 5 letters, 4 digits, 1 letter. */
export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value.trim());
}

/** Aadhaar: 12 digits, not starting with 0 or 1, and a valid Verhoeff checksum. */
export function isValidAadhaar(value: string): boolean {
  const digits = value.replace(/\s+/g, '');
  return /^[2-9][0-9]{11}$/.test(digits) && verhoeffCheck(digits);
}

/** Indian passport: one letter followed by 7 digits. */
export function isValidPassport(value: string): boolean {
  return /^[A-Z][0-9]{7}$/i.test(value.trim());
}

/** EPIC: 3 letters + 7 digits, or the legacy XX/00/000/000000 form. */
export function isValidEpic(value: string): boolean {
  return /^([A-Z]{3}[0-9]{7}|[A-Z]{2}\/[0-9]{2}\/[0-9]{3}\/[0-9]{6})$/i.test(
    value.trim(),
  );
}

/** Driving licence: state code, RTO code, then 11 digits (spaces ignored). */
export function isValidDrivingLicence(value: string): boolean {
  return /^[A-Z]{2}[0-9]{2}[0-9]{11}$/i.test(value.replace(/[\s-]+/g, ''));
}

export function isIsoDate(value: string | undefined): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** Verhoeff checksum used by Aadhaar numbers. */
export function verhoeffCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let c = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    const d = VERHOEFF_D[c];
    const p = VERHOEFF_P[i % 8];
    if (!d || !p) return false;
    const digit = Number(reversed[i]);
    const permuted = p[digit];
    if (permuted === undefined) return false;
    const next = d[permuted];
    if (next === undefined) return false;
    c = next;
  }
  return c === 0;
}
