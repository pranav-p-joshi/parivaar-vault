import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import {
  DigiLockerService,
  DocumentsStore,
  FilesRepository,
  MembersStore,
  PlatformService,
} from '@pranav/pv-data-access';
import {
  MONO_FIELD,
  docTypeDef,
  documentNumber,
  documentTitle,
  type VaultDocument,
} from '@pranav/shared-models';
import {
  DocCard3d,
  EmptyState,
  FieldRow,
  SectionHeader,
} from '@pranav/shared-ui';
import { formatDate } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import {
  copyOutline,
  createOutline,
  downloadOutline,
  shareOutline,
  trashOutline,
} from 'ionicons/icons';
import { FileThumb } from '../file-thumb/file-thumb';
import { FETCH_STEPS, fetchedThisSession } from './fetch-sequence';

type StepState = 'todo' | 'on' | 'done';

@Component({
  selector: 'pv-document-detail-page',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    DocCard3d,
    EmptyState,
    FieldRow,
    SectionHeader,
    FileThumb,
  ],
  templateUrl: './document-detail-page.html',
  styleUrl: './document-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  private readonly files = inject(FilesRepository);
  private readonly platform = inject(PlatformService);
  private readonly digilocker = inject(DigiLockerService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly documents = inject(DocumentsStore);
  protected readonly members = inject(MembersStore);
  protected readonly formatDate = formatDate;

  protected readonly id = signal(this.route.snapshot.paramMap.get('id') ?? '');
  protected readonly doc = computed(() => this.documents.get(this.id()));
  protected readonly member = computed(() => {
    const doc = this.doc();
    return doc ? this.members.get(doc.memberId) : undefined;
  });
  protected readonly def = computed(() => {
    const doc = this.doc();
    return doc ? docTypeDef(doc.type) : undefined;
  });
  protected readonly title = computed(() => {
    const doc = this.doc();
    return doc ? documentTitle(doc) : 'Document';
  });

  /** Fetch sequence shown the first time an issued document is opened in a session. */
  protected readonly fetching = signal(false);
  protected readonly steps = signal<{ label: string; state: StepState }[]>([]);
  protected readonly fetchedAt = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);

  protected readonly fields = computed(() => {
    const doc = this.doc();
    const def = this.def();
    if (!doc || !def) return [];
    return def.fields
      .filter((key) => !!doc.fields[key])
      .map((key) => ({
        key,
        value: doc.fields[key] ?? '',
        mono: MONO_FIELD.test(key),
        isNumber: key === def.numberKey,
        low: (doc.confidence?.[key] ?? 1) < 0.6,
      }));
  });

  protected readonly frontFileId = computed(
    () => this.doc()?.files.frontFileId,
  );
  protected readonly backFileId = computed(() => this.doc()?.files.backFileId);
  protected readonly pdfFileId = computed(() => this.doc()?.files.pdfFileId);

  constructor() {
    addIcons({
      copyOutline,
      shareOutline,
      downloadOutline,
      createOutline,
      trashOutline,
    });
    let started = false;
    effect(() => {
      const doc = this.doc();
      if (!doc || started) return;
      started = true;
      if (doc.source === 'issued') void this.runFetch(doc);
    });
  }

  private async runFetch(doc: VaultDocument): Promise<void> {
    const labels = FETCH_STEPS(
      doc.issuer?.code || this.def()?.issuerCode || 'issuer',
    );
    const firstVisit = !fetchedThisSession.has(doc.id);
    const refresh = this.digilocker.refresh(doc).catch(() => null);

    if (firstVisit) {
      this.fetching.set(true);
      this.steps.set(
        labels.map((label, i) => ({ label, state: i === 0 ? 'on' : 'todo' })),
      );
      for (let i = 0; i < labels.length; i++) {
        await this.wait(i === 0 ? 650 : 600);
        if (this.destroyed) return;
        this.steps.update((list) =>
          list.map((s, idx) => ({
            ...s,
            state: idx < i + 1 ? 'done' : idx === i + 1 ? 'on' : 'todo',
          })),
        );
      }
      await refresh;
      await this.wait(300);
      if (this.destroyed) return;
      this.fetching.set(false);
      fetchedThisSession.add(doc.id);
    } else {
      await refresh;
    }
    this.fetchedAt.set(new Date().toISOString());
  }

  private destroyed = false;
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      this.destroyRef.onDestroy(() => {
        this.destroyed = true;
        clearTimeout(t);
        resolve();
      });
    });
  }

  protected async copyNumber(): Promise<void> {
    const doc = this.doc();
    if (!doc) return;
    const value = documentNumber(doc);
    try {
      await navigator.clipboard.writeText(value);
      await this.notify('Number copied');
    } catch {
      await this.notify(value);
    }
  }

  protected async share(): Promise<void> {
    const doc = this.doc();
    if (!doc) return;
    const fileId = doc.files.pdfFileId ?? doc.files.frontFileId;
    const title = `${this.title()} · ${this.member()?.name ?? ''}`;
    if (fileId) {
      const meta = await this.files.getMeta(fileId);
      const blob = await this.files.getBlob(fileId);
      if (blob && meta) {
        await this.platform.shareBlob(blob, meta.name, title);
        return;
      }
    }
    const summary = this.fields()
      .map((f) => `${f.key}: ${f.value}`)
      .join('\n');
    await this.platform.shareBlob(
      new Blob([`${title}\n\n${summary}`], { type: 'text/plain' }),
      `${this.title()}.txt`,
      title,
    );
  }

  protected async downloadPdf(): Promise<void> {
    const id = this.pdfFileId();
    if (!id) return;
    const meta = await this.files.getMeta(id);
    const blob = await this.files.getBlob(id);
    if (blob && meta)
      await this.platform.shareBlob(blob, meta.name, this.title());
  }

  protected async remove(): Promise<void> {
    const doc = this.doc();
    if (!doc) return;
    await this.documents.remove(doc.id);
    await this.notify('Removed');
    await this.router.navigate(['/home'], { replaceUrl: true });
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
