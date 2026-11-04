import type { FamilyMember, VaultDocument } from '@pranav/shared-models';

const T = '2026-09-02T09:00:00.000Z';

export const testMembers: FamilyMember[] = [
  {
    id: 'm1',
    name: 'Pranav Joshi',
    relation: 'Self',
    colorIndex: 0,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'm2',
    name: 'Sunita Joshi',
    relation: 'Mother',
    colorIndex: 1,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'm3',
    name: 'Rajesh Joshi',
    relation: 'Father',
    colorIndex: 2,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'm4',
    name: 'Aarav Joshi',
    relation: 'Son',
    colorIndex: 3,
    createdAt: T,
    updatedAt: T,
  },
];

export const testDocuments: VaultDocument[] = [
  {
    id: 'd1',
    memberId: 'm1',
    type: 'aadhaar',
    source: 'issued',
    issuer: {
      code: 'UIDAI',
      name: 'Unique Identification Authority of India',
      signedAt: T,
    },
    fields: { 'Aadhaar Number': '7391 4820 1163', Name: 'Pranav Rajesh Joshi' },
    files: {},
    addedAt: T,
    updatedAt: T,
  },
  {
    id: 'd9',
    memberId: 'm1',
    type: 'other',
    source: 'uploaded',
    fields: {
      'Document Title': 'Health Insurance Card',
      'Document Number': 'HDFC-ERGO 2820 4411 90',
      Name: 'Pranav Joshi',
      'Issued By': 'HDFC ERGO',
    },
    files: {},
    addedAt: T,
    updatedAt: T,
  },
  {
    id: 'd8',
    memberId: 'm4',
    type: 'other',
    source: 'uploaded',
    fields: {
      'Document Title': 'Birth Certificate',
      'Document Number': 'BMC/2019/AW/004471',
      Name: 'Aarav Pranav Joshi',
      'Issued By': 'Brihanmumbai Municipal Corporation',
    },
    files: {},
    addedAt: T,
    updatedAt: T,
  },
];
