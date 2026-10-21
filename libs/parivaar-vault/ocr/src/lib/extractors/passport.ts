import { isValidPassport } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  cleanName,
  CONFIDENCE,
  extractLabelled,
  fieldAt,
  FieldCollector,
  findNumberCandidates,
  joinLines,
  LABELS,
  pickNumber,
} from './common';

const F = {
  number: fieldAt('passport', 0), // Passport Number
  surname: fieldAt('passport', 1), // Surname
  givenName: fieldAt('passport', 2), // Given Name
  nationality: fieldAt('passport', 3), // Nationality
  dob: fieldAt('passport', 4), // Date of Birth
  placeOfBirth: fieldAt('passport', 5), // Place of Birth
  issue: fieldAt('passport', 6), // Date of Issue
  expiry: fieldAt('passport', 7), // Date of Expiry
  placeOfIssue: fieldAt('passport', 8), // Place of Issue
} as const;

const PASSPORT = /(?<![A-Z0-9])[A-Z]\d{7}(?![A-Z0-9])/;
/** First MRZ line: P<INDSURNAME<<GIVEN<NAMES<<<<... */
const MRZ_NAMES = /^P<[A-Z]{3}([A-Z<]+)$/;

export function extractPassport(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('passport');

  const number = pickNumber(
    findNumberCandidates(lines, PASSPORT),
    isValidPassport,
  );
  if (number) out.set(F.number, number.candidate.compact, number.confidence);

  // Machine-readable zone gives the most reliable names when present.
  for (const line of lines) {
    const mrz = MRZ_NAMES.exec(line.replace(/\s+/g, ''));
    const names = mrz?.[1];
    if (!names) continue;
    const [surname = '', given = ''] = names.split('<<');
    out.set(F.surname, surname.replace(/</g, ' '), CONFIDENCE.validated);
    out.set(F.givenName, given.replace(/</g, ' '), CONFIDENCE.validated);
    break;
  }

  extractLabelled(
    lines,
    out,
    F.surname,
    LABELS.surname,
    CONFIDENCE.label,
    cleanName,
  );
  extractLabelled(
    lines,
    out,
    F.givenName,
    LABELS.givenName,
    CONFIDENCE.label,
    cleanName,
  );

  if (hints?.memberName && (!out.has(F.surname) || !out.has(F.givenName))) {
    const words = hints.memberName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      out.set(F.surname, words[words.length - 1], CONFIDENCE.hint);
      out.set(F.givenName, words.slice(0, -1).join(' '), CONFIDENCE.hint);
    } else {
      out.set(F.givenName, words[0], CONFIDENCE.hint);
    }
  }

  const text = joinLines(lines);
  extractLabelled(
    lines,
    out,
    F.nationality,
    LABELS.nationality,
    CONFIDENCE.label,
    (v) => /^[A-Za-z]+/.exec(v)?.[0],
  );
  if (
    !out.has(F.nationality) &&
    /\b(?:INDIAN|REPUBLIC OF INDIA)\b/i.test(text)
  ) {
    out.set(F.nationality, 'INDIAN', CONFIDENCE.regex);
  }

  assignDates(
    lines,
    out,
    { dob: F.dob, issue: F.issue, expiry: F.expiry },
    hints,
  );
  extractLabelled(
    lines,
    out,
    F.placeOfBirth,
    LABELS.placeOfBirth,
    CONFIDENCE.label,
    stripDates,
  );
  extractLabelled(
    lines,
    out,
    F.placeOfIssue,
    LABELS.placeOfIssue,
    CONFIDENCE.label,
    stripDates,
  );

  return out.result();
}

function stripDates(value: string): string | undefined {
  const text = value
    .replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}
