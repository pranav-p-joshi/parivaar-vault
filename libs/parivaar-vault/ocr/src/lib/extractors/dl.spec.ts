import { DOC_TYPE_REGISTRY } from '@pranav/shared-models';
import { extractFields } from '../extract-fields';
import type { OcrResult } from '../types';

const F = DOC_TYPE_REGISTRY.dl.fields;
const [
  NUMBER,
  NAME,
  RELATION,
  DOB,
  BLOOD,
  ISSUE,
  VALID_TILL,
  CLASSES,
  RTO,
  ADDRESS,
] = F;

const ocr = (text: string): OcrResult => ({ text, lines: [], confidence: 0.8 });

const CARD = `MAHARASHTRA STATE MOTOR DRIVING LICENCE
DL No: MH02 20150041823
Name: RAHUL SHARMA
S/D/W of: RAMESH SHARMA
DOB: 14/03/1994   BG: B+
Issue Date: 20/06/2015
Valid Till (NT): 19/06/2035
Valid Till (TR): 19/06/2018
COV: LMV, MCWG
Issuing Authority: RTO PUNE
Address: Flat 12, Shanti Niwas, MG Road
Pune, Maharashtra 411005`;

describe('extractDl', () => {
  it('uses the registry field names only', () => {
    expect(NUMBER).toBe('DL Number');
    const { fields } = extractFields('dl', ocr(CARD));
    for (const key of Object.keys(fields)) expect(F).toContain(key);
  });

  it('extracts the validated licence number in the canonical layout', () => {
    const { fields, confidence } = extractFields('dl', ocr(CARD));
    expect(fields[NUMBER]).toBe('MH02 20150041823');
    expect(confidence[NUMBER]).toBeGreaterThanOrEqual(0.9);
  });

  it('accepts dash-separated and unspaced licence numbers', () => {
    expect(
      extractFields('dl', ocr('DL MH-02-2015-0041823')).fields[NUMBER],
    ).toBe('MH02 20150041823');
    expect(extractFields('dl', ocr('MH0220150041823')).fields[NUMBER]).toBe(
      'MH02 20150041823',
    );
  });

  it('maps DOB, issue and the first validity date by label', () => {
    const { fields, confidence } = extractFields('dl', ocr(CARD));
    expect(fields[DOB]).toBe('14/03/1994');
    expect(fields[ISSUE]).toBe('20/06/2015');
    expect(fields[VALID_TILL]).toBe('19/06/2035');
    expect(confidence[VALID_TILL]).toBeGreaterThanOrEqual(0.8);
  });

  it('assigns unlabelled dates to DOB, issue then validity in order', () => {
    const { fields, confidence } = extractFields(
      'dl',
      ocr('14/03/1994\n20/06/2015\n19/06/2035'),
    );
    expect(fields[DOB]).toBe('14/03/1994');
    expect(fields[ISSUE]).toBe('20/06/2015');
    expect(fields[VALID_TILL]).toBe('19/06/2035');
    expect(confidence[DOB]).toBeCloseTo(0.5, 5);
  });

  it('uses the DOB hint to disambiguate unlabelled dates', () => {
    const { fields } = extractFields(
      'dl',
      ocr('20/06/2015\n14/03/1994\n19/06/2035'),
      { dateOfBirth: '14/03/1994' },
    );
    expect(fields[DOB]).toBe('14/03/1994');
    expect(fields[ISSUE]).toBe('20/06/2015');
    expect(fields[VALID_TILL]).toBe('19/06/2035');
  });

  it('reads name, relation, blood group, vehicle classes, RTO and address', () => {
    const { fields, confidence } = extractFields('dl', ocr(CARD));
    expect(fields[NAME]).toBe('RAHUL SHARMA');
    expect(fields[RELATION]).toBe('RAMESH SHARMA');
    expect(fields[BLOOD]).toBe('B+');
    expect(confidence[BLOOD]).toBeGreaterThanOrEqual(0.9);
    expect(fields[CLASSES]).toBe('LMV, MCWG');
    expect(fields[RTO]).toBe('RTO PUNE');
    expect(fields[ADDRESS]).toBe(
      'Flat 12, Shanti Niwas, MG Road, Pune, Maharashtra 411005',
    );
  });

  it('does not mistake address fragments for a blood group', () => {
    const { fields } = extractFields(
      'dl',
      ocr('Address: A-1 Block, Sector 5\nBlood Group: O-ve'),
    );
    expect(fields[BLOOD]).toBe('O-');
  });
});
