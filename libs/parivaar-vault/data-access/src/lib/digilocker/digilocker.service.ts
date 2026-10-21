import { Injectable, computed, inject } from '@angular/core';
import type { DocIssuer, VaultDocument } from '@pranav/shared-models';
import { DIGILOCKER_API } from './digilocker-api';
import { MockDigiLockerApi } from './mock-digilocker-api';
import { SettingsService } from '../settings/settings.service';
import { DocumentsStore } from '../stores/documents.store';

/** Orchestrates linking DigiLocker and importing/refreshing issued documents. */
@Injectable({ providedIn: 'root' })
export class DigiLockerService {
  private readonly api =
    inject(DIGILOCKER_API, { optional: true }) ?? inject(MockDigiLockerApi);
  private readonly settings = inject(SettingsService);
  private readonly documents = inject(DocumentsStore);

  readonly isConnected = computed(
    () => this.settings.settings().digilockerConnected,
  );
  readonly isMock = this.api instanceof MockDigiLockerApi;

  async connect(): Promise<void> {
    await this.api.connect();
    await this.settings.update({ digilockerConnected: true });
  }

  async disconnect(): Promise<void> {
    await this.api.disconnect();
    await this.settings.update({ digilockerConnected: false });
  }

  listIssued() {
    return this.api.listIssued();
  }

  /** Imports issued documents for a member. Already-imported URIs are skipped. */
  async importIssued(
    uris: string[],
    memberId: string,
  ): Promise<VaultDocument[]> {
    const known = new Set(
      this.documents
        .documents()
        .map((d) => d.issuer?.digilockerUri)
        .filter(Boolean),
    );
    const summaries = await this.api.listIssued();
    const imported: VaultDocument[] = [];
    for (const uri of uris) {
      if (known.has(uri)) continue;
      const summary = summaries.find((s) => s.uri === uri);
      if (!summary) continue;
      const fetched = await this.api.fetchDocument(uri);
      const doc = await this.documents.save(
        {
          memberId,
          type: summary.type,
          source: 'issued',
          issuer: fetched.issuer,
          fields: fetched.fields,
        },
        fetched.pdf ? { pdf: fetched.pdf } : {},
      );
      imported.push(doc);
    }
    return imported;
  }

  /** Re-fetches an issued document from the issuer and returns the new issuer stamp. */
  async refresh(doc: VaultDocument): Promise<DocIssuer | null> {
    const uri = doc.issuer?.digilockerUri;
    if (!uri || doc.source !== 'issued') return null;
    const fetched = await this.api.fetchDocument(uri);
    await this.documents.markRefreshed(doc.id, fetched.issuer, fetched.fields);
    return fetched.issuer;
  }
}
