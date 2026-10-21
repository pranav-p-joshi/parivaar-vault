import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import {
  DocumentsStore,
  MembersStore,
  PlatformService,
  SampleDataService,
  VaultLockService,
} from '@pranav/pv-data-access';
import {
  docTypeDef,
  documentExpiryRaw,
  documentTitle,
} from '@pranav/shared-models';
import { DocRow, EmptyState, SectionHeader } from '@pranav/shared-ui';
import { daysUntil, initials } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  documentsOutline,
  personAddOutline,
  shareSocialOutline,
  sparklesOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';

@Component({
  selector: 'pv-home-page',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonButton,
    DocRow,
    EmptyState,
    SectionHeader,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  private readonly platform = inject(PlatformService);
  private readonly lock = inject(VaultLockService);
  protected readonly members = inject(MembersStore);
  protected readonly documents = inject(DocumentsStore);
  protected readonly samples = inject(SampleDataService);
  protected readonly initials = initials;

  protected readonly selected = this.members.selected;
  protected readonly familyName = computed(
    () => this.lock.account()?.familyName ?? '',
  );
  protected readonly mine = computed(() =>
    this.documents.forMember(this.members.selectedId()),
  );
  protected readonly issued = computed(() =>
    this.mine().filter((d) => d.source === 'issued'),
  );
  protected readonly uploaded = computed(() =>
    this.mine().filter((d) => d.source === 'uploaded'),
  );
  /** Documents expiring within 180 days (or already expired). */
  protected readonly expiring = computed(
    () =>
      this.mine().filter((d) => {
        const raw = documentExpiryRaw(d);
        if (!raw) return false;
        const days = daysUntil(raw);
        return !Number.isNaN(days) && days < 180;
      }).length,
  );
  protected readonly firstName = computed(
    () => this.selected()?.name.split(' ')[0] ?? 'this member',
  );
  protected readonly isEmpty = computed(
    () => this.members.loaded() && this.members.count() === 0,
  );
  protected readonly noDocuments = computed(
    () => this.documents.loaded() && this.documents.count() === 0,
  );

  constructor() {
    addIcons({
      addOutline,
      personAddOutline,
      sparklesOutline,
      documentsOutline,
      shareSocialOutline,
      createOutline,
      swapHorizontalOutline,
    });
  }

  protected select(id: string): void {
    this.members.select(id);
  }

  protected plural(n: number): string {
    return `${n} ${n === 1 ? 'doc' : 'docs'}`;
  }

  protected loadSamples(): void {
    void this.samples.load();
  }

  protected editMember(): void {
    const id = this.members.selectedId();
    if (id) void this.router.navigate(['/family', id, 'edit']);
  }

  protected switchMember(): void {
    void this.router.navigateByUrl('/who');
  }

  /** Shares a text summary of every document of the selected member. */
  protected async shareAll(): Promise<void> {
    const member = this.selected();
    const docs = this.mine();
    if (!member || docs.length === 0) {
      const toast = await this.toast.create({
        message: 'No documents to share yet',
        duration: 1600,
      });
      await toast.present();
      return;
    }
    const lines = docs.map((doc) => {
      const def = docTypeDef(doc.type);
      const fields = def.fields
        .filter((k) => doc.fields[k])
        .map((k) => `  ${k}: ${doc.fields[k]}`);
      return `${documentTitle(doc)} (${doc.source === 'issued' ? 'issued' : 'uploaded'})\n${fields.join('\n')}`;
    });
    const text = `${member.name} · ${this.familyName() || 'Parivaar Vault'}\n\n${lines.join('\n\n')}`;
    await this.platform.shareBlob(
      new Blob([text], { type: 'text/plain' }),
      `${member.name.replace(/\s+/g, '-')}-documents.txt`,
      `${member.name}'s documents`,
    );
  }
}
