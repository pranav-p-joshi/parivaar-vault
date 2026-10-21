/** Shared domain types for Parivaar Vault. */

export type Id = string;
/** Calendar date as YYYY-MM-DD. */
export type IsoDate = string;
/** Full timestamp in ISO 8601. */
export type IsoDateTime = string;

export const RELATIONS = [
  'Self',
  'Spouse',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Other',
] as const;
export type Relation = (typeof RELATIONS)[number];

/** Avatar/chip colours, indexed by `Member.colorIndex`. */
export const MEMBER_COLORS = [
  '#1b2a6b',
  '#f0843a',
  '#1f8a4c',
  '#8a3ab9',
  '#c9302c',
  '#0f7c8c',
];

export interface FamilyMember {
  id: Id;
  name: string;
  relation: Relation;
  colorIndex: number;
  dateOfBirth?: IsoDate;
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const DOC_TYPES = [
  'aadhaar',
  'pan',
  'voter',
  'dl',
  'passport',
  'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Issued = fetched from the issuer (DigiLocker), Uploaded = scanned/uploaded by the user. */
export type DocSource = 'issued' | 'uploaded';

export interface DocIssuer {
  /** Short issuer code, e.g. "UIDAI". */
  code: string;
  name: string;
  signedAt?: IsoDateTime;
  digilockerUri?: string;
}

/** Encrypted file references for a document. */
export interface DocumentFiles {
  frontFileId?: Id;
  backFileId?: Id;
  pdfFileId?: Id;
}

export interface VaultDocument {
  id: Id;
  memberId: Id;
  type: DocType;
  source: DocSource;
  issuer?: DocIssuer;
  /** Keys come from `DOC_TYPE_REGISTRY[type].fields`. */
  fields: Record<string, string>;
  files: DocumentFiles;
  /** Per-field OCR confidence 0..1, present for uploaded documents. */
  confidence?: Record<string, number>;
  addedAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface VaultFileMeta {
  id: Id;
  name: string;
  mimeType: string;
  /** Size of the plaintext in bytes. */
  size: number;
  createdAt: IsoDateTime;
}

/** Stored record: `data` holds the AES-GCM ciphertext (IV prefixed). */
export interface VaultFileRecord extends VaultFileMeta {
  data: ArrayBuffer;
}

export type ExpiryStatus = 'expired' | 'critical' | 'soon' | 'ok' | 'none';

export interface ExpiryReminder {
  document: VaultDocument;
  expiryDate: IsoDate;
  daysLeft: number;
  status: ExpiryStatus;
}

/** The local family account created at sign-up. The password itself is never stored. */
export interface FamilyAccount {
  familyName: string;
  headName: string;
  /** 10-digit Indian mobile number without country code. */
  mobile: string;
  email?: string;
  createdAt: IsoDateTime;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface VaultSettings {
  autoLockMinutes: number;
  theme: ThemePreference;
  digilockerConnected: boolean;
}

export const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 2,
  theme: 'system',
  digilockerConnected: false,
};

export interface VaultBackup {
  version: 2;
  app: 'parivaar-vault';
  exportedAt: IsoDateTime;
  /** Base64 PBKDF2 salt of the vault that produced this backup. */
  salt: string;
  /** Base64 data key wrapped with the PIN-derived key. */
  wrappedKey: string;
  members: FamilyMember[];
  documents: VaultDocument[];
  /** `data` is the base64 ciphertext of each file. */
  files: Array<VaultFileMeta & { data: string }>;
}
