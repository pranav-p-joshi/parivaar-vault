import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Centered placeholder for empty lists with an optional action slot. */
@Component({
  selector: 'shared-empty-state',
  imports: [IonIcon],
  template: `
    <div class="empty">
      <ion-icon [name]="icon()" aria-hidden="true"></ion-icon>
      <h2>{{ title() }}</h2>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
      color: var(--ion-color-medium);
    }
    ion-icon {
      font-size: 56px;
      margin-bottom: 12px;
      color: var(--ion-color-primary);
      opacity: 0.6;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 600;
      color: var(--ion-text-color);
    }
    p {
      margin: 0 0 16px;
      max-width: 36ch;
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('folder-open-outline');
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
