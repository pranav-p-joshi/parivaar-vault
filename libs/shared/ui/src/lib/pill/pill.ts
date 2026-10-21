import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small status label: `ok` (green) or `muted` (grey). */
@Component({
  selector: 'shared-pill',
  template: `<span class="pill" [class.up]="variant() === 'muted'"
    ><ng-content
  /></span>`,
  styles: `
    :host {
      display: inline-flex;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--pv-ok-bg, #e4f5ea);
      color: var(--pv-ok-fg, #146b3a);
      width: fit-content;
      white-space: nowrap;
    }
    .pill.up {
      background: var(--pv-surface-2, #eef0f6);
      color: var(--pv-muted, #5e6478);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pill {
  readonly variant = input<'ok' | 'muted'>('ok');
}
