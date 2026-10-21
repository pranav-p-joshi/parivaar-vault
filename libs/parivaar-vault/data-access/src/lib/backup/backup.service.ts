import { Injectable, inject } from '@angular/core';
import type { VaultBackup, VaultFileRecord } from '@pranav/shared-models';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  nowIso,
} from '@pranav/shared-util';
import {
  decryptBytes,
  deriveKeyFromPin,
  encryptBytes,
  saltFromBase64,
  unwrapDataKey,
} from '../crypto/vault-crypto';
import { VaultLockService } from '../lock/vault-lock.service';
import { DocumentsRepository } from '../repositories/documents.repository';
import { FilesRepository } from '../repositories/files.repository';
import { MembersRepository } from '../repositories/members.repository';
import { DocumentsStore } from '../stores/documents.store';
import { MembersStore } from '../stores/members.store';

export interface ImportSummary {
  members: number;
  documents: number;
  files: number;
}

/**
 * Exports the vault as a single JSON file. File contents stay encrypted in the
 * backup, so restoring requires the password that was active when it was exported.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly lock = inject(VaultLockService);
  private readonly members = inject(MembersRepository);
  private readonly documents = inject(DocumentsRepository);
  private readonly files = inject(FilesRepository);
  private readonly membersStore = inject(MembersStore);
  private readonly documentsStore = inject(DocumentsStore);

  async createBackup(): Promise<{ blob: Blob; filename: string }> {
    const material = this.lock.keyMaterial();
    const records = await this.files.allRecords();
    const backup: VaultBackup = {
      version: 2,
      app: 'parivaar-vault',
      exportedAt: nowIso(),
      salt: material.salt,
      wrappedKey: material.wrappedKey,
      members: await this.members.all(),
      documents: await this.documents.all(),
      files: records.map(({ data, ...meta }) => ({
        ...meta,
        data: arrayBufferToBase64(data),
      })),
    };
    const stamp = backup.exportedAt.slice(0, 10);
    return {
      blob: new Blob([JSON.stringify(backup)], { type: 'application/json' }),
      filename: `parivaar-vault-backup-${stamp}.pvault.json`,
    };
  }

  parseBackup(text: string): VaultBackup {
    const parsed = JSON.parse(text) as Partial<VaultBackup>;
    if (
      parsed.app !== 'parivaar-vault' ||
      parsed.version !== 2 ||
      !parsed.salt ||
      !parsed.wrappedKey
    ) {
      throw new Error('This file is not a Parivaar Vault backup.');
    }
    return parsed as VaultBackup;
  }

  /**
   * Merges a backup into the current vault. `backupPin` is the PIN of the vault
   * that produced the backup; files are re-encrypted with the current key.
   */
  async restore(
    backup: VaultBackup,
    backupPin: string,
  ): Promise<ImportSummary> {
    const currentKey = this.lock.requireKey();
    let backupKey: CryptoKey;
    try {
      const pinKey = await deriveKeyFromPin(
        backupPin,
        saltFromBase64(backup.salt),
      );
      backupKey = await unwrapDataKey(backup.wrappedKey, pinKey);
    } catch {
      throw new Error('Wrong password for this backup.');
    }

    let fileCount = 0;
    for (const file of backup.files ?? []) {
      const plain = await decryptBytes(
        backupKey,
        base64ToArrayBuffer(file.data),
      );
      const record: VaultFileRecord = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
        data: await encryptBytes(currentKey, plain),
      };
      await this.files.putRecord(record);
      fileCount++;
    }
    if (backup.members?.length) await this.members.bulkPut(backup.members);
    if (backup.documents?.length)
      await this.documents.bulkPut(backup.documents);

    await Promise.all([this.membersStore.load(), this.documentsStore.load()]);
    return {
      members: backup.members?.length ?? 0,
      documents: backup.documents?.length ?? 0,
      files: fileCount,
    };
  }

  /** Deletes everything: database rows and key material. */
  async eraseVault(): Promise<void> {
    await Promise.all([
      this.files.clear(),
      this.documents.clear(),
      this.members.clear(),
    ]);
    this.membersStore.clear();
    this.documentsStore.clear();
    await this.lock.reset();
  }
}
