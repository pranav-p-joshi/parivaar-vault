import { Injectable, computed, inject, signal } from '@angular/core';
import {
  documentExpiryRaw,
  type DocIssuer,
  type DocSource,
  type DocType,
  type ExpiryReminder,
  type VaultDocument,
} from '@pranav/shared-models';
import {
  daysUntil,
  expiryStatus,
  newId,
  nowIso,
  toIsoFromAny,
} from '@pranav/shared-util';
import { DocumentsRepository } from '../repositories/documents.repository';
import { FilesRepository } from '../repositories/files.repository';

export interface DocumentInput {
  id?: string;
  memberId: string;
  type: DocType;
  source: DocSource;
  issuer?: DocIssuer;
  fields: Record<string, string>;
  confidence?: Record<string, number>;
}

/** New file blobs per slot. A slot set to `null` removes the stored file. */
export interface DocumentFileInput {
  front?: Blob | null;
  back?: Blob | null;
  pdf?: Blob | null;
}

@Injectable({ providedIn: 'root' })
export class DocumentsStore {
  private readonly repo = inject(DocumentsRepository);
  private readonly files = inject(FilesRepository);
  private readonly _documents = signal<VaultDocument[]>([]);
  private readonly _loaded = signal(false);

  readonly documents = this._documents.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._documents().length);
  readonly byId = computed(
    () => new Map(this._documents().map((d) => [d.id, d])),
  );

  readonly recent = computed(() =>
    [...this._documents()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
  );

  /** Documents that are expired or expiring within the warning window, soonest first. */
  readonly reminders = computed<ExpiryReminder[]>(() =>
    this._documents()
      .map((document) => {
        const expiryDate = toIsoFromAny(documentExpiryRaw(document));
        if (!expiryDate) return null;
        return {
          document,
          expiryDate,
          daysLeft: daysUntil(expiryDate),
          status: expiryStatus(expiryDate),
        };
      })
      .filter(
        (r): r is ExpiryReminder =>
          !!r && r.status !== 'ok' && r.status !== 'none',
      )
      .sort((a, b) => a.daysLeft - b.daysLeft),
  );

  async load(): Promise<void> {
    this._documents.set(await this.repo.all());
    this._loaded.set(true);
  }

  get(id: string): VaultDocument | undefined {
    return this.byId().get(id);
  }

  forMember(memberId: string | null): VaultDocument[] {
    return memberId
      ? this._documents().filter((d) => d.memberId === memberId)
      : [];
  }

  issuedFor(memberId: string | null): VaultDocument[] {
    return this.forMember(memberId).filter((d) => d.source === 'issued');
  }

  uploadedFor(memberId: string | null): VaultDocument[] {
    return this.forMember(memberId).filter((d) => d.source === 'uploaded');
  }

  countFor(memberId: string): number {
    return this.forMember(memberId).length;
  }

  /** Full-text search over all field values (number fields included). */
  search(query: string, memberId: string | null = null): VaultDocument[] {
    const q = query.trim().toLowerCase();
    const pool = memberId ? this.forMember(memberId) : this._documents();
    if (!q) return pool;
    return pool.filter((doc) =>
      Object.values(doc.fields).some((v) => v.toLowerCase().includes(q)),
    );
  }

  /** Creates or updates a document, encrypting any new files. */
  async save(
    input: DocumentInput,
    files: DocumentFileInput = {},
  ): Promise<VaultDocument> {
    const existing = input.id ? this.get(input.id) : undefined;
    const now = nowIso();
    const nextFiles = { ...(existing?.files ?? {}) };
    const removed: string[] = [];

    for (const slot of ['front', 'back', 'pdf'] as const) {
      const value = files[slot];
      if (value === undefined) continue;
      const key = `${slot}FileId` as const;
      const previous = nextFiles[key];
      if (previous) removed.push(previous);
      if (value === null) {
        delete nextFiles[key];
      } else {
        const ext = slot === 'pdf' ? 'pdf' : 'jpg';
        const meta = await this.files.put(
          value,
          `${input.type}-${slot}.${ext}`,
        );
        nextFiles[key] = meta.id;
      }
    }
    if (removed.length) await this.files.remove(removed);

    const doc: VaultDocument = {
      ...existing,
      id: existing?.id ?? input.id ?? newId(),
      memberId: input.memberId,
      type: input.type,
      source: input.source,
      issuer: input.issuer ?? existing?.issuer,
      fields: cleanFields(input.fields),
      confidence: input.confidence ?? existing?.confidence,
      files: nextFiles,
      addedAt: existing?.addedAt ?? now,
      updatedAt: now,
    };
    await this.repo.put(doc);
    this._documents.update((list) => [
      doc,
      ...list.filter((d) => d.id !== doc.id),
    ]);
    return doc;
  }

  async updateFields(
    id: string,
    fields: Record<string, string>,
  ): Promise<VaultDocument | undefined> {
    const existing = this.get(id);
    if (!existing) return undefined;
    const doc: VaultDocument = {
      ...existing,
      fields: cleanFields(fields),
      updatedAt: nowIso(),
    };
    await this.repo.put(doc);
    this._documents.update((list) => [doc, ...list.filter((d) => d.id !== id)]);
    return doc;
  }

  /** Marks an issued document as freshly fetched from the issuer. */
  async markRefreshed(
    id: string,
    issuer: DocIssuer,
    fields?: Record<string, string>,
  ): Promise<void> {
    const existing = this.get(id);
    if (!existing) return;
    const doc: VaultDocument = {
      ...existing,
      issuer,
      fields: fields ? cleanFields(fields) : existing.fields,
      updatedAt: nowIso(),
    };
    await this.repo.put(doc);
    this._documents.update((list) => list.map((d) => (d.id === id ? doc : d)));
  }

  async bulkInsert(docs: VaultDocument[]): Promise<void> {
    await this.repo.bulkPut(docs);
    this._documents.update((list) => {
      const ids = new Set(docs.map((d) => d.id));
      return [...docs, ...list.filter((d) => !ids.has(d.id))];
    });
  }

  async remove(id: string): Promise<void> {
    const doc = this.get(id);
    const fileIds = doc ? fileIdsOf(doc) : [];
    if (fileIds.length) await this.files.remove(fileIds);
    await this.repo.remove(id);
    this._documents.update((list) => list.filter((d) => d.id !== id));
  }

  async removeForMember(memberId: string): Promise<void> {
    const docs = this.forMember(memberId);
    const fileIds = docs.flatMap(fileIdsOf);
    if (fileIds.length) await this.files.remove(fileIds);
    await this.repo.removeMany(docs.map((d) => d.id));
    this._documents.update((list) =>
      list.filter((d) => d.memberId !== memberId),
    );
  }

  clear(): void {
    this._documents.set([]);
    this._loaded.set(false);
  }
}

export function fileIdsOf(doc: VaultDocument): string[] {
  return [
    doc.files.frontFileId,
    doc.files.backFileId,
    doc.files.pdfFileId,
  ].filter((id): id is string => !!id);
}

function cleanFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = (value ?? '').trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}
