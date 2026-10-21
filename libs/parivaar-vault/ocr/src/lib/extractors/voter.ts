import { isValidEpic } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  extractAddress,
  extractGender,
  extractLabelled,
  extractName,
  extractRelation,
  fieldAt,
  FieldCollector,
  findNumberCandidates,
  LABELS,
  pickNumber,
} from './common';

const F = {
  epic: fieldAt('voter', 0), // EPIC Number
  name: fieldAt('voter', 1), // Name
  relation: fieldAt('voter', 2), // Relation Name
  gender: fieldAt('voter', 3), // Gender
  dob: fieldAt('voter', 4), // Date of Birth
  constituency: fieldAt('voter', 5), // Assembly Constituency
  part: fieldAt('voter', 6), // Part Number
  address: fieldAt('voter', 7), // Address
} as const;

/** New-style ABC1234567 or legacy XX/00/000/000000. */
const EPIC =
  /(?<![A-Z0-9/])(?:[A-Z]{3}\s?\d{7}|[A-Z]{2}\/\d{2}\/\d{3}\/\d{6})(?![A-Z0-9/])/;

export function extractVoter(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('voter');

  const epic = pickNumber(findNumberCandidates(lines, EPIC), isValidEpic);
  if (epic) out.set(F.epic, epic.candidate.compact, epic.confidence);

  extractName(lines, out, F.name, hints);
  extractRelation(lines, out, F.relation);
  extractGender(lines, out, F.gender);
  assignDates(lines, out, { dob: F.dob }, hints);
  extractLabelled(lines, out, F.constituency, LABELS.constituency);
  extractLabelled(
    lines,
    out,
    F.part,
    LABELS.partNumber,
    undefined,
    (v) => /^\d+/.exec(v)?.[0],
  );
  extractAddress(lines, out, F.address);

  return out.result();
}
