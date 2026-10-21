import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Label/value row used in document detail lists. Project an action into the `end` slot. */
@Component({
  selector: 'shared-field-row',
  template: `
    <div class="f" [class.low]="lowConfidence()">
      <div class="text">
        <div class="k">{{ label() }}</div>
        <div class="v" [class.mono]="mono()">{{ value() }}</div>
      </div>
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
      border-top: 1px solid var(--pv-line, #dadeea);
    }
    :host(:first-child) {
      border-top: 0;
    }
    .f {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .k {
      font-size: 11px;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      color: var(--pv-muted, #5e6478);
      font-weight: 700;
    }
    .v {
      font-weight: 600;
      font-size: 15.5px;
      overflow-wrap: anywhere;
    }
    .v.mono {
      font-family: var(--pv-mono, ui-monospace, monospace);
      letter-spacing: 0.8px;
      font-variant-numeric: tabular-nums;
    }
    .low .v {
      color: var(--pv-saffron, #f0843a);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldRow {
  readonly label = input.required<string>();
  readonly value = input<string>('');
  readonly mono = input(false);
  readonly lowConfidence = input(false);
}
