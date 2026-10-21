import type { ExtractionHints, ExtractionResult } from '../types';
import {
  assignDates,
  CONFIDENCE,
  extractLabelled,
  extractName,
  fieldAt,
  FieldCollector,
  findDates,
  LABELS,
} from './common';

const F = {
  title: fieldAt('other', 0), // Document Title
  number: fieldAt('other', 1), // Document Number
  name: fieldAt('other', 2), // Name
  issuedBy: fieldAt('other', 3), // Issued By
  issue: fieldAt('other', 4), // Issue Date
  expiry: fieldAt('other', 5), // Expiry Date
} as const;

/** 5+ chars that are all digits or mix letters and digits. */
const NUMBER_TOKEN =
  /^(?:\d{5,}|(?=[A-Za-z0-9/-]{5,}$)(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9/-]+)$/;

export function extractOther(
  lines: readonly string[],
  hints?: ExtractionHints,
): ExtractionResult {
  const out = new FieldCollector('other');

  const title = lines.find((line) => {
    const letters = line.replace(/[^A-Za-z]/g, '').length;
    return (
      letters >= 3 &&
      findDates([line]).length === 0 &&
      !/^[\d\s/.-]+$/.test(line)
    );
  });
  if (title) out.set(F.title, title, CONFIDENCE.label);

  for (const line of lines) {
    const token = line
      .split(/\s+/)
      .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
      .find((t) => NUMBER_TOKEN.test(t) && findDates([t]).length === 0);
    if (token) {
      out.set(F.number, token, CONFIDENCE.regex);
      break;
    }
  }

  extractName(lines, out, F.name, hints);
  extractLabelled(lines, out, F.issuedBy, LABELS.issuedBy);
  assignDates(lines, out, { issue: F.issue, expiry: F.expiry }, hints);

  return out.result();
}
