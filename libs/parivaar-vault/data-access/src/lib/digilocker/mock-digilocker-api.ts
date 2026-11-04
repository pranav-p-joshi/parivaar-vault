import { Injectable } from '@angular/core';
import type {
  DigiLockerApi,
  FetchedDocument,
  IssuedDocumentSummary,
} from './digilocker-api';

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Stand-in used until DigiLocker partner credentials are available. It connects
 * but has no issued documents to offer, so nothing fake enters the vault.
 * TODO(real integration): replace with the OAuth + /issued-documents flow.
 */
@Injectable({ providedIn: 'root' })
export class MockDigiLockerApi implements DigiLockerApi {
  private connected = false;

  async connect(): Promise<void> {
    await delay(600);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listIssued(): Promise<IssuedDocumentSummary[]> {
    await delay(400);
    return [];
  }

  async fetchDocument(): Promise<FetchedDocument> {
    throw new Error('DigiLocker is not connected to a real account yet.');
  }
}
