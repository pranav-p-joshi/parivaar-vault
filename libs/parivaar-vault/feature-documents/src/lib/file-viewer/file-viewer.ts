import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { FilesRepository, PlatformService } from '@pranav/pv-data-access';
import type { VaultFileMeta } from '@pranav/shared-models';
import { isImageMime, isPdfMime } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import { closeOutline, openOutline, shareOutline } from 'ionicons/icons';

/** Full-screen modal that shows an image (tap to zoom) or a PDF. */
@Component({
  selector: 'pv-file-viewer',
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSpinner,
  ],
  templateUrl: './file-viewer.html',
  styleUrl: './file-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileViewer {
  private readonly files = inject(FilesRepository);
  private readonly platform = inject(PlatformService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly file = input<VaultFileMeta | null>(null);
  readonly closed = output<void>();

  protected readonly blob = signal<Blob | null>(null);
  protected readonly url = signal<string | null>(null);
  protected readonly zoomed = signal(false);
  protected readonly isOpen = computed(() => this.file() !== null);
  protected readonly isImage = computed(() =>
    isImageMime(this.file()?.mimeType),
  );
  protected readonly isPdf = computed(() => isPdfMime(this.file()?.mimeType));
  protected readonly canEmbedPdf = computed(
    () => this.isPdf() && !this.platform.isNative,
  );
  protected readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.url();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    addIcons({ closeOutline, shareOutline, openOutline });
    effect((onCleanup) => {
      const file = this.file();
      this.zoomed.set(false);
      if (!file) {
        this.revoke();
        return;
      }
      let cancelled = false;
      void this.files.getBlob(file.id).then((blob) => {
        if (cancelled || !blob) return;
        this.blob.set(blob);
        this.url.set(URL.createObjectURL(blob));
      });
      onCleanup(() => {
        cancelled = true;
        this.revoke();
      });
    });
    this.destroyRef.onDestroy(() => this.revoke());
  }

  protected toggleZoom(): void {
    this.zoomed.update((z) => !z);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected async share(): Promise<void> {
    const blob = this.blob();
    const file = this.file();
    if (blob && file) await this.platform.shareBlob(blob, file.name);
  }

  protected async openExternally(): Promise<void> {
    const blob = this.blob();
    const file = this.file();
    if (blob && file) await this.platform.openBlob(blob, file.name);
  }

  private revoke(): void {
    const url = this.url();
    if (url) URL.revokeObjectURL(url);
    this.url.set(null);
    this.blob.set(null);
  }
}
