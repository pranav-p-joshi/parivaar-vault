import { verhoeffCheck } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  extractAddress,
  extractGender,
  extractName,
  fieldAt,
  FieldCollector,
  findNumberCandidates,
  groupDigits,
  pickNumber,
} from './common';

const F = {
  number: fieldAt('aadhaar', 0), // Aadhaar Number
  name: fieldAt('aadhaar', 1), // Name
  dob: fieldAt('aadhaar', 2), // Date of Birth
  gender: fieldAt('aadhaar', 3), // Gender
  address: fieldAt('aadhaar', 4), // Address
  vid: fieldAt('aadhaar', 5), // VID
} as const;

/** 12 digits in groups of four, not part of a longer digit run. */
const AADHAAR = /(?<!\d\s?)\d{4}\s?\d{4}\s?\d{4}(?!\s?\d)/;
/** 16-digit Virtual ID. */
const VID = /(?<!\d\s?)\d{4}\s?\d{4}\s?\d{4}\s?\d{4}(?!\s?\d)/;

export function extractAadhaar(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('aadhaar');

  const number = pickNumber(
    findNumberCandidates(lines, AADHAAR),
    verhoeffCheck,
  );
  if (number)
    out.set(F.number, groupDigits(number.candidate.compact), number.confidence);

  const vid = pickNumber(findNumberCandidates(lines, VID), verhoeffCheck);
  if (vid) out.set(F.vid, groupDigits(vid.candidate.compact), vid.confidence);

  extractName(lines, out, F.name, hints, { heuristicIndex: 0 });
  assignDates(lines, out, { dob: F.dob }, hints);
  extractGender(lines, out, F.gender);
  extractAddress(lines, out, F.address);

  return out.result();
}
