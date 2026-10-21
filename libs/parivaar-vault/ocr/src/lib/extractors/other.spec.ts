import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.other.fields;
const [TITLE, NUMBER, NAME, ISSUED_BY, ISSUE, EXPIRY] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

const CERTIFICATE = `Pune Municipal Corporation
Birth Certificate
Registration No: PMC/BC/2019/004512
Name: Aarav Sharma
Issued By: Registrar of Births and Deaths, Pune
Date of Issue: 20/06/2019
Valid upto 31/12/2030`;

describe('extractOther', () => {
  it('uses the registry field names only', () => {
    expect(TITLE).toBe('Document Title');
    const { fields } = extractFields('other', ocr(CERTIFICATE));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('takes the first wordy line as the title and the first id-like token as the number', () => {
    const { fields, confidence } = extractFields('other', ocr(CERTIFICATE));
    expect(fields[TITLE]).toBe('Pune Municipal Corporation');
    expect(fields[NUMBER]).toBe('PMC/BC/2019/004512');
    expect(confidence[NUMBER]).toBeCloseTo(0.7, 5);
  });

  it('skips dates and numeric-only lines when picking the title', () => {
    const { fields } = extractFields(
      'other',
      ocr('20/06/2019\n123456\nMembership Card\n987654321'),
    );
    expect(fields[TITLE]).toBe('Membership Card');
    expect(fields[NUMBER]).toBe('123456');
  });

  it('reads name, issuer and labelled dates', () => {
    const { fields, confidence } = extractFields('other', ocr(CERTIFICATE));
    expect(fields[NAME]).toBe('Aarav Sharma');
    expect(fields[ISSUED_BY]).toBe('Registrar of Births and Deaths, Pune');
    expect(fields[ISSUE]).toBe('20/06/2019');
    expect(fields[EXPIRY]).toBe('31/12/2030');
    expect(confidence[EXPIRY]).toBeGreaterThanOrEqual(0.8);
  });

  it('assigns unlabelled dates to issue then expiry', () => {
    const { fields } = extractFields(
      'other',
      ocr('Gym Membership\n01/01/2024\n31/12/2024'),
    );
    expect(fields[ISSUE]).toBe('01/01/2024');
    expect(fields[EXPIRY]).toBe('31/12/2024');
  });
});
