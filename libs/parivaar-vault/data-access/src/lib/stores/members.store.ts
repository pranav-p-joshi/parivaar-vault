import { Injectable, computed, inject, signal } from '@angular/core';
import { MEMBER_COLORS, type FamilyMember } from '@pranav/shared-models';
import { newId, nowIso } from '@pranav/shared-util';
import { MembersRepository } from '../repositories/members.repository';
import { DocumentsStore } from './documents.store';

export type MemberInput = Omit<
  FamilyMember,
  'id' | 'colorIndex' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  colorIndex?: number;
};

@Injectable({ providedIn: 'root' })
export class MembersStore {
  private readonly repo = inject(MembersRepository);
  private readonly documents = inject(DocumentsStore);
  private readonly _members = signal<FamilyMember[]>([]);
  private readonly _loaded = signal(false);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _picked = signal(false);

  readonly members = this._members.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._members().length);
  readonly byId = computed(
    () => new Map(this._members().map((m) => [m.id, m])),
  );

  /** Member currently highlighted on the home screen. */
  readonly selectedId = computed(() => {
    const id = this._selectedId();
    if (id && this.byId().has(id)) return id;
    return this._members()[0]?.id ?? null;
  });
  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? this.byId().get(id) : undefined;
  });

  async load(): Promise<void> {
    this._members.set(await this.repo.all());
    this._loaded.set(true);
  }

  get(id: string): FamilyMember | undefined {
    return this.byId().get(id);
  }

  select(id: string | null): void {
    this._selectedId.set(id);
    this._picked.set(id !== null);
  }

  colorOf(member: Pick<FamilyMember, 'colorIndex'>): string {
    return (
      MEMBER_COLORS[member.colorIndex % MEMBER_COLORS.length] ??
      MEMBER_COLORS[0]
    );
  }

  async save(input: MemberInput): Promise<FamilyMember> {
    const existing = input.id ? this.get(input.id) : undefined;
    const now = nowIso();
    const member: FamilyMember = {
      ...existing,
      ...input,
      id: existing?.id ?? input.id ?? newId(),
      name: input.name.trim(),
      colorIndex:
        existing?.colorIndex ?? input.colorIndex ?? this.nextColorIndex(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repo.put(member);
    this._members.update((list) =>
      [...list.filter((m) => m.id !== member.id), member].sort(byCreated),
    );
    return member;
  }

  async bulkInsert(members: FamilyMember[]): Promise<void> {
    await this.repo.bulkPut(members);
    this._members.update((list) => {
      const ids = new Set(members.map((m) => m.id));
      return [...list.filter((m) => !ids.has(m.id)), ...members].sort(
        byCreated,
      );
    });
  }

  /** Deletes the member together with all of their documents and files. */
  async remove(id: string): Promise<void> {
    await this.documents.removeForMember(id);
    await this.repo.remove(id);
    this._members.update((list) => list.filter((m) => m.id !== id));
  }

  clear(): void {
    this._members.set([]);
    this._loaded.set(false);
    this._selectedId.set(null);
    this._picked.set(false);
  }

  private nextColorIndex(): number {
    return this._members().length % MEMBER_COLORS.length;
  }
}

function byCreated(a: FamilyMember, b: FamilyMember): number {
  return a.createdAt.localeCompare(b.createdAt);
}
