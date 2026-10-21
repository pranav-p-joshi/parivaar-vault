import type { DocType, VaultDocument } from './models';

/**
 * Single source of truth for everything a document type implies: the card
 * skin, the ordered field list (as printed on the real card), which field is
 * the number, how to mask it, and which fields drive reminders.
 */
export interface DocTypeDef {
  id: DocType;
  /** Display name, e.g. "Aadhaar Card". */
  name: string;
  /** Issuing authority full name. */
  issuer: string;
  /** Issuer short code shown on cards and in the fetch sequence. */
  issuerCode: string;
  /** CSS skin class suffix for card renderers. */
  skin: string;
  numberKey: string;
  nameKey: string;
  /** Ordered as on the card. */
  fields: readonly string[];
  /** Fields that need a full-width input. */
  wideFields: readonly string[];
  dobKey?: string;
  expiryKey?: string;
  /** Validation pattern for the number (after removing spaces). */
  numberPattern?: RegExp;
  /** Whether the card has a back side worth capturing. */
  hasBack: boolean;
  mask: (value: string) => string;
}

const compact = (v: string) => v.replace(/\s+/g, '');

export const DOC_TYPE_REGISTRY: Record<DocType, DocTypeDef> = {
  aadhaar: {
    id: 'aadhaar',
    name: 'Aadhaar Card',
    issuer: 'Unique Identification Authority of India',
    issuerCode: 'UIDAI',
    skin: 'aadhaar',
    numberKey: 'Aadhaar Number',
    nameKey: 'Name',
    fields: [
      'Aadhaar Number',
      'Name',
      'Date of Birth',
      'Gender',
      'Address',
      'VID',
    ],
    wideFields: ['Address'],
    dobKey: 'Date of Birth',
    numberPattern: /^[2-9]\d{11}$/,
    hasBack: true,
    mask: (v) =>
      compact(v).length >= 4 ? `XXXX XXXX ${compact(v).slice(-4)}` : v,
  },
  pan: {
    id: 'pan',
    name: 'PAN Card',
    issuer: 'Income Tax Department',
    issuerCode: 'ITD',
    skin: 'pan',
    numberKey: 'PAN',
    nameKey: 'Name',
    fields: ['PAN', 'Name', "Father's Name", 'Date of Birth', 'Status'],
    wideFields: [],
    dobKey: 'Date of Birth',
    numberPattern: /^[A-Z]{5}\d{4}[A-Z]$/i,
    hasBack: false,
    mask: (v) =>
      compact(v).length >= 6
        ? `${compact(v).slice(0, 5)}XXXX${compact(v).slice(-1)}`
        : v,
  },
  voter: {
    id: 'voter',
    name: 'Voter ID (EPIC)',
    issuer: 'Election Commission of India',
    issuerCode: 'ECI',
    skin: 'voter',
    numberKey: 'EPIC Number',
    nameKey: 'Name',
    fields: [
      'EPIC Number',
      'Name',
      'Relation Name',
      'Gender',
      'Date of Birth',
      'Assembly Constituency',
      'Part Number',
      'Address',
    ],
    wideFields: ['Address', 'Assembly Constituency'],
    dobKey: 'Date of Birth',
    numberPattern: /^([A-Z]{3}\d{7}|[A-Z]{2}\/\d{2}\/\d{3}\/\d{6})$/i,
    hasBack: true,
    mask: (v) =>
      compact(v).length >= 6
        ? `${compact(v).slice(0, 3)}XXXX${compact(v).slice(-3)}`
        : v,
  },
  dl: {
    id: 'dl',
    name: 'Driving Licence',
    issuer: 'Ministry of Road Transport & Highways',
    issuerCode: 'MoRTH',
    skin: 'dl',
    numberKey: 'DL Number',
    nameKey: 'Name',
    fields: [
      'DL Number',
      'Name',
      'Son/Daughter/Wife of',
      'Date of Birth',
      'Blood Group',
      'Issue Date',
      'Valid Till (NT)',
      'Vehicle Classes',
      'Issuing RTO',
      'Address',
    ],
    wideFields: ['Address', 'Vehicle Classes'],
    dobKey: 'Date of Birth',
    expiryKey: 'Valid Till (NT)',
    numberPattern: /^[A-Z]{2}\d{2}\d{11}$/i,
    hasBack: true,
    mask: (v) =>
      compact(v).length >= 7
        ? `${compact(v).slice(0, 4)} XXXXXXX ${compact(v).slice(-3)}`
        : v,
  },
  passport: {
    id: 'passport',
    name: 'Passport',
    issuer: 'Ministry of External Affairs',
    issuerCode: 'MEA',
    skin: 'passport',
    numberKey: 'Passport Number',
    nameKey: 'Given Name',
    fields: [
      'Passport Number',
      'Surname',
      'Given Name',
      'Nationality',
      'Date of Birth',
      'Place of Birth',
      'Date of Issue',
      'Date of Expiry',
      'Place of Issue',
    ],
    wideFields: ['Place of Birth'],
    dobKey: 'Date of Birth',
    expiryKey: 'Date of Expiry',
    numberPattern: /^[A-Z]\d{7}$/i,
    hasBack: false,
    mask: (v) =>
      compact(v).length >= 2
        ? `${compact(v).slice(0, 1)}XXXXXX${compact(v).slice(-1)}`
        : v,
  },
  other: {
    id: 'other',
    name: 'Other document',
    issuer: 'Uploaded by you',
    issuerCode: '',
    skin: 'other',
    numberKey: 'Document Number',
    nameKey: 'Name',
    fields: [
      'Document Title',
      'Document Number',
      'Name',
      'Issued By',
      'Issue Date',
      'Expiry Date',
    ],
    wideFields: ['Document Title', 'Issued By'],
    expiryKey: 'Expiry Date',
    hasBack: false,
    mask: (v) => v,
  },
};

export const DOC_TYPE_LIST: DocTypeDef[] = DOC_TYPES_ORDER().map(
  (t) => DOC_TYPE_REGISTRY[t],
);

function DOC_TYPES_ORDER(): DocType[] {
  return ['aadhaar', 'pan', 'voter', 'dl', 'passport', 'other'];
}

/** Fields rendered in monospace with tabular digits. */
export const MONO_FIELD = /Number|PAN|VID|EPIC/;

export function docTypeDef(type: DocType): DocTypeDef {
  return DOC_TYPE_REGISTRY[type] ?? DOC_TYPE_REGISTRY.other;
}

export function documentTitle(
  doc: Pick<VaultDocument, 'type' | 'fields'>,
): string {
  if (doc.type === 'other') return doc.fields['Document Title'] || 'Document';
  return docTypeDef(doc.type).name;
}

export function documentNumber(
  doc: Pick<VaultDocument, 'type' | 'fields'>,
): string {
  return doc.fields[docTypeDef(doc.type).numberKey] ?? '';
}

export function documentMaskedNumber(
  doc: Pick<VaultDocument, 'type' | 'fields'>,
): string {
  const value = documentNumber(doc);
  return value ? docTypeDef(doc.type).mask(value) : '';
}

export function documentIssuerName(
  doc: Pick<VaultDocument, 'type' | 'fields' | 'issuer'>,
): string {
  if (doc.issuer?.name) return doc.issuer.name;
  if (doc.type === 'other') return doc.fields['Issued By'] || 'Uploaded';
  return docTypeDef(doc.type).issuer;
}

/** Raw expiry value as typed on the card (may be dd/mm/yyyy). */
export function documentExpiryRaw(
  doc: Pick<VaultDocument, 'type' | 'fields'>,
): string | undefined {
  const key = docTypeDef(doc.type).expiryKey;
  const value = key ? doc.fields[key] : undefined;
  return value && value !== '—' ? value : undefined;
}
