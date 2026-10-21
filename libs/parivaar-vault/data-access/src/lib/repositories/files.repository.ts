import { Injectable, inject } from '@angular/core';
import type { VaultFileMeta, VaultFileRecord } from '@pranav/shared-models';
import { newId, nowIso } from '@pranav/shared-util';
import { VAULT_DB } from '../db/vault-db';
import { decryptBytes, encryptBytes } from '../crypto/vault-crypto';
import { VaultLockService } from '../lock/vault-lock.service';

/** Stores file bytes encrypted with the vault data key. */
@Injectable({ providedIn: 'root' })
export class FilesRepository {
  private readonly db = inject(VAULT_DB);
  private readonly lock = inject(VaultLockService);

  async put(blob: Blob, name: string): Promise<VaultFileMeta> {
    const plain = await blob.arrayBuffer();
    const data = await encryptBytes(this.lock.requireKey(), plain);
    const record: VaultFileRecord = {
      id: newId(),
      name,
      mimeType: blob.type || 'application/octet-stream',
      size: plain.byteLength,
      createdAt: nowIso(),
      data,
    };
    await this.db.files.put(record);
    const { data: _data, ...meta } = record;
    void _data;
    return meta;
  }

  /** Inserts an already-encrypted record (used by backup restore). */
  putRecord(record: VaultFileRecord): Promise<string> {
    return this.db.files.put(record);
  }

  async getRecord(id: string): Promise<VaultFileRecord | undefined> {
    return this.db.files.get(id);
  }

  async getMeta(id: string): Promise<VaultFileMeta | undefined> {
    const record = await this.db.files.get(id);
    if (!record) return undefined;
    const { data: _data, ...meta } = record;
    void _data;
    return meta;
  }

  async getMetas(ids: string[]): Promise<VaultFileMeta[]> {
    const metas = await Promise.all(ids.map((id) => this.getMeta(id)));
    return metas.filter((m): m is VaultFileMeta => !!m);
  }

  /** Decrypts a file into a Blob ready for display or sharing. */
  async getBlob(id: string): Promise<Blob | undefined> {
    const record = await this.db.files.get(id);
    if (!record) return undefined;
    const plain = await decryptBytes(this.lock.requireKey(), record.data);
    return new Blob([plain], { type: record.mimeType });
  }

  async allRecords(): Promise<VaultFileRecord[]> {
    return this.db.files.toArray();
  }

  remove(ids: string[]): Promise<void> {
    return this.db.files.bulkDelete(ids);
  }

  clear(): Promise<void> {
    return this.db.files.clear();
  }
}
