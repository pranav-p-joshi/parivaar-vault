import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import {
  BackupService,
  DigiLockerService,
  DocumentsStore,
  MembersStore,
  PlatformService,
  SampleDataService,
  SettingsService,
  VaultAccountService,
  VaultLockService,
} from '@pranav/pv-data-access';
import type { ThemePreference } from '@pranav/shared-models';
import { Pill } from '@pranav/shared-ui';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  colorPaletteOutline,
  keyOutline,
  linkOutline,
  logOutOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  timerOutline,
  trashOutline,
} from 'ionicons/icons';

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 2, label: '2 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 0, label: 'Never' },
];

@Component({
  selector: 'pv-settings-page',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    Pill,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastController);
  private readonly lock = inject(VaultLockService);
  private readonly auth = inject(VaultAccountService);
  protected readonly account = this.lock.account;
  private readonly backup = inject(BackupService);
  private readonly platform = inject(PlatformService);
  protected readonly settings = inject(SettingsService);
  protected readonly members = inject(MembersStore);
  protected readonly documents = inject(DocumentsStore);
  protected readonly samples = inject(SampleDataService);
  protected readonly digilocker = inject(DigiLockerService);

  protected readonly autoLockOptions = AUTO_LOCK_OPTIONS;
  protected readonly busy = signal<
    'export' | 'import' | 'digilocker' | 'samples' | null
  >(null);
  protected readonly theme = computed(() => this.settings.settings().theme);
  protected readonly autoLock = computed(
    () => this.settings.settings().autoLockMinutes,
  );

  constructor() {
    addIcons({
      keyOutline,
      logOutOutline,
      timerOutline,
      colorPaletteOutline,
      cloudDownloadOutline,
      cloudUploadOutline,
      linkOutline,
      sparklesOutline,
      trashOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
    });
  }

  protected setTheme(event: CustomEvent): void {
    const value = (event.detail as { value?: ThemePreference }).value;
    if (value) void this.settings.update({ theme: value });
  }

  protected setAutoLock(event: CustomEvent): void {
    const value = Number((event.detail as { value?: number }).value);
    if (!Number.isNaN(value))
      void this.settings.update({ autoLockMinutes: value });
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  protected formatMobile(mobile: string | undefined): string {
    return mobile ? `+91 ${mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}` : '';
  }

  protected async changePassword(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Change password',
      inputs: [
        { name: 'current', type: 'password', placeholder: 'Current password' },
        {
          name: 'next',
          type: 'password',
          placeholder: 'New password (8+ characters)',
        },
        {
          name: 'confirm',
          type: 'password',
          placeholder: 'Confirm new password',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Change',
          handler: (data: { current: string; next: string; confirm: string }) =>
            void this.applyPasswordChange(data),
        },
      ],
    });
    await alert.present();
  }

  private async applyPasswordChange(data: {
    current: string;
    next: string;
    confirm: string;
  }): Promise<void> {
    if ((data.next ?? '').length < 8)
      return this.notify(
        'New password must be at least 8 characters.',
        'danger',
      );
    if (data.next !== data.confirm)
      return this.notify('New passwords do not match.', 'danger');
    const ok = await this.lock.changePassword(data.current, data.next);
    return this.notify(
      ok ? 'Password changed.' : 'Current password is incorrect.',
      ok ? 'success' : 'danger',
    );
  }

  // ---- DigiLocker ----

  protected async connectDigiLocker(): Promise<void> {
    this.busy.set('digilocker');
    try {
      await this.digilocker.connect();
      await this.notify('DigiLocker linked.', 'success');
      await this.importFromDigiLocker();
    } catch (error) {
      await this.notify(
        error instanceof Error ? error.message : 'Could not link DigiLocker.',
        'danger',
      );
    } finally {
      this.busy.set(null);
    }
  }

  protected async disconnectDigiLocker(): Promise<void> {
    await this.digilocker.disconnect();
    await this.notify('DigiLocker unlinked.', 'success');
  }

  protected async importFromDigiLocker(): Promise<void> {
    if (this.members.count() === 0)
      return this.notify('Add a family member first.', 'danger');
    const issued = await this.digilocker.listIssued();
    const known = new Set(
      this.documents.documents().map((d) => d.issuer?.digilockerUri),
    );
    const available = issued.filter((d) => !known.has(d.uri));
    if (!available.length)
      return this.notify(
        'All issued documents are already in your vault.',
        'success',
      );

    const memberAlert = await this.alerts.create({
      header: 'Import for which member?',
      inputs: this.members.members().map((m, i) => ({
        type: 'radio' as const,
        label: `${m.name} · ${m.relation}`,
        value: m.id,
        checked: i === 0,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Next',
          handler: (memberId: string) =>
            void this.pickIssued(memberId, available),
        },
      ],
    });
    await memberAlert.present();
  }

  private async pickIssued(
    memberId: string,
    available: Awaited<ReturnType<DigiLockerService['listIssued']>>,
  ): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Issued documents',
      message: 'Choose what to fetch from DigiLocker.',
      inputs: available.map((d) => ({
        type: 'checkbox' as const,
        label: `${d.name} (${d.issuerCode})`,
        value: d.uri,
        checked: true,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Import',
          handler: (uris: string[]) => {
            void this.runImport(uris, memberId);
          },
        },
      ],
    });
    await alert.present();
  }

  private async runImport(uris: string[], memberId: string): Promise<void> {
    if (!uris?.length) return;
    this.busy.set('digilocker');
    try {
      const docs = await this.digilocker.importIssued(uris, memberId);
      this.members.select(memberId);
      await this.notify(
        `Imported ${docs.length} issued document${docs.length === 1 ? '' : 's'}.`,
        'success',
      );
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.notify(
        error instanceof Error ? error.message : 'Import failed.',
        'danger',
      );
    } finally {
      this.busy.set(null);
    }
  }

  // ---- Backup ----

  protected async exportBackup(): Promise<void> {
    this.busy.set('export');
    try {
      const { blob, filename } = await this.backup.createBackup();
      await this.platform.shareBlob(blob, filename, 'Parivaar Vault backup');
      await this.notify('Backup ready. Keep it somewhere safe.', 'success');
    } catch (error) {
      await this.notify(
        error instanceof Error ? error.message : 'Backup failed.',
        'danger',
      );
    } finally {
      this.busy.set(null);
    }
  }

  protected importBackup(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        input.remove();
        if (file) void this.restoreFrom(file);
      },
      { once: true },
    );
    input.click();
  }

  private async restoreFrom(file: File): Promise<void> {
    let parsed;
    try {
      parsed = this.backup.parseBackup(await file.text());
    } catch (error) {
      return this.notify(
        error instanceof Error ? error.message : 'Could not read backup.',
        'danger',
      );
    }
    const alert = await this.alerts.create({
      header: 'Restore backup',
      message: `${parsed.members.length} members, ${parsed.documents.length} documents, ${parsed.files.length} files from ${parsed.exportedAt.slice(0, 10)}. Enter the vault password that was set when this backup was made.`,
      inputs: [
        {
          name: 'pin',
          type: 'password',
          placeholder: 'Backup password',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Restore',
          handler: (data: { pin: string }) =>
            void this.runRestore(parsed, data.pin),
        },
      ],
    });
    await alert.present();
  }

  private async runRestore(
    parsed: ReturnType<BackupService['parseBackup']>,
    pin: string,
  ): Promise<void> {
    this.busy.set('import');
    try {
      const summary = await this.backup.restore(parsed, pin);
      await this.notify(
        `Restored ${summary.documents} documents and ${summary.files} files.`,
        'success',
      );
    } catch (error) {
      await this.notify(
        error instanceof Error ? error.message : 'Restore failed.',
        'danger',
      );
    } finally {
      this.busy.set(null);
    }
  }

  // ---- Samples & danger zone ----

  protected async toggleSamples(): Promise<void> {
    this.busy.set('samples');
    try {
      if (this.samples.hasSamples()) {
        await this.samples.remove();
        await this.notify('Sample family removed.', 'success');
      } else {
        await this.samples.load();
        await this.notify('Sample family loaded.', 'success');
      }
    } finally {
      this.busy.set(null);
    }
  }

  protected async eraseVault(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Erase everything?',
      message:
        'All members, documents and files on this device will be deleted. Export a backup first if you need them.',
      inputs: [
        { name: 'confirm', type: 'text', placeholder: 'Type ERASE to confirm' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Erase vault',
          role: 'destructive',
          handler: (data: { confirm: string }) => {
            if (data.confirm !== 'ERASE') return false;
            void this.backup
              .eraseVault()
              .then(() =>
                this.router.navigateByUrl('/lock', { replaceUrl: true }),
              );
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async notify(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toast.create({ message, duration: 2200, color });
    await toast.present();
  }
}
