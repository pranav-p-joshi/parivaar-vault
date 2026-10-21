import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  documentIssuerName,
  documentMaskedNumber,
  documentTitle,
  type VaultDocument,
} from '@pranav/shared-models';
import { DocCard } from '../doc-card/doc-card';
import { Pill } from '../pill/pill';

/** List row: mini card, title, issuer, masked number and source pill. */
@Component({
  selector: 'shared-doc-row',
  imports: [RouterLink, DocCard, Pill],
  template: `
    <a class="docrow pv-pressable" [routerLink]="link()">
      <shared-doc-card
        [doc]="doc()"
        [fallbackName]="memberName()"
      ></shared-doc-card>
      <div class="meta">
        <div class="name">{{ title() }}</div>
        <div class="issuer">{{ issuer() }}</div>
        @if (number()) {
          <div class="num">{{ number() }}</div>
        }
        @if (doc().source === 'issued') {
          <shared-pill>✓ Issuer verified</shared-pill>
        } @else {
          <shared-pill variant="muted">Uploaded</shared-pill>
        }
      </div>
      <span class="chev" aria-hidden="true">›</span>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .docrow {
      display: grid;
      grid-template-columns: 96px 1fr auto;
      gap: 12px;
      align-items: center;
      background: var(--pv-surface, #fff);
      border-radius: 14px;
      padding: 10px;
      box-shadow: var(--pv-shadow, 0 2px 10px rgba(27, 42, 107, 0.08));
      text-align: left;
      width: 100%;
      color: inherit;
      text-decoration: none;
    }
    .meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .name {
      font-weight: 700;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .issuer {
      font-size: 12.5px;
      color: var(--pv-muted, #5e6478);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .num {
      font-family: var(--pv-mono, ui-monospace, monospace);
      font-size: 12.5px;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .chev {
      color: var(--pv-muted, #5e6478);
      font-size: 22px;
      padding-right: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocRow {
  readonly doc = input.required<VaultDocument>();
  readonly memberName = input('');
  readonly link = input<string | unknown[]>('');

  protected readonly title = computed(() => documentTitle(this.doc()));
  protected readonly issuer = computed(() => documentIssuerName(this.doc()));
  protected readonly number = computed(() => documentMaskedNumber(this.doc()));
}
