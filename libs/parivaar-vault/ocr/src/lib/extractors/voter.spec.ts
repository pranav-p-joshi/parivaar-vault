import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.voter.fields;
const [EPIC, NAME, RELATION, GENDER, DOB, CONSTITUENCY, PART, ADDRESS] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

const CARD = `ELECTION COMMISSION OF INDIA
IDENTITY CARD
ABC1234567
Elector's Name : Rahul Sharma
Father's Name : Ramesh Sharma
Sex : Male
Date of Birth : 14/03/1994
Address :
12 MG Road, Shivaji Nagar
Pune 411005
Assembly Constituency : 210 - Shivajinagar
Part Number : 45`;

describe('extractVoter', () => {
  it('uses the registry field names only', () => {
    expect(EPIC).toBe('EPIC Number');
    const { fields } = extractFields('voter', ocr(CARD));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('extracts a validated EPIC number', () => {
    const { fields, confidence } = extractFields('voter', ocr(CARD));
    expect(fields[EPIC]).toBe('ABC1234567');
    expect(confidence[EPIC]).toBeGreaterThanOrEqual(0.9);
  });

  it('accepts the legacy slash-separated EPIC format', () => {
    const { fields, confidence } = extractFields(
      'voter',
      ocr('EPIC No. XY/12/345/678901'),
    );
    expect(fields[EPIC]).toBe('XY/12/345/678901');
    expect(confidence[EPIC]).toBeGreaterThanOrEqual(0.9);
  });

  it('maps elector name, relation, gender and DOB', () => {
    const { fields, confidence } = extractFields('voter', ocr(CARD));
    expect(fields[NAME]).toBe('Rahul Sharma');
    expect(fields[RELATION]).toBe('Ramesh Sharma');
    expect(fields[GENDER]).toBe('Male');
    expect(fields[DOB]).toBe('14/03/1994');
    expect(confidence[NAME]).toBeCloseTo(0.5, 5);
    expect(confidence[DOB]).toBeGreaterThanOrEqual(0.8);
  });

  it('reads constituency, part number and address', () => {
    const { fields } = extractFields('voter', ocr(CARD));
    expect(fields[CONSTITUENCY]).toBe('210 - Shivajinagar');
    expect(fields[PART]).toBe('45');
    expect(fields[ADDRESS]).toBe('12 MG Road, Shivaji Nagar, Pune 411005');
  });

  it('maps a single-letter Sex label when no gender word is present', () => {
    const { fields } = extractFields('voter', ocr('Sex: F\nAge: 31'));
    expect(fields[GENDER]).toBe('Female');
    expect(fields[DOB]).toBeUndefined();
  });
});
