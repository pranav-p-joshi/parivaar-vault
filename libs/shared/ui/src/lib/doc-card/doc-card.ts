import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  docTypeDef,
  documentMaskedNumber,
  documentNumber,
  documentTitle,
  type VaultDocument,
} from '@pranav/shared-models';

export type DocCardSize = 'mini' | 'big';
export type DocCardLike = Pick<VaultDocument, 'type' | 'fields'>;

/**
 * Renders a document as a stylised card (Aadhaar tricolour, PAN blue, passport
 * navy…). One component serves the 96px list thumbnail and the full-size card.
 */
@Component({
  selector: 'shared-doc-card',
  template: `
    <div
      class="mini"
      [class]="skin()"
      [class.big]="size() === 'big'"
      aria-hidden="true"
    >
      <div class="band"></div>
      <div class="photo"></div>
      <div class="emblem"></div>
      <div class="in">
        <div class="lbl">{{ label() }}</div>
        <div class="nm">{{ name() }}</div>
        <div class="no">{{ number() }}</div>
      </div>
    </div>
  `,
  styleUrl: './doc-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocCard {
  readonly doc = input.required<DocCardLike>();
  /** Shown when the document has no name field (e.g. the member's name). */
  readonly fallbackName = input('');
  readonly size = input<DocCardSize>('mini');

  protected readonly def = computed(() => docTypeDef(this.doc().type));
  protected readonly skin = computed(() => this.def().skin);
  protected readonly label = computed(
    () => this.def().issuerCode || documentTitle(this.doc()),
  );
  protected readonly name = computed(
    () => this.doc().fields[this.def().nameKey] || this.fallbackName(),
  );
  protected readonly number = computed(() =>
    this.size() === 'big'
      ? documentNumber(this.doc())
      : documentMaskedNumber(this.doc()),
  );
}
