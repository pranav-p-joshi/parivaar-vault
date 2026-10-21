import type { FamilyMember, VaultDocument } from '@pranav/shared-models';

/**
 * Example family used for demos and first-run exploration. Numbers are made up
 * and are not valid identifiers.
 */
const T = '2026-09-02T09:00:00.000Z';

export const SAMPLE_MEMBERS: FamilyMember[] = [
  {
    id: 'sample-m1',
    name: 'Pranav Joshi',
    relation: 'Self',
    colorIndex: 0,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'sample-m2',
    name: 'Sunita Joshi',
    relation: 'Mother',
    colorIndex: 1,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'sample-m3',
    name: 'Rajesh Joshi',
    relation: 'Father',
    colorIndex: 2,
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'sample-m4',
    name: 'Aarav Joshi',
    relation: 'Son',
    colorIndex: 3,
    createdAt: T,
    updatedAt: T,
  },
];

const issued = (code: string, name: string, uri: string) => ({
  code,
  name,
  signedAt: T,
  digilockerUri: uri,
});

export const SAMPLE_DOCUMENTS: VaultDocument[] = [
  {
    id: 'sample-d1',
    memberId: 'sample-m1',
    type: 'aadhaar',
    source: 'issued',
    issuer: issued(
      'UIDAI',
      'Unique Identification Authority of India',
      'in.gov.uidai-ADHAR-sample1',
    ),
    fields: {
      'Aadhaar Number': '7391 4820 1163',
      Name: 'Pranav Rajesh Joshi',
      'Date of Birth': '14/03/1994',
      Gender: 'Male',
      Address:
        'B-402, Shanti Niketan CHS, Andheri West, Mumbai, Maharashtra - 400053',
      VID: '9163 8274 0192 4471',
    },
    files: {},
    addedAt: T,
    updatedAt: T,
  },
  {
    id: 'sample-d2',
    memberId: 'sample-m1',
    type: 'pan',
    source: 'issued',
    issuer: issued('ITD', 'Income Tax Department', 'in.gov.pan-PANCR-sample2'),
    fields: {
      PAN: 'BQKPJ4471M',
      Name: 'PRANAV RAJESH JOSHI',
      "Father's Name": 'RAJESH MOHAN JOSHI',
      'Date of Birth': '14/03/1994',
      Status: 'Active',
    },
    files: {},
    addedAt: T,
    updatedAt: T,
  },
  {
    id: 'sample-d3',
    memberId: 'sample-m1',
    type: 'dl',
    source: 'issued',
    issuer: issued(
      'MoRTH',
      'Ministry of Road Transport & Highways',
      'in.gov.transport-DRVLC-sample3',
    ),
    fields: {
      'DL Number': 'MH02 20150041823',
      Name: 'PRANAV RAJESH JOSHI',
      'Son/Daughter/Wife of': 'RAJESH MOHAN JOSHI',
      'Date of Birth': '14/03/1994',
      'Blood Group': 'B+',
      'Issue Date': '18/06/2015',
      'Valid Till (NT)': '13/03/2034',
      'Vehicle Classes': 'LMV, MCWG',
      'Issuing RTO': 'MH02 Andheri',
      Address: 'B-402, Shanti Niketan CHS, Andheri West, Mumbai - 400053',
    },
    files: {},
    addedAt: '2026-09-10T09:00:00.000Z',
    updatedAt: '2026-09-10T09:00:00.000Z',
  },
  {
    id: 'sample-d4',
    memberId: 'sample-m2',
    type: 'aadhaar',
    source: 'issued',
    issuer: issued(
      'UIDAI',
      'Unique Identification Authority of India',
      'in.gov.uidai-ADHAR-sample4',
    ),
    fields: {
      'Aadhaar Number': '5820 1947 3306',
      Name: 'Sunita Rajesh Joshi',
      'Date of Birth': '02/11/1966',
      Gender: 'Female',
      Address:
        'B-402, Shanti Niketan CHS, Andheri West, Mumbai, Maharashtra - 400053',
      VID: '4471 0928 6173 5520',
    },
    files: {},
    addedAt: '2026-09-04T09:00:00.000Z',
    updatedAt: '2026-09-04T09:00:00.000Z',
  },
  {
    id: 'sample-d5',
    memberId: 'sample-m2',
    type: 'voter',
    source: 'issued',
    issuer: issued(
      'ECI',
      'Election Commission of India',
      'in.gov.eci-EPICC-sample5',
    ),
    fields: {
      'EPIC Number': 'MT/09/078/441027',
      Name: 'Sunita Joshi',
      'Relation Name': 'Rajesh Joshi',
      Gender: 'Female',
      'Date of Birth': '02/11/1966',
      'Assembly Constituency': '164 - Andheri West',
      'Part Number': '118',
      Address: 'B-402, Shanti Niketan CHS, Andheri West, Mumbai',
    },
    files: {},
    addedAt: '2026-09-04T09:30:00.000Z',
    updatedAt: '2026-09-04T09:30:00.000Z',
  },
  {
    id: 'sample-d6',
    memberId: 'sample-m3',
    type: 'passport',
    source: 'issued',
    issuer: issued(
      'MEA',
      'Ministry of External Affairs',
      'in.gov.mea-PSPRT-sample6',
    ),
    fields: {
      'Passport Number': 'N8831047',
      Surname: 'JOSHI',
      'Given Name': 'RAJESH MOHAN',
      Nationality: 'INDIAN',
      'Date of Birth': '21/07/1962',
      'Place of Birth': 'PUNE, MAHARASHTRA',
      'Date of Issue': '03/02/2019',
      'Date of Expiry': '02/02/2029',
      'Place of Issue': 'MUMBAI',
    },
    files: {},
    addedAt: '2026-09-06T09:00:00.000Z',
    updatedAt: '2026-09-06T09:00:00.000Z',
  },
  {
    id: 'sample-d7',
    memberId: 'sample-m3',
    type: 'pan',
    source: 'issued',
    issuer: issued('ITD', 'Income Tax Department', 'in.gov.pan-PANCR-sample7'),
    fields: {
      PAN: 'AHSPJ1182K',
      Name: 'RAJESH MOHAN JOSHI',
      "Father's Name": 'MOHAN VASANT JOSHI',
      'Date of Birth': '21/07/1962',
      Status: 'Active',
    },
    files: {},
    addedAt: '2026-09-06T09:10:00.000Z',
    updatedAt: '2026-09-06T09:10:00.000Z',
  },
  {
    id: 'sample-d8',
    memberId: 'sample-m4',
    type: 'other',
    source: 'uploaded',
    fields: {
      'Document Title': 'Birth Certificate',
      'Document Number': 'BMC/2019/AW/004471',
      Name: 'Aarav Pranav Joshi',
      'Issued By': 'Brihanmumbai Municipal Corporation',
      'Issue Date': '09/08/2019',
    },
    files: {},
    addedAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-09-12T09:00:00.000Z',
  },
  {
    id: 'sample-d9',
    memberId: 'sample-m1',
    type: 'other',
    source: 'uploaded',
    fields: {
      'Document Title': 'Health Insurance Card',
      'Document Number': 'HDFC-ERGO 2820 4411 90',
      Name: 'Pranav Joshi',
      'Issued By': 'HDFC ERGO',
      'Issue Date': '01/04/2026',
      'Expiry Date': '31/03/2027',
    },
    files: {},
    addedAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
  },
];

export function isSampleId(id: string): boolean {
  return id.startsWith('sample-');
}
