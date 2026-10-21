import { Injectable, inject } from '@angular/core';
import type { VaultDocument } from '@pranav/shared-models';
import { VAULT_DB } from '../db/vault-db';

@Injectable({ providedIn: 'root' })
export class DocumentsRepository {
  private readonly db = inject(VAULT_DB);

  all(): Promise<VaultDocument[]> {
    return this.db.documents.orderBy('updatedAt').reverse().toArray();
  }

  get(id: string): Promise<VaultDocument | undefined> {
    return this.db.documents.get(id);
  }

  put(doc: VaultDocument): Promise<string> {
    return this.db.documents.put(doc);
  }

  bulkPut(docs: VaultDocument[]): Promise<string> {
    return this.db.documents.bulkPut(docs);
  }

  remove(id: string): Promise<void> {
    return this.db.documents.delete(id);
  }

  removeMany(ids: string[]): Promise<void> {
    return this.db.documents.bulkDelete(ids);
  }

  clear(): Promise<void> {
    return this.db.documents.clear();
  }
}
