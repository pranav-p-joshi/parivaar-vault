import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  homeOutline,
  peopleOutline,
  settingsOutline,
} from 'ionicons/icons';

const NAV = [
  { tab: 'home', label: 'Home', icon: 'home-outline' },
  { tab: 'add', label: 'Add', icon: 'add-circle-outline' },
  { tab: 'family', label: 'Family', icon: 'people-outline' },
  { tab: 'settings', label: 'Settings', icon: 'settings-outline' },
];

/** Mobile shell: bottom tabs, one phone-width column. */
@Component({
  selector: 'pv-tabs-page',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        @for (item of nav; track item.tab) {
          <ion-tab-button [tab]="item.tab">
            <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
            <ion-label>{{ item.label }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  protected readonly nav = NAV;

  constructor() {
    addIcons({ homeOutline, addCircleOutline, peopleOutline, settingsOutline });
  }
}
