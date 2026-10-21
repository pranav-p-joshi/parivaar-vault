import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.pan.fields;
const [PAN, NAME, FATHER, DOB, STATUS] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

const NEW_CARD = `INCOME TAX DEPARTMENT
GOVT. OF INDIA
Permanent Account Number Card
ABCPS1234F
Name
RAHUL SHARMA
Father's Name
RAMESH SHARMA
Date of Birth
14/03/1994
Signature`;

const OLD_CARD = `INCOME TAX DEPARTMENT
GOVT. OF INDIA
RAHUL SHARMA
RAMESH SHARMA
14/03/1994
Permanent Account Number
ABCPS1234F`;

describe('extractPan', () => {
  it('uses the registry field names only', () => {
    expect(PAN).toBe('PAN');
    const { fields } = extractFields('pan', ocr(NEW_CARD));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('extracts a validated PAN and derives the status from its fourth letter', () => {
    const { fields, confidence } = extractFields('pan', ocr(NEW_CARD));
    expect(fields[PAN]).toBe('ABCPS1234F');
    expect(confidence[PAN]).toBeGreaterThanOrEqual(0.9);
    expect(fields[STATUS]).toBe('Individual');
    expect(confidence[STATUS]).toBeCloseTo(0.7, 5);
  });

  it('reads labelled name, father name and DOB on new-format cards', () => {
    const { fields, confidence } = extractFields('pan', ocr(NEW_CARD));
    expect(fields[NAME]).toBe('RAHUL SHARMA');
    expect(fields[FATHER]).toBe('RAMESH SHARMA');
    expect(confidence[NAME]).toBeCloseTo(0.5, 5);
    expect(confidence[FATHER]).toBeCloseTo(0.5, 5);
    expect(fields[DOB]).toBe('14/03/1994');
    expect(confidence[DOB]).toBeGreaterThanOrEqual(0.8);
  });

  it('falls back to bare name lines and positional DOB on old-format cards', () => {
    const { fields, confidence } = extractFields('pan', ocr(OLD_CARD));
    expect(fields[PAN]).toBe('ABCPS1234F');
    expect(fields[NAME]).toBe('RAHUL SHARMA');
    expect(fields[FATHER]).toBe('RAMESH SHARMA');
    expect(fields[DOB]).toBe('14/03/1994');
    expect(confidence[DOB]).toBeCloseTo(0.5, 5);
  });

  it('reports the hint as name with 0.4 confidence when no name is found', () => {
    const { fields, confidence } = extractFields(
      'pan',
      ocr('ABCPS1234F\n14/03/1994'),
      { memberName: 'Rahul Sharma' },
    );
    expect(fields[NAME]).toBe('Rahul Sharma');
    expect(confidence[NAME]).toBeCloseTo(0.4, 5);
  });

  it('ignores lower-case words that resemble a PAN', () => {
    const { fields } = extractFields('pan', ocr('hello1234x'));
    expect(fields[PAN]).toBeUndefined();
  });
});
