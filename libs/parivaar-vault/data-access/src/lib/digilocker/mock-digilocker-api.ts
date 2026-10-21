import { Injectable } from '@angular/core';
import { docTypeDef, documentTitle } from '@pranav/shared-models';
import { nowIso } from '@pranav/shared-util';
import { SAMPLE_DOCUMENTS } from '../sample/sample-data';
import type {
  DigiLockerApi,
  FetchedDocument,
  IssuedDocumentSummary,
} from './digilocker-api';

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * In-memory stand-in used until DigiLocker partner credentials are available.
 * Serves the sample issued documents and simulates network latency.
 */
@Injectable({ providedIn: 'root' })
export class MockDigiLockerApi implements DigiLockerApi {
  private connected = false;

  async connect(): Promise<void> {
    await delay(900);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listIssued(): Promise<IssuedDocumentSummary[]> {
    await delay(700);
    return SAMPLE_DOCUMENTS.filter(
      (d) => d.source === 'issued' && d.issuer?.digilockerUri,
    ).map((d) => ({
      uri: d.issuer?.digilockerUri ?? d.id,
      type: d.type,
      name: `${documentTitle(d)} · ${d.fields[docTypeDef(d.type).nameKey] ?? ''}`.trim(),
      issuerCode: d.issuer?.code ?? docTypeDef(d.type).issuerCode,
      issuerName: d.issuer?.name ?? docTypeDef(d.type).issuer,
      issuedOn: d.addedAt.slice(0, 10),
    }));
  }

  async fetchDocument(uri: string): Promise<FetchedDocument> {
    await delay(600);
    const sample = SAMPLE_DOCUMENTS.find(
      (d) => d.issuer?.digilockerUri === uri,
    );
    if (!sample) throw new Error('Document not found in DigiLocker.');
    const def = docTypeDef(sample.type);
    return {
      fields: { ...sample.fields },
      issuer: {
        code: def.issuerCode,
        name: def.issuer,
        signedAt: nowIso(),
        digilockerUri: uri,
      },
    };
  }
}
