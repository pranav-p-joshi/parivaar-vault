import type { DocType } from '@pranav/shared-models';
import { extractAadhaar } from './extractors/aadhaar';
import { normalizeOcrLines } from './extractors/common';
import { extractDl } from './extractors/dl';
import { extractOther } from './extractors/other';
import { extractPan } from './extractors/pan';
import { extractPassport } from './extractors/passport';
import { extractVoter } from './extractors/voter';
import type { ExtractionHints, ExtractionResult, OcrResult } from './types';

type Extractor = (
  lines: readonly string[],
  hints?: ExtractionHints,
) => ExtractionResult;

const EXTRACTORS: Readonly<Record<DocType, Extractor>> = {
  aadhaar: extractAadhaar,
  pan: extractPan,
  voter: extractVoter,
  dl: extractDl,
  passport: extractPassport,
  other: extractOther,
};

/**
 * Turns raw OCR output into registry fields for `type`. Field keys are
 * always taken from `DOC_TYPE_REGISTRY[type].fields`; fields that could not
 * be found are simply absent (never empty strings).
 */
export function extractFields(
  type: DocType,
  ocr: OcrResult,
  hints?: ExtractionHints,
): ExtractionResult {
  const lines = ocr.lines.length
    ? ocr.lines.flatMap(normalizeOcrLines)
    : normalizeOcrLines(ocr.text);
  const extractor = EXTRACTORS[type] ?? extractOther;
  return extractor(lines, hints);
}
