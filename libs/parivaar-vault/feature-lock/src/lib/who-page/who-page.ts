import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  ToastController,
} from '@ionic/angular';
import { MembersStore, VaultLockService } from '@pranav/pv-data-access';
import { RELATIONS, type Relation } from '@pranav/shared-models';
import { initials } from '@pranav/shared-util';

/** "Who's using the vault?" member picker shown after sign-in and on Switch. */
@Component({
  selector: 'pv-who-page',
  imports: [
    FormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './who-page.html',
  styleUrl: './who-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhoPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  private readonly lock = inject(VaultLockService);
  protected readonly members = inject(MembersStore);
  protected readonly relations = RELATIONS.filter((r) => r !== 'Self');
  protected readonly initials = initials;

  protected readonly title = computed(() => {
    const family = this.lock.account()?.familyName;
    return family
      ? `Who's using the ${family} vault?`
      : "Who's using the vault?";
  });
  protected readonly adding = signal(false);
  protected readonly name = signal('');
  protected readonly relation = signal<Relation>('Spouse');
  protected readonly saving = signal(false);

  protected pick(id: string): void {
    this.members.select(id);
    void this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  protected async addAndContinue(): Promise<void> {
    const name = this.name().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    try {
      const member = await this.members.save({
        name,
        relation: this.relation(),
      });
      const toast = await this.toast.create({
        message: `${member.name.split(' ')[0]} added`,
        duration: 1600,
      });
      await toast.present();
      this.name.set('');
      this.adding.set(false);
      this.pick(member.id);
    } finally {
      this.saving.set(false);
    }
  }
}
