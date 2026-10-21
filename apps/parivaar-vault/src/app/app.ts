import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { VaultSessionService } from '@pranav/pv-data-access';
import { registerAppIcons } from './icons';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'pv-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Instantiating the session service starts the unlock/lock lifecycle.
  private readonly session = inject(VaultSessionService);

  constructor() {
    registerAppIcons();
  }
}
