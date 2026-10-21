import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { DocumentsStore, MembersStore } from '@pranav/pv-data-access';
import { RELATIONS, type Relation } from '@pranav/shared-models';
import { SectionHeader } from '@pranav/shared-ui';
import { initials } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';

@Component({
  selector: 'pv-members-page',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    SectionHeader,
  ],
  templateUrl: './members-page.html',
  styleUrl: './members-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  protected readonly members = inject(MembersStore);
  private readonly documents = inject(DocumentsStore);
  protected readonly relations = RELATIONS;
  protected readonly initials = initials;

  protected readonly name = signal('');
  protected readonly relation = signal<Relation>('Self');
  protected readonly saving = signal(false);

  protected readonly cards = computed(() =>
    this.members
      .members()
      .map((member) => ({ member, count: this.documents.countFor(member.id) })),
  );

  constructor() {
    addIcons({ createOutline });
  }

  protected open(id: string): void {
    this.members.select(id);
    void this.router.navigate(['/home']);
  }

  protected async add(): Promise<void> {
    const name = this.name().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    try {
      const member = await this.members.save({
        name,
        relation: this.relation(),
      });
      this.name.set('');
      const toast = await this.toast.create({
        message: `${member.name.split(' ')[0]} added`,
        duration: 1600,
      });
      await toast.present();
    } finally {
      this.saving.set(false);
    }
  }
}
