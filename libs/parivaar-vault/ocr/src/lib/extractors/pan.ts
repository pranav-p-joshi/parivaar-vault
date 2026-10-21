import { isValidPan } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  CONFIDENCE,
  extractName,
  extractRelation,
  fieldAt,
  FieldCollector,
  findNumberCandidates,
  pickNumber,
} from './common';

const F = {
  pan: fieldAt('pan', 0), // PAN
  name: fieldAt('pan', 1), // Name
  father: fieldAt('pan', 2), // Father's Name
  dob: fieldAt('pan', 3), // Date of Birth
  status: fieldAt('pan', 4), // Status
} as const;

const PAN = /(?<![A-Z0-9])[A-Z]{5}\d{4}[A-Z](?![A-Z0-9])/;

/** Fourth character of a PAN encodes the holder type. */
const STATUS_BY_CHAR: Readonly<Record<string, string>> = {
  P: 'Individual',
  C: 'Company',
  H: 'HUF',
  F: 'Firm',
  A: 'AOP',
  T: 'Trust',
  B: 'BOI',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

export function extractPan(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('pan');

  const pan = pickNumber(findNumberCandidates(lines, PAN), isValidPan);
  if (pan) {
    out.set(F.pan, pan.candidate.compact, pan.confidence);
    const status = STATUS_BY_CHAR[pan.candidate.compact.charAt(3)];
    if (status) out.set(F.status, status, CONFIDENCE.regex);
  }

  // Old-format PAN cards print the holder's name and the father's name as
  // bare lines, so fall back to the first two name-like lines.
  extractName(lines, out, F.name, hints, { heuristicIndex: 0 });
  const avoid = new Set<string>();
  const name = out.get(F.name);
  if (name) avoid.add(name);
  extractRelation(lines, out, F.father, { heuristic: true, avoid });

  assignDates(lines, out, { dob: F.dob }, hints);

  return out.result();
}
