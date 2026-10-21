import { InjectionToken } from '@angular/core';
import type { DocIssuer, DocType } from '@pranav/shared-models';

/** One entry from DigiLocker's issued-documents list. */
export interface IssuedDocumentSummary {
  uri: string;
  type: DocType;
  name: string;
  issuerCode: string;
  issuerName: string;
  issuedOn?: string;
}

export interface FetchedDocument {
  fields: Record<string, string>;
  issuer: DocIssuer;
  /** PDF bytes when the issuer provides one. */
  pdf?: Blob;
}

/**
 * DigiLocker Partner (Requester) API surface the app depends on.
 *
 * TODO(real integration): implement with OAuth 2.0 + PKCE via `@capacitor/browser`,
 * a `parivaarvault://oauth` deep link, token storage in secure storage, then
 * `/issued-documents`, `/xml/{uri}` (parsed per type) and `/file/{uri}`.
 * Partner credentials come from partners.digitallocker.gov.in.
 */
export interface DigiLockerApi {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listIssued(): Promise<IssuedDocumentSummary[]>;
  fetchDocument(uri: string): Promise<FetchedDocument>;
}

export const DIGILOCKER_API = new InjectionToken<DigiLockerApi>(
  'DIGILOCKER_API',
);
