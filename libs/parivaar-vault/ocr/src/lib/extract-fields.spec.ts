import { DOC_TYPE_REGISTRY, DOC_TYPES } from '@pranav/shared-models';
import { extractFields } from './extract-fields';
import { normalizeOcrLines } from './extractors/common';
import type { OcrResult } from './types';

const NOISY = `
   Name:
Father's Name :
DOB:
Address:
Issue Date -
Valid Till :
Blood Group:
   `;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.3 });

describe('extractFields', () => {
  it.each(DOC_TYPES)(
    'never returns empty values or unknown keys for %s',
    (type) => {
      for (const text of [
        '',
        NOISY,
        'Government of India\n\n\n',
        '////\n--:--',
      ]) {
        const { fields, confidence } = extractFields(type, ocr(text));
        for (const [key, value] of Object.entries(fields)) {
          expect(DOC_TYPE_REGISTRY[type].fields).toContain(key);
          expect(value.trim().length).toBeGreaterThan(0);
          expect(confidence[key]).toBeGreaterThan(0);
          expect(confidence[key]).toBeLessThanOrEqual(1);
        }
        expect(Object.keys(confidence).sort()).toEqual(
          Object.keys(fields).sort(),
        );
      }
    },
  );

  it.each(DOC_TYPES)('has a confidence entry for every field on %s', (type) => {
    const { fields, confidence } = extractFields(
      type,
      ocr('Rahul Sharma\nDOB: 14/03/1994\nMALE'),
      {
        memberName: 'Rahul Sharma',
        dateOfBirth: '14/03/1994',
      },
    );
    expect(Object.keys(confidence).sort()).toEqual(Object.keys(fields).sort());
  });
});

describe('normalizeOcrLines', () => {
  it('trims, collapses whitespace and drops empty lines', () => {
    expect(normalizeOcrLines('  a   b \r\n\n\t\n c\td  \n')).toEqual([
      'a b',
      'c d',
    ]);
    expect(normalizeOcrLines('')).toEqual([]);
  });
});
