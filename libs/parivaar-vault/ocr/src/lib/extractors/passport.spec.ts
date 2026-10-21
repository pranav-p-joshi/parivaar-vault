import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.passport.fields;
const [NUMBER, SURNAME, GIVEN, NATIONALITY, DOB, POB, ISSUE, EXPIRY, POI] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

const DATA_PAGE = `REPUBLIC OF INDIA
Type: P   Country Code: IND   Passport No.: J8369854
Surname: SHARMA
Given Name(s): RAHUL
Nationality: INDIAN   Sex: M
Date of Birth: 14/03/1994
Place of Birth: PUNE, MAHARASHTRA
Place of Issue: PUNE
Date of Issue: 15/06/2019
Date of Expiry: 14/06/2029
P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
J8369854<4IND9403140M2906155<<<<<<<<<<<<<<<2`;

describe('extractPassport', () => {
  it('uses the registry field names only', () => {
    expect(NUMBER).toBe('Passport Number');
    const { fields } = extractFields('passport', ocr(DATA_PAGE));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('extracts a validated passport number', () => {
    const { fields, confidence } = extractFields('passport', ocr(DATA_PAGE));
    expect(fields[NUMBER]).toBe('J8369854');
    expect(confidence[NUMBER]).toBeGreaterThanOrEqual(0.9);
  });

  it('prefers MRZ names over labelled ones', () => {
    const { fields, confidence } = extractFields('passport', ocr(DATA_PAGE));
    expect(fields[SURNAME]).toBe('SHARMA');
    expect(fields[GIVEN]).toBe('RAHUL');
    expect(confidence[SURNAME]).toBeGreaterThanOrEqual(0.9);
  });

  it('reads labelled names when there is no MRZ', () => {
    const { fields, confidence } = extractFields(
      'passport',
      ocr('Surname: SHARMA\nGiven Name(s): RAHUL KUMAR'),
    );
    expect(fields[SURNAME]).toBe('SHARMA');
    expect(fields[GIVEN]).toBe('RAHUL KUMAR');
    expect(confidence[GIVEN]).toBeCloseTo(0.5, 5);
  });

  it('maps all three dates by label and the places', () => {
    const { fields } = extractFields('passport', ocr(DATA_PAGE));
    expect(fields[DOB]).toBe('14/03/1994');
    expect(fields[ISSUE]).toBe('15/06/2019');
    expect(fields[EXPIRY]).toBe('14/06/2029');
    expect(fields[POB]).toBe('PUNE, MAHARASHTRA');
    expect(fields[POI]).toBe('PUNE');
  });

  it('sets nationality from the label or defaults to INDIAN', () => {
    expect(extractFields('passport', ocr(DATA_PAGE)).fields[NATIONALITY]).toBe(
      'INDIAN',
    );
    expect(
      extractFields('passport', ocr('REPUBLIC OF INDIA\nK1234567')).fields[
        NATIONALITY
      ],
    ).toBe('INDIAN');
    expect(
      extractFields('passport', ocr('K1234567')).fields[NATIONALITY],
    ).toBeUndefined();
  });

  it('splits the member hint into surname and given name as a fallback', () => {
    const { fields, confidence } = extractFields('passport', ocr('K1234567'), {
      memberName: 'Rahul Kumar Sharma',
    });
    expect(fields[SURNAME]).toBe('Sharma');
    expect(fields[GIVEN]).toBe('Rahul Kumar');
    expect(confidence[SURNAME]).toBeCloseTo(0.4, 5);
  });
});
