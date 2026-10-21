import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Section title with an optional count on the right. */
@Component({
  selector: 'shared-section-header',
  template: `
    <div class="sec-head">
      <h2>{{ title() }}</h2>
      @if (count() !== null) {
        <span class="count">{{ count() }}</span>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .sec-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    h2 {
      font-family: var(--pv-display, inherit);
      font-weight: 700;
      font-size: 18px;
      margin: 0;
      flex: 1;
      text-wrap: balance;
    }
    .count {
      font-size: 12px;
      color: var(--pv-muted, #5e6478);
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeader {
  readonly title = input.required<string>();
  readonly count = input<string | null>(null);
}
