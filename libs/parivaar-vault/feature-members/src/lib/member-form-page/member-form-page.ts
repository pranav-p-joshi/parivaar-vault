import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { DocumentsStore, MembersStore } from '@pranav/pv-data-access';
import { RELATIONS, type Relation } from '@pranav/shared-models';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

@Component({
  selector: 'pv-member-form-page',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
  ],
  templateUrl: './member-form-page.html',
  styleUrl: './member-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly members = inject(MembersStore);
  private readonly documents = inject(DocumentsStore);
  private readonly toast = inject(ToastController);
  private readonly alerts = inject(AlertController);

  protected readonly relations = RELATIONS;
  protected readonly memberId = signal<string | null>(
    this.route.snapshot.paramMap.get('id'),
  );
  protected readonly isEdit = computed(() => !!this.memberId());
  protected readonly saving = signal(false);
  protected readonly documentCount = computed(() => {
    const id = this.memberId();
    return id ? this.documents.countFor(id) : 0;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    relation: ['Self' as Relation, Validators.required],
    dateOfBirth: [''],
    notes: ['', Validators.maxLength(500)],
  });

  constructor() {
    addIcons({ trashOutline });
    const id = this.memberId();
    const existing = id ? this.members.get(id) : undefined;
    if (existing) {
      this.form.patchValue({
        name: existing.name,
        relation: existing.relation,
        dateOfBirth: existing.dateOfBirth ?? '',
        notes: existing.notes ?? '',
      });
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      const member = await this.members.save({
        id: this.memberId() ?? undefined,
        name: value.name,
        relation: value.relation,
        dateOfBirth: value.dateOfBirth || undefined,
        notes: value.notes.trim() || undefined,
      });
      const toast = await this.toast.create({
        message: this.isEdit()
          ? 'Member updated'
          : `${member.name.split(' ')[0]} added`,
        duration: 1600,
      });
      await toast.present();
      this.members.select(member.id);
      await this.router.navigate(['/family'], { replaceUrl: true });
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const id = this.memberId();
    const member = id ? this.members.get(id) : undefined;
    if (!member) return;
    const alert = await this.alerts.create({
      header: `Remove ${member.name}?`,
      message: `This permanently deletes ${this.documentCount()} document(s) and their files.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            void this.members
              .remove(member.id)
              .then(() =>
                this.router.navigate(['/family'], { replaceUrl: true }),
              );
          },
        },
      ],
    });
    await alert.present();
  }
}
