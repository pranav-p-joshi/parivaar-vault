import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { verhoeffCheck } from '@pranav/shared-util';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.aadhaar.fields;
const [NUMBER, NAME, DOB, GENDER, ADDRESS, VID] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

/** Brute-forces a Verhoeff-valid 12-digit number from an 11-digit prefix. */
function validAadhaar(prefix: string): string {
  for (let d = 0; d < 10; d++) {
    const candidate = `${prefix}${d}`;
    if (verhoeffCheck(candidate)) return candidate;
  }
  throw new Error('no valid check digit');
}

const AADHAAR = validAadhaar('23456789012'); // 234567890124
const INVALID = `${AADHAAR.slice(0, 11)}${(Number(AADHAAR.slice(-1)) + 1) % 10}`;

const FRONT = `भारत सरकार
Government of India
राहुल शर्मा
Rahul Sharma
जन्म तिथि / DOB: 14/03/1994
पुरुष / MALE

${AADHAAR.slice(0, 4)} ${AADHAAR.slice(4, 8)} ${AADHAAR.slice(8)}
VID : 9123 4567 8901 2346
मेरा आधार, मेरी पहचान`;

const BACK = `Unique Identification Authority of India
Address:
S/O Ramesh Sharma, Flat 12, Shanti Niwas
MG Road, Shivaji Nagar
Pune, Maharashtra - 411005
${AADHAAR.slice(0, 4)} ${AADHAAR.slice(4, 8)} ${AADHAAR.slice(8)}
help@uidai.gov.in  www.uidai.gov.in`;

describe('extractAadhaar', () => {
  it('uses the registry field names only', () => {
    expect(NUMBER).toBe('Aadhaar Number');
    expect(verhoeffCheck(AADHAAR)).toBe(true);
    const { fields } = extractFields('aadhaar', ocr(FRONT));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('extracts the Verhoeff-valid number formatted as printed', () => {
    const { fields, confidence } = extractFields('aadhaar', ocr(FRONT));
    expect(fields[NUMBER]).toBe('2345 6789 0124');
    expect(confidence[NUMBER]).toBeGreaterThanOrEqual(0.9);
  });

  it('prefers a candidate that passes the Verhoeff check', () => {
    const text = `${INVALID.slice(0, 4)} ${INVALID.slice(4, 8)} ${INVALID.slice(8)}\nRahul Sharma\n${AADHAAR}`;
    const { fields, confidence } = extractFields('aadhaar', ocr(text));
    expect(fields[NUMBER]).toBe('2345 6789 0124');
    expect(confidence[NUMBER]).toBeGreaterThanOrEqual(0.9);
  });

  it('falls back to a regex-only number with lower confidence', () => {
    const text = `${INVALID.slice(0, 4)} ${INVALID.slice(4, 8)} ${INVALID.slice(8)}`;
    const { fields, confidence } = extractFields('aadhaar', ocr(text));
    expect(fields[NUMBER]).toBe(
      `${INVALID.slice(0, 4)} ${INVALID.slice(4, 8)} ${INVALID.slice(8)}`,
    );
    expect(confidence[NUMBER]).toBeCloseTo(0.7, 5);
  });

  it('extracts the 16-digit VID separately from the number', () => {
    const { fields } = extractFields('aadhaar', ocr(FRONT));
    expect(fields[VID]).toBe('9123 4567 8901 2346');
    expect(fields[NUMBER]).toBe('2345 6789 0124');
  });

  it('extracts name, labelled DOB and gender', () => {
    const { fields, confidence } = extractFields('aadhaar', ocr(FRONT));
    expect(fields[NAME]).toBe('Rahul Sharma');
    expect(confidence[NAME]).toBeGreaterThanOrEqual(0.5);
    expect(fields[DOB]).toBe('14/03/1994');
    expect(confidence[DOB]).toBeGreaterThanOrEqual(0.8);
    expect(fields[GENDER]).toBe('Male');
    expect(confidence[GENDER]).toBeGreaterThanOrEqual(0.7);
  });

  it('recognises Hindi gender words and dash/dot date separators', () => {
    const { fields } = extractFields(
      'aadhaar',
      ocr('Priya Sharma\nजन्म तिथि: 05.11.1990\nमहिला'),
    );
    expect(fields[GENDER]).toBe('Female');
    expect(fields[DOB]).toBe('05/11/1990');
    expect(extractFields('aadhaar', ocr('DOB 5-1-1990')).fields[DOB]).toBe(
      '05/01/1990',
    );
  });

  it('joins address lines after the Address label', () => {
    const { fields, confidence } = extractFields('aadhaar', ocr(BACK));
    expect(fields[ADDRESS]).toBe(
      'S/O Ramesh Sharma, Flat 12, Shanti Niwas, MG Road, Shivaji Nagar, Pune, Maharashtra - 411005',
    );
    expect(confidence[ADDRESS]).toBeCloseTo(0.5, 5);
    expect(fields[NAME]).toBeUndefined();
  });

  it('confirms the name from the member hint with higher confidence', () => {
    const { fields, confidence } = extractFields('aadhaar', ocr(FRONT), {
      memberName: 'rahul sharma',
    });
    expect(fields[NAME]).toBe('Rahul Sharma');
    expect(confidence[NAME]).toBeGreaterThanOrEqual(0.7);
  });

  it('uses hints as a low-confidence fallback when the text has no name or DOB', () => {
    const { fields, confidence } = extractFields('aadhaar', ocr(BACK), {
      memberName: 'Rahul Sharma',
      dateOfBirth: '1994-03-14',
    });
    expect(fields[NAME]).toBe('Rahul Sharma');
    expect(confidence[NAME]).toBeCloseTo(0.4, 5);
    expect(fields[DOB]).toBe('14/03/1994');
    expect(confidence[DOB]).toBeCloseTo(0.4, 5);
  });

  it('uses pre-split lines when the OCR result provides them', () => {
    const result = extractFields('aadhaar', {
      text: '',
      lines: ['Rahul Sharma', 'DOB: 14/03/1994'],
      confidence: 1,
    });
    expect(result.fields[NAME]).toBe('Rahul Sharma');
    expect(result.fields[DOB]).toBe('14/03/1994');
  });
});
