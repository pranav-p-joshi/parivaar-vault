import { DOC_TYPE_REGISTRY, type DocType } from '@pranav/shared-models';
import { parseAnyDate } from '@pranav/shared-util';
import type { ExtractionHints, ExtractionResult } from '../types';

/** Confidence levels used by every extractor. */
export const CONFIDENCE = {
  /** Regex hit that also passes a validator (checksum / format). */
  validated: 0.92,
  /** Date next to a matching label (DOB / Issue / Expiry). */
  labelledDate: 0.85,
  /** Regex-only hit (no validator available or it failed). */
  regex: 0.7,
  /** Text found by label proximity or a layout heuristic. */
  label: 0.5,
  /** Date assigned by position only (no label). */
  positionalDate: 0.5,
  /** Fallback taken from `ExtractionHints`. */
  hint: 0.4,
} as const;

/** Splits OCR text into trimmed, whitespace-collapsed, non-empty lines. */
export function normalizeOcrLines(text: string): string[] {
  return text
    .split(/\r?\n|\r/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

/** Returns the registry field name at `index` for `type` (never retyped). */
export function fieldAt(type: DocType, index: number): string {
  const name = DOC_TYPE_REGISTRY[type].fields[index];
  if (name === undefined) {
    throw new Error(`DOC_TYPE_REGISTRY.${type} has no field at index ${index}`);
  }
  return name;
}

/**
 * Accumulates fields for one document type. Only registry fields are
 * accepted, empty values are dropped and a later write only replaces an
 * earlier one when it is more confident.
 */
export class FieldCollector {
  private readonly allowed: ReadonlySet<string>;
  private readonly fields: Record<string, string> = {};
  private readonly confidence: Record<string, number> = {};

  constructor(type: DocType) {
    this.allowed = new Set(DOC_TYPE_REGISTRY[type].fields);
  }

  set(field: string, value: string | undefined, confidence: number): boolean {
    const clean = (value ?? '').replace(/\s+/g, ' ').trim();
    if (!clean || !this.allowed.has(field)) return false;
    const existing = this.confidence[field];
    if (existing !== undefined && existing >= confidence) return false;
    this.fields[field] = clean;
    this.confidence[field] = clamp01(confidence);
    return true;
  }

  has(field: string): boolean {
    return this.fields[field] !== undefined;
  }

  get(field: string): string | undefined {
    return this.fields[field];
  }

  result(): ExtractionResult {
    return { fields: { ...this.fields }, confidence: { ...this.confidence } };
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

// Note: `\b` only knows ASCII word characters, so Devanagari alternatives
// sit outside the `\b(...)\b` groups.
export const LABELS = {
  dob: /\b(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date|Birth)\b|जन्म/i,
  issue:
    /\b(?:D\.?O\.?I\.?|Date\s*of\s*Issue|Issue\s*Date|Issued\s*on|Issue)\b/i,
  expiry:
    /\b(?:D\.?O\.?E\.?|Date\s*of\s*Expiry|Expiry\s*Date|Expiry|Expires|Expires\s*on|Valid\s*(?:Till|Upto|Up\s*to|Until|To)|Validity)\b/i,
  relation:
    /(?:Son\s*\/\s*Daughter\s*\/\s*Wife\s*of|[SDW]\s*\/\s*[SDW]\s*\/\s*[SDW]\s*of|Father'?s?|Mother'?s?|Husband'?s?|Guardian'?s?|Relation|Relative'?s?|Son\s+of|Daughter\s+of|Wife\s+of|Care\s+of|S\s*\/\s*[OD]|D\s*\/\s*[OD]|W\s*\/\s*[OD]|C\s*\/\s*[OD])\b\s*(?:Name)?/i,
  name: /\b(?:Elector'?s?\s*Name|Holder'?s?\s*Name|Name)\b|नाम/i,
  surname: /\b(?:Surname|Last\s*Name)(?:\s*\(s\))?/i,
  givenName: /\b(?:Given\s*Names?|First\s*Name)(?:\s*\(s\))?/i,
  gender: /\b(?:Gender|Sex)\b|लिंग/i,
  address: /\bAddress\b|पता/i,
  bloodGroup: /\b(?:Blood\s*Group|Blood\s*Grp|B\.?G\.?)\b/i,
  nationality: /\bNationality\b/i,
  placeOfBirth: /\bPlace\s*of\s*Birth\b/i,
  placeOfIssue: /\bPlace\s*of\s*Issue\b/i,
  issuedBy:
    /\b(?:Issued\s*By|Issuing\s*Authority|Issuing\s*Office|Issuer|Authority)\b/i,
  rto: /\b(?:Issuing\s*(?:Authority|RTO|Office)|Licensing\s*Authority|Authority|R\.?T\.?O\.?)\b/i,
  constituency:
    /\b(?:Assembly\s*Constituency|Constituency|A\.?C\.?\s*(?:Name|No\.?))\b/i,
  partNumber: /\b(?:Part\s*(?:Number|No\.?)|Part)\b/i,
  vehicleClass:
    /\b(?:Class\s*of\s*Vehicles?|Vehicle\s*Class(?:es)?|COV|Category)\b/i,
} as const;

/**
 * Value printed after a label on the same line (after `:`/`-`), or the next
 * line when the label stands alone. Returns undefined when nothing follows.
 */
export function valueAfterLabel(
  lines: readonly string[],
  index: number,
  label: RegExp,
): string | undefined {
  const line = lines[index];
  if (line === undefined) return undefined;
  const match = new RegExp(label.source, label.flags.replace('g', '')).exec(
    line,
  );
  if (!match) return undefined;
  const remainder = stripLabelPunctuation(
    line.slice(match.index + match[0].length),
  );
  if (remainder) return remainder;
  const next = lines[index + 1];
  if (next === undefined || looksLikeLabelOnly(next)) return undefined;
  return stripLabelPunctuation(next);
}

/** First label hit across all lines, with its value. */
export function findLabelled(
  lines: readonly string[],
  label: RegExp,
): { index: number; value: string } | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !label.test(line)) continue;
    const value = valueAfterLabel(lines, i, label);
    if (value) return { index: i, value };
  }
  return undefined;
}

export function stripLabelPunctuation(value: string): string {
  return value
    .replace(/^[\s:.\-–—=|/]+/, '')
    .replace(/[\s:\-–—=|]+$/, '')
    .trim();
}

/** A line that is just a label (ends with ':' or is a known label alone). */
function looksLikeLabelOnly(line: string): boolean {
  return /[:：]\s*$/.test(line);
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export interface NumberCandidate {
  /** As printed (whitespace collapsed). */
  raw: string;
  /** Whitespace and separators removed, uppercased. */
  compact: string;
  lineIndex: number;
}

/**
 * Collects every match of `pattern` in the lines. `pattern` must not use the
 * global flag; it is applied repeatedly per line.
 */
export function findNumberCandidates(
  lines: readonly string[],
  pattern: RegExp,
): NumberCandidate[] {
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
  );
  const out: NumberCandidate[] = [];
  lines.forEach((line, lineIndex) => {
    global.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = global.exec(line)) !== null) {
      const raw = match[0].trim();
      if (!raw) {
        global.lastIndex++;
        continue;
      }
      // Slashes are kept so legacy EPIC numbers (XX/00/000/000000) validate.
      out.push({
        raw,
        compact: raw.replace(/[\s\-–.]+/g, '').toUpperCase(),
        lineIndex,
      });
    }
  });
  return out;
}

/**
 * Picks the best candidate: the first that passes `validate`, otherwise the
 * first match. Confidence reflects whether validation passed.
 */
export function pickNumber(
  candidates: readonly NumberCandidate[],
  validate?: (compact: string) => boolean,
): { candidate: NumberCandidate; confidence: number } | undefined {
  if (validate) {
    const valid = candidates.find((c) => validate(c.compact));
    if (valid) return { candidate: valid, confidence: CONFIDENCE.validated };
  }
  const first = candidates[0];
  return first ? { candidate: first, confidence: CONFIDENCE.regex } : undefined;
}

/** Groups a digit string in blocks of `size`, e.g. 'dddd dddd dddd'. */
export function groupDigits(digits: string, size = 4): string {
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += size)
    groups.push(digits.slice(i, i + size));
  return groups.join(' ');
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_PATTERN =
  /(?<![\d/.-])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?![\d/.-])/g;

export interface DateHit {
  /** dd/mm/yyyy */
  value: string;
  lineIndex: number;
  /** Position of the date within its line. */
  offset: number;
}

/** All plausible dd/mm/yyyy dates in the lines, normalised to dd/mm/yyyy. */
export function findDates(lines: readonly string[]): DateHit[] {
  const out: DateHit[] = [];
  lines.forEach((line, lineIndex) => {
    DATE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DATE_PATTERN.exec(line)) !== null) {
      const value = normalizeDate(match[0]);
      if (value) out.push({ value, lineIndex, offset: match.index });
    }
  });
  return out;
}

/** Normalises dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy or ISO to dd/mm/yyyy. */
export function normalizeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = parseAnyDate(value.trim());
  if (!date) return undefined;
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) return undefined;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

export type DateRole = 'dob' | 'issue' | 'expiry';

export interface DateTargets {
  dob?: string;
  issue?: string;
  expiry?: string;
}

/**
 * Maps every date found to a field: by label on the same line (or on the
 * line directly above when that line carries no date), then by hint match,
 * then by position in the order DOB, Issue, Expiry for still-empty targets.
 */
export function assignDates(
  lines: readonly string[],
  collector: FieldCollector,
  targets: DateTargets,
  hints?: ExtractionHints,
): void {
  const hintDob = normalizeDate(hints?.dateOfBirth);
  const unlabelled: DateHit[] = [];

  for (const hit of findDates(lines)) {
    const role = dateRoleFor(lines, hit);
    const field = role ? targets[role] : undefined;
    if (field) {
      collector.set(field, hit.value, CONFIDENCE.labelledDate);
    } else if (hintDob && targets.dob && hit.value === hintDob) {
      collector.set(targets.dob, hit.value, CONFIDENCE.labelledDate);
    } else {
      unlabelled.push(hit);
    }
  }

  const order: DateRole[] = ['dob', 'issue', 'expiry'];
  for (const hit of unlabelled) {
    const role = order.find((r) => {
      const field = targets[r];
      return field !== undefined && !collector.has(field);
    });
    const field = role ? targets[role] : undefined;
    if (!field) break;
    collector.set(field, hit.value, CONFIDENCE.positionalDate);
  }

  if (targets.dob && !collector.has(targets.dob) && hintDob) {
    collector.set(targets.dob, hintDob, CONFIDENCE.hint);
  }
}

function dateRoleFor(
  lines: readonly string[],
  hit: DateHit,
): DateRole | undefined {
  const line = lines[hit.lineIndex];
  if (line === undefined) return undefined;
  // Prefer the label text that precedes the date on the same line.
  const before = line.slice(0, hit.offset);
  const sameLine = roleFromLabel(before) ?? roleFromLabel(line);
  if (sameLine) return sameLine;
  const previous = lines[hit.lineIndex - 1];
  if (previous !== undefined && findDates([previous]).length === 0) {
    return roleFromLabel(previous);
  }
  return undefined;
}

function roleFromLabel(text: string): DateRole | undefined {
  // Expiry labels ("Valid Till", "DOE") are checked before Issue ("DOI") and
  // DOB so "Date of Expiry" never falls through to a weaker match.
  if (LABELS.expiry.test(text)) return 'expiry';
  if (LABELS.dob.test(text)) return 'dob';
  if (LABELS.issue.test(text)) return 'issue';
  return undefined;
}

// ---------------------------------------------------------------------------
// Names and other text heuristics
// ---------------------------------------------------------------------------

const NOISE_WORDS = new Set([
  'government',
  'govt',
  'india',
  'indian',
  'unique',
  'identification',
  'authority',
  'income',
  'tax',
  'department',
  'permanent',
  'account',
  'number',
  'card',
  'election',
  'commission',
  'driving',
  'licence',
  'license',
  'passport',
  'republic',
  'ministry',
  'transport',
  'signature',
  'date',
  'birth',
  'male',
  'female',
  'transgender',
  'address',
  'issue',
  'issued',
  'valid',
  'validity',
  'blood',
  'form',
  'union',
  'aadhaar',
  'aadhar',
  'identity',
  'proof',
  'citizenship',
  'elector',
  'photo',
  'identity',
  'the',
  'of',
  'and',
  'to',
  'by',
  'name',
  'dob',
  'doi',
  'doe',
  'gender',
  'sex',
  'age',
  'son',
  'daughter',
  'wife',
  'father',
  'mother',
  'husband',
  'holder',
  'specimen',
  'sample',
  'type',
  'code',
  'country',
  'nationality',
  'place',
  'surname',
  'given',
  'mera',
  'meri',
  'pehchan',
  'www',
  'uidai',
  'gov',
  'in',
  'help',
  'helpline',
  'nt',
  'tr',
  'cov',
  'rto',
  'state',
  'office',
  'emergency',
  'contact',
]);

/** True for a line that reads like a person's name (2-5 alphabetic words). */
export function looksLikeName(line: string): boolean {
  if (!/^[A-Za-z][A-Za-z.' ]*$/.test(line)) return false;
  const words = line.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const letters = line.replace(/[^A-Za-z]/g, '').length;
  if (letters < 4) return false;
  return words.every(
    (w) => !NOISE_WORDS.has(w.replace(/[.']/g, '').toLowerCase()),
  );
}

/** Lines that look like names, in order of appearance. */
export function nameLines(
  lines: readonly string[],
): Array<{ index: number; value: string }> {
  const out: Array<{ index: number; value: string }> = [];
  lines.forEach((line, index) => {
    if (looksLikeName(line)) out.push({ index, value: line });
  });
  return out;
}

/**
 * Finds the line that contains the hinted member name (case-insensitive,
 * whitespace-insensitive). Lets a hint confirm an unlabelled OCR line.
 */
export function findHintedName(
  lines: readonly string[],
  hint: string | undefined,
): string | undefined {
  const needle = (hint ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (needle.length < 3) return undefined;
  for (const line of lines) {
    const hay = line.toLowerCase();
    if (hay.includes(needle)) {
      const clean = line.replace(LABELS.name, '');
      return stripLabelPunctuation(clean) || line;
    }
  }
  return undefined;
}

/** Strips a trailing/leading label fragment and junk from a name value. */
export function cleanName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = stripLabelPunctuation(value)
    .replace(/[^\p{L}\p{M}.' -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 ? cleaned : undefined;
}

/** Fills `field` with the best name available: hint-confirmed line, label, heuristic, then hint. */
export function extractName(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
  hints: ExtractionHints | undefined,
  options: { heuristicIndex?: number; avoid?: ReadonlySet<string> } = {},
): void {
  const hinted = findHintedName(lines, hints?.memberName);
  if (hinted) {
    collector.set(field, cleanName(hinted), CONFIDENCE.regex);
    return;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line === undefined ||
      LABELS.relation.test(line) ||
      !LABELS.name.test(line)
    )
      continue;
    const value = cleanName(valueAfterLabel(lines, i, LABELS.name));
    if (value && collector.set(field, value, CONFIDENCE.label)) return;
  }
  if (options.heuristicIndex !== undefined) {
    const candidates = nameLines(lines).filter(
      (c) => !options.avoid?.has(c.value),
    );
    const pick = candidates[options.heuristicIndex];
    if (pick && collector.set(field, pick.value, CONFIDENCE.label)) return;
  }
  if (hints?.memberName)
    collector.set(field, cleanName(hints.memberName), CONFIDENCE.hint);
}

/** Fills the relation field ("Father's Name" / "S/O" / ...). */
export function extractRelation(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
  options: { heuristic?: boolean; avoid?: ReadonlySet<string> } = {},
): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !LABELS.relation.test(line)) continue;
    const value = cleanName(valueAfterLabel(lines, i, LABELS.relation));
    if (value && collector.set(field, value, CONFIDENCE.label)) return;
  }
  if (options.heuristic) {
    const pick = nameLines(lines).find((c) => !options.avoid?.has(c.value));
    if (pick) collector.set(field, pick.value, CONFIDENCE.label);
  }
}

const GENDER_WORDS: ReadonlyArray<[RegExp, string]> = [
  [/\bFEMALE\b|महिला|स्त्री/i, 'Female'],
  [/\bTRANSGENDER\b|अन्य/i, 'Transgender'],
  [/\bMALE\b|पुरुष/i, 'Male'],
];

export function extractGender(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
): void {
  const text = lines.join('\n');
  for (const [pattern, value] of GENDER_WORDS) {
    if (pattern.test(text)) {
      collector.set(field, value, CONFIDENCE.regex);
      return;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !LABELS.gender.test(line)) continue;
    const value = valueAfterLabel(lines, i, LABELS.gender) ?? '';
    const letter = /^([MFT])\b/i.exec(value)?.[1]?.toUpperCase();
    if (letter === 'M') collector.set(field, 'Male', CONFIDENCE.label);
    else if (letter === 'F') collector.set(field, 'Female', CONFIDENCE.label);
    else if (letter === 'T')
      collector.set(field, 'Transgender', CONFIDENCE.label);
    if (collector.has(field)) return;
  }
}

const BLOOD_GROUP =
  /(?<![A-Za-z])(AB|A|B|O)\s?([+-])(?:\s?ve)?(?![A-Za-z0-9])/i;

export function extractBloodGroup(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
): void {
  const format = (m: RegExpExecArray): string =>
    `${(m[1] ?? '').toUpperCase()}${m[2] ?? ''}`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !LABELS.bloodGroup.test(line)) continue;
    const target = valueAfterLabel(lines, i, LABELS.bloodGroup) ?? line;
    const match = BLOOD_GROUP.exec(target) ?? BLOOD_GROUP.exec(line);
    if (match) {
      collector.set(field, format(match), CONFIDENCE.validated);
      return;
    }
  }
  for (const line of lines) {
    const match = BLOOD_GROUP.exec(line);
    if (match) {
      collector.set(field, format(match), CONFIDENCE.regex);
      return;
    }
  }
}

const ADDRESS_STOP =
  /\b(?:Signature|Sign\b|Help|www\.|Phone|Mobile|Valid|Issue|Issued|Blood|DOB|Date\s*of|Class|Authority|RTO)\b/i;

/** Lines after an 'Address' label joined with ', ' (max `maxLines`). */
export function extractAddress(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
  maxLines = 4,
): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !LABELS.address.test(line)) continue;
    const match = LABELS.address.exec(line);
    const parts: string[] = [];
    const first = stripLabelPunctuation(
      line.slice((match?.index ?? 0) + (match?.[0].length ?? 0)),
    );
    if (first) parts.push(first);
    for (let j = i + 1; j < lines.length && parts.length < maxLines; j++) {
      const next = lines[j];
      if (
        next === undefined ||
        ADDRESS_STOP.test(next) ||
        findDates([next]).length > 0
      )
        break;
      if (/^\d{4}\s?\d{4}\s?\d{4}$/.test(next)) break;
      parts.push(stripLabelPunctuation(next));
      if (/\b\d{6}\b/.test(next)) break; // PIN code closes an Indian address
    }
    if (parts.length) {
      collector.set(field, parts.filter(Boolean).join(', '), CONFIDENCE.label);
      return;
    }
  }
}

/** Generic "label: value" extraction into `field`. */
export function extractLabelled(
  lines: readonly string[],
  collector: FieldCollector,
  field: string,
  label: RegExp,
  confidence: number = CONFIDENCE.label,
  transform: (value: string) => string | undefined = (v) => v,
): boolean {
  const hit = findLabelled(lines, label);
  if (!hit) return false;
  return collector.set(field, transform(hit.value), confidence);
}

/** Joined text for full-document regex checks. */
export function joinLines(lines: readonly string[]): string {
  return lines.join('\n');
}
