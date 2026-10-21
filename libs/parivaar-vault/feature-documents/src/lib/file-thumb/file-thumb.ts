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
import { IonIcon } from '@ionic/angular';
import { FilesRepository } from '@pranav/pv-data-access';
import type { VaultFileMeta } from '@pranav/shared-models';
import { isImageMime, isPdfMime } from '@pranav/shared-util';
import { addIcons } from 'ionicons';
import { documentOutline, imageOutline } from 'ionicons/icons';

/** Decrypts a stored file on demand and shows an image preview or a type icon. */
@Component({
  selector: 'pv-file-thumb',
  imports: [IonIcon],
  template: `
    @if (url(); as src) {
      <img [src]="src" [alt]="alt()" />
    } @else {
      <span class="icon" [class.pdf]="isPdf()">
        <ion-icon
          [name]="isPdf() ? 'document-outline' : 'image-outline'"
          aria-hidden="true"
        ></ion-icon>
        @if (isPdf()) {
          <small>PDF</small>
        }
      </span>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      background: var(--pv-surface-2);
    }
    img {
      width: 100%;
      max-height: 260px;
      object-fit: contain;
      display: block;
      animation: pv-fade 300ms ease both;
    }
    .icon {
      width: 100%;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--pv-navy-2);
      font-size: 32px;
      &.pdf {
        color: var(--pv-red);
      }
      small {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
    }
    @keyframes pv-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileThumb {
  private readonly files = inject(FilesRepository);
  private readonly destroyRef = inject(DestroyRef);

  readonly fileId = input.required<string>();
  readonly alt = input('Scanned document');

  protected readonly url = signal<string | null>(null);
  protected readonly meta = signal<VaultFileMeta | undefined>(undefined);
  protected readonly isPdf = computed(() => isPdfMime(this.meta()?.mimeType));

  constructor() {
    addIcons({ documentOutline, imageOutline });
    effect((onCleanup) => {
      const id = this.fileId();
      let cancelled = false;
      void (async () => {
        const meta = await this.files.getMeta(id);
        if (cancelled) return;
        this.meta.set(meta);
        if (!meta || !isImageMime(meta.mimeType)) return;
        const blob = await this.files.getBlob(id);
        if (cancelled || !blob) return;
        this.url.set(URL.createObjectURL(blob));
      })();
      onCleanup(() => {
        cancelled = true;
        this.revoke();
      });
    });
    this.destroyRef.onDestroy(() => this.revoke());
  }

  private revoke(): void {
    const url = this.url();
    if (url) {
      URL.revokeObjectURL(url);
      this.url.set(null);
    }
  }
}
