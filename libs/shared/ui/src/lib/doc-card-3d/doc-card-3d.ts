import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  docTypeDef,
  documentTitle,
  type VaultDocument,
} from '@pranav/shared-models';
import { DocCard } from '../doc-card/doc-card';

type Card3dDoc = Pick<
  VaultDocument,
  'type' | 'fields' | 'source' | 'issuer' | 'id' | 'addedAt'
>;

/**
 * Full-size card in a perspective stage. Pointer movement tilts it, tap or
 * Enter flips it to the back face. Transform-only, so it stays GPU composited.
 */
@Component({
  selector: 'shared-doc-card-3d',
  imports: [DocCard],
  templateUrl: './doc-card-3d.html',
  styleUrl: './doc-card-3d.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocCard3d {
  readonly doc = input.required<Card3dDoc>();
  readonly fallbackName = input('');
  /** Gentle hover animation (used while a fetch sequence runs). */
  readonly floating = input(false);
  /** Disable flip/tilt interaction. */
  readonly interactive = input(true);

  protected readonly flipped = signal(false);
  private readonly rx = signal(0);
  private readonly ry = signal(0);
  private frame = 0;
  private pendingX = 0;
  private pendingY = 0;

  protected readonly transform = computed(
    () =>
      `rotateX(${this.rx()}deg) rotateY(${this.ry() + (this.flipped() ? 180 : 0)}deg)`,
  );
  protected readonly def = computed(() => docTypeDef(this.doc().type));
  protected readonly title = computed(() => documentTitle(this.doc()));
  protected readonly eyebrow = computed(
    () => this.def().issuerCode || 'Document',
  );
  protected readonly signature = computed(() => {
    const doc = this.doc();
    if (doc.source !== 'issued') return 'Self-uploaded · no issuer signature';
    const seed = `${doc.id}${doc.issuer?.signedAt ?? doc.addedAt}`;
    return `SIG ${btoa(unescape(encodeURIComponent(seed)))
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, 22)
      .toUpperCase()}`;
  });

  protected tilt(event: PointerEvent): void {
    if (!this.interactive()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    this.pendingX = -y * 18;
    this.pendingY = x * 22;
    this.schedule();
  }

  protected resetTilt(): void {
    this.pendingX = 0;
    this.pendingY = 0;
    this.schedule();
  }

  protected flip(event?: Event): void {
    if (!this.interactive()) return;
    event?.preventDefault();
    this.flipped.update((f) => !f);
    this.resetTilt();
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.rx.set(this.pendingX);
      this.ry.set(this.pendingY);
    });
  }
}
