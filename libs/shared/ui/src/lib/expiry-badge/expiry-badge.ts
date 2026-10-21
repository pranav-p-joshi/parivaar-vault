import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IonBadge } from '@ionic/angular';
import type { ExpiryStatus } from '@pranav/shared-models';
import {
  daysUntil,
  expiryStatus,
  formatRelativeDays,
} from '@pranav/shared-util';

const COLOR: Record<ExpiryStatus, string> = {
  expired: 'danger',
  critical: 'danger',
  soon: 'warning',
  ok: 'success',
  none: 'medium',
};

/** Badge summarising how close a document is to expiring. Accepts dd/mm/yyyy or ISO. */
@Component({
  selector: 'shared-expiry-badge',
  imports: [IonBadge],
  template: `
    @if (status() !== 'none') {
      <ion-badge [color]="color()">{{ label() }}</ion-badge>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpiryBadge {
  readonly expiryDate = input<string | undefined>(undefined);

  protected readonly status = computed(() => expiryStatus(this.expiryDate()));
  protected readonly color = computed(() => COLOR[this.status()]);
  protected readonly label = computed(() => {
    const date = this.expiryDate();
    if (!date) return '';
    const days = daysUntil(date);
    if (this.status() === 'expired')
      return `Expired ${formatRelativeDays(days).toLowerCase()}`;
    return `Expires ${formatRelativeDays(days).toLowerCase()}`;
  });
}
