import { DEFAULT_SETTINGS, RELATIONS } from './models';
import {
  DOC_TYPE_LIST,
  DOC_TYPE_REGISTRY,
  documentMaskedNumber,
  documentTitle,
} from './doc-type.registry';

describe('models', () => {
  it('lists Self first among relations', () => {
    expect(RELATIONS[0]).toBe('Self');
  });

  it('defaults to a short auto-lock window', () => {
    expect(DEFAULT_SETTINGS.autoLockMinutes).toBeGreaterThan(0);
  });
});

describe('doc type registry', () => {
  it('orders the number field first for every type', () => {
    for (const def of DOC_TYPE_LIST) {
      if (def.id === 'other') continue;
      expect(def.fields[0]).toBe(def.numberKey);
    }
  });

  it('masks numbers like DigiLocker', () => {
    expect(DOC_TYPE_REGISTRY.aadhaar.mask('7391 4820 1163')).toBe(
      'XXXX XXXX 1163',
    );
    expect(DOC_TYPE_REGISTRY.pan.mask('BQKPJ4471M')).toBe('BQKPJXXXXM');
    expect(DOC_TYPE_REGISTRY.passport.mask('N8831047')).toBe('NXXXXXX7');
    expect(DOC_TYPE_REGISTRY.dl.mask('MH02 20150041823')).toBe(
      'MH02 XXXXXXX 823',
    );
  });

  it('derives titles and masked numbers from a document', () => {
    const doc = {
      type: 'other' as const,
      fields: {
        'Document Title': 'Birth Certificate',
        'Document Number': 'BMC/1',
      },
    };
    expect(documentTitle(doc)).toBe('Birth Certificate');
    expect(documentMaskedNumber(doc)).toBe('BMC/1');
    expect(documentTitle({ type: 'pan', fields: {} })).toBe('PAN Card');
  });
});
