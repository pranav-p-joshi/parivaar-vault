/** Raw output of an OCR engine, engine-agnostic. */
export interface OcrResult {
  /** Full recognised text, lines separated by `\n`. */
  text: string;
  /** Recognised lines in reading order (already trimmed, no empties). */
  lines: string[];
  /** Overall confidence 0..1. */
  confidence: number;
}

/** Fields extracted from OCR text, keyed by the registry field names. */
export interface ExtractionResult {
  fields: Record<string, string>;
  /** 0..1 per field present in `fields`. */
  confidence: Record<string, number>;
}

/** Optional context that improves extraction when OCR is ambiguous. */
export interface ExtractionHints {
  memberName?: string;
  /** dd/mm/yyyy or ISO yyyy-mm-dd. */
  dateOfBirth?: string;
}

export const EMPTY_OCR_RESULT: Readonly<OcrResult> = Object.freeze({
  text: '',
  lines: [],
  confidence: 0,
});
