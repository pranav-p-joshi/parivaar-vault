import { isValidDrivingLicence } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  CONFIDENCE,
  extractAddress,
  extractBloodGroup,
  extractLabelled,
  extractName,
  extractRelation,
  fieldAt,
  FieldCollector,
  findNumberCandidates,
  joinLines,
  LABELS,
  pickNumber,
} from './common';

const F = {
  number: fieldAt('dl', 0), // DL Number
  name: fieldAt('dl', 1), // Name
  relation: fieldAt('dl', 2), // Son/Daughter/Wife of
  dob: fieldAt('dl', 3), // Date of Birth
  bloodGroup: fieldAt('dl', 4), // Blood Group
  issue: fieldAt('dl', 5), // Issue Date
  validTill: fieldAt('dl', 6), // Valid Till (NT)
  classes: fieldAt('dl', 7), // Vehicle Classes
  rto: fieldAt('dl', 8), // Issuing RTO
  address: fieldAt('dl', 9), // Address
} as const;

/** MH02 20150041823, MH0220150041823, MH-02-2015-0041823, MH02 2015 0041823. */
const DL = /(?<![A-Z0-9])[A-Z]{2}[\s-]?\d{2}[\s-]?\d{4}[\s-]?\d{7}(?![A-Z0-9])/;

const VEHICLE_CLASS =
  /\b(?:LMV(?:-NT|-TR)?|MCWG|MCWOG|MC\s?EX\s?50\s?CC|HMV|HGMV|HPMV|HTV|TRANS|MGV|LDRXCV|FVG|3W-?NT|E-?RICKSHAW)\b/gi;

export function extractDl(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('dl');

  const number = pickNumber(
    findNumberCandidates(lines, DL),
    isValidDrivingLicence,
  );
  if (number) {
    const compact = number.candidate.compact;
    out.set(
      F.number,
      `${compact.slice(0, 4)} ${compact.slice(4)}`,
      number.confidence,
    );
  }

  extractName(lines, out, F.name, hints, { heuristicIndex: 0 });
  extractRelation(lines, out, F.relation);
  assignDates(
    lines,
    out,
    { dob: F.dob, issue: F.issue, expiry: F.validTill },
    hints,
  );
  extractBloodGroup(lines, out, F.bloodGroup);

  const classes = new Set<string>();
  for (const match of joinLines(lines).matchAll(VEHICLE_CLASS)) {
    classes.add(match[0].toUpperCase().replace(/\s+/g, ''));
  }
  if (classes.size)
    out.set(F.classes, [...classes].join(', '), CONFIDENCE.regex);

  extractLabelled(lines, out, F.rto, LABELS.rto);
  extractAddress(lines, out, F.address);

  return out.result();
}
