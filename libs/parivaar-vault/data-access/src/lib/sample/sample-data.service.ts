import { Injectable, computed, inject } from '@angular/core';
import { DocumentsStore } from '../stores/documents.store';
import { MembersStore } from '../stores/members.store';
import { SAMPLE_DOCUMENTS, SAMPLE_MEMBERS, isSampleId } from './sample-data';

/** Loads or removes the example family so the app can be explored before adding real documents. */
@Injectable({ providedIn: 'root' })
export class SampleDataService {
  private readonly members = inject(MembersStore);
  private readonly documents = inject(DocumentsStore);

  readonly hasSamples = computed(() =>
    this.members.members().some((m) => isSampleId(m.id)),
  );

  async load(): Promise<void> {
    await this.members.bulkInsert(SAMPLE_MEMBERS);
    await this.documents.bulkInsert(SAMPLE_DOCUMENTS);
    this.members.select(SAMPLE_MEMBERS[0]?.id ?? null);
  }

  async remove(): Promise<void> {
    for (const member of this.members
      .members()
      .filter((m) => isSampleId(m.id))) {
      await this.members.remove(member.id);
    }
  }
}
