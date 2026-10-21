import { InjectionToken } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import type {
  FamilyMember,
  VaultDocument,
  VaultFileRecord,
} from '@pranav/shared-models';

/**
 * IndexedDB database (via Dexie). Works in the browser and inside the
 * Capacitor WebView on Android and iOS, so one implementation serves all targets.
 */
export class VaultDb extends Dexie {
  members!: Table<FamilyMember, string>;
  documents!: Table<VaultDocument, string>;
  files!: Table<VaultFileRecord, string>;

  constructor(name = 'parivaar-vault') {
    super(name);
    this.version(1).stores({
      members: 'id, name, relation, updatedAt',
      documents: 'id, memberId, typeId, expiryDate, updatedAt',
      files: 'id',
      documentTypes: 'id',
    });
    // v2: registry-driven documents (type/source/fields). Pre-release data is discarded.
    this.version(2)
      .stores({
        members: 'id, name, relation, updatedAt',
        documents: 'id, memberId, type, source, updatedAt',
        files: 'id',
        documentTypes: null,
      })
      .upgrade(async (tx) => {
        await tx.table('documents').clear();
        await tx.table('files').clear();
      });
  }
}

export const VAULT_DB = new InjectionToken<VaultDb>('VAULT_DB', {
  providedIn: 'root',
  factory: () => new VaultDb(),
});
