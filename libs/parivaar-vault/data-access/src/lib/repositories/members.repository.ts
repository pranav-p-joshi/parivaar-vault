import { Injectable, inject } from '@angular/core';
import type { FamilyMember } from '@pranav/shared-models';
import { VAULT_DB } from '../db/vault-db';

@Injectable({ providedIn: 'root' })
export class MembersRepository {
  private readonly db = inject(VAULT_DB);

  all(): Promise<FamilyMember[]> {
    return this.db.members.orderBy('name').toArray();
  }

  get(id: string): Promise<FamilyMember | undefined> {
    return this.db.members.get(id);
  }

  put(member: FamilyMember): Promise<string> {
    return this.db.members.put(member);
  }

  bulkPut(members: FamilyMember[]): Promise<string> {
    return this.db.members.bulkPut(members);
  }

  remove(id: string): Promise<void> {
    return this.db.members.delete(id);
  }

  clear(): Promise<void> {
    return this.db.members.clear();
  }
}
