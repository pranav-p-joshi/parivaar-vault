import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
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
import {
  DocumentsStore,
  MembersStore,
  PlatformService,
  type PickSource,
} from '@pranav/pv-data-access';
import { OcrService, extractFields } from '@pranav/pv-ocr';
import { DOC_TYPE_LIST, docTypeDef, type DocType } from '@pranav/shared-models';
import { DocCard } from '@pranav/shared-ui';
import { isPdfMime, isValidAadhaar, isValidPan } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  cloudUploadOutline,
  imagesOutline,
  scanOutline,
} from 'ionicons/icons';

interface Capture {
  blob: Blob;
  previewUrl: string | null;
  isPdf: boolean;
}

type Phase = 'idle' | 'scanning' | 'ready';

@Component({
  selector: 'pv-add-document-page',
  imports: [
    FormsModule,
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
    DocCard,
  ],
  templateUrl: './add-document-page.html',
  styleUrl: './add-document-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDocumentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  private readonly ocr = inject(OcrService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly platform = inject(PlatformService);
  protected readonly members = inject(MembersStore);
  protected readonly documents = inject(DocumentsStore);
  protected readonly types = DOC_TYPE_LIST;

  /** Query param: preselect the member. */
  readonly memberId = input<string | undefined>(undefined);

  protected readonly editId = signal<string | null>(
    this.route.snapshot.paramMap.get('id'),
  );
  protected readonly isEdit = computed(() => !!this.editId());
  protected readonly selectedMember = signal('');
  protected readonly type = signal<DocType>('aadhaar');
  protected readonly def = computed(() => docTypeDef(this.type()));
  protected readonly values = signal<Record<string, string>>({});
  protected readonly confidence = signal<Record<string, number>>({});
  protected readonly front = signal<Capture | null>(null);
  protected readonly back = signal<Capture | null>(null);
  protected readonly phase = signal<Phase>('idle');
  protected readonly saving = signal(false);
  protected readonly scanNote = signal('');

  protected readonly previewDoc = computed(() => ({
    type: this.type(),
    fields: this.values(),
  }));
  protected readonly numberValue = computed(
    () => this.values()[this.def().numberKey] ?? '',
  );
  protected readonly numberError = computed(() => {
    const value = this.numberValue().trim();
    if (!value) return '';
    const def = this.def();
    if (def.id === 'aadhaar' && !isValidAadhaar(value))
      return 'Not a valid Aadhaar number (check the digits).';
    if (def.id === 'pan' && !isValidPan(value))
      return 'PAN should look like ABCDE1234F.';
    if (
      def.numberPattern &&
      !def.numberPattern.test(value.replace(/[\s-]+/g, ''))
    )
      return `Doesn't look like a ${def.name} number.`;
    return '';
  });
  protected readonly canSave = computed(
    () =>
      !!this.selectedMember() &&
      !!this.numberValue().trim() &&
      !this.numberError() &&
      this.phase() !== 'scanning' &&
      !this.saving(),
  );

  constructor() {
    addIcons({ cameraOutline, imagesOutline, cloudUploadOutline, scanOutline });

    const existing = this.editId()
      ? this.documents.get(this.editId() as string)
      : undefined;
    if (existing) {
      this.selectedMember.set(existing.memberId);
      this.type.set(existing.type);
      this.values.set({ ...existing.fields });
      this.confidence.set({ ...existing.confidence });
      this.phase.set('ready');
    }

    effect(() => {
      const preset = this.memberId() ?? this.members.selectedId();
      if (preset && !this.selectedMember()) this.selectedMember.set(preset);
    });

    this.destroyRef.onDestroy(() => {
      for (const c of [this.front(), this.back()])
        if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
    });
  }

  protected setType(type: DocType): void {
    this.type.set(type);
    this.values.update((v) => {
      const keep: Record<string, string> = {};
      for (const key of docTypeDef(type).fields)
        if (v[key]) keep[key] = v[key] as string;
      return keep;
    });
  }

  protected setValue(
    key: string,
    value: string | number | null | undefined,
  ): void {
    this.values.update((v) => ({ ...v, [key]: String(value ?? '') }));
    this.confidence.update((c) => ({ ...c, [key]: 1 }));
  }

  protected isWide(key: string): boolean {
    return this.def().wideFields.includes(key);
  }

  protected isLow(key: string): boolean {
    return (this.confidence()[key] ?? 1) < 0.6 && !!this.values()[key];
  }

  protected async capture(
    source: PickSource,
    side: 'front' | 'back' = 'front',
  ): Promise<void> {
    const picked = await this.platform.pickOne(source);
    if (!picked) return;
    const capture: Capture = {
      blob: picked.blob,
      previewUrl: isPdfMime(picked.blob.type)
        ? null
        : URL.createObjectURL(picked.blob),
      isPdf: isPdfMime(picked.blob.type),
    };
    const previous = side === 'front' ? this.front() : this.back();
    if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
    if (side === 'front') this.front.set(capture);
    else this.back.set(capture);
    if (!capture.isPdf) await this.scan(capture.blob, side);
    else {
      this.phase.set('ready');
      this.scanNote.set('PDF attached. Enter the details below.');
    }
  }

  private async scan(blob: Blob, side: 'front' | 'back'): Promise<void> {
    this.phase.set('scanning');
    this.scanNote.set(
      'Reading the card… fields will appear below. Correct anything that was misread.',
    );
    const member = this.members.get(this.selectedMember());
    const result = await this.ocr.recognize(blob);
    const extracted = extractFields(this.type(), result, {
      memberName: member?.name,
      dateOfBirth: member?.dateOfBirth,
    });
    this.values.update((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(extracted.fields)) {
        const better =
          (extracted.confidence[key] ?? 0) >= (this.confidence()[key] ?? 0);
        if (!next[key] || (side === 'front' && better)) next[key] = value;
      }
      return next;
    });
    this.confidence.update((current) => ({
      ...current,
      ...extracted.confidence,
    }));
    this.phase.set('ready');
    const count = Object.keys(extracted.fields).length;
    this.scanNote.set(
      count
        ? `Scan attached. ${count} field${count === 1 ? '' : 's'} read, check them below, then save.`
        : 'Scan attached. We could not read the text, please type the details below.',
    );
    await this.notify(
      count ? 'Fields ready to review' : 'Could not read the scan',
    );
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    try {
      const def = this.def();
      const doc = await this.documents.save(
        {
          id: this.editId() ?? undefined,
          memberId: this.selectedMember(),
          type: def.id,
          source: 'uploaded',
          fields: this.values(),
          confidence: this.confidence(),
        },
        {
          ...(this.front()
            ? this.front()?.isPdf
              ? { pdf: this.front()?.blob }
              : { front: this.front()?.blob }
            : {}),
          ...(this.back() ? { back: this.back()?.blob } : {}),
        },
      );
      this.members.select(doc.memberId);
      await this.notify(this.isEdit() ? 'Fields updated' : 'Saved to vault');
      await this.router.navigate(['/doc', doc.id], { replaceUrl: true });
    } finally {
      this.saving.set(false);
    }
  }

  private async notify(message: string): Promise<void> {
    const toast = await this.toast.create({
      message,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }
}
