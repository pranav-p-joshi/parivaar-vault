import { Injectable, effect, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  DEFAULT_SETTINGS,
  type ThemePreference,
  type VaultSettings,
} from '@pranav/shared-models';
import { VaultLockService } from '../lock/vault-lock.service';

const KEY = 'pv.settings';

/** User preferences persisted with Capacitor Preferences (localStorage on the web). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly lock = inject(VaultLockService);
  private readonly _settings = signal<VaultSettings>(DEFAULT_SETTINGS);
  readonly settings = this._settings.asReadonly();

  private readonly media =
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null;

  constructor() {
    effect(() => {
      const { theme, autoLockMinutes } = this._settings();
      this.applyTheme(theme);
      this.lock.setAutoLockMinutes(autoLockMinutes);
    });
    this.media?.addEventListener('change', () =>
      this.applyTheme(this._settings().theme),
    );
  }

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      try {
        this._settings.set({
          ...DEFAULT_SETTINGS,
          ...(JSON.parse(value) as Partial<VaultSettings>),
        });
      } catch {
        this._settings.set(DEFAULT_SETTINGS);
      }
    }
  }

  async update(patch: Partial<VaultSettings>): Promise<void> {
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  }

  private applyTheme(theme: ThemePreference): void {
    if (typeof document === 'undefined') return;
    const dark =
      theme === 'dark' || (theme === 'system' && !!this.media?.matches);
    document.documentElement.classList.toggle('ion-palette-dark', dark);
  }
}
