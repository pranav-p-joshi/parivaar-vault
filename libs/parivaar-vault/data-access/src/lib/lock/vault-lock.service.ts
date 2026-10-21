import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { FamilyAccount } from '@pranav/shared-models';
import {
  deriveKeyFromPin,
  generateDataKey,
  randomBytes,
  saltFromBase64,
  saltToBase64,
  unwrapDataKey,
  wrapDataKey,
} from '../crypto/vault-crypto';

export type LockStatus = 'loading' | 'uninitialized' | 'locked' | 'unlocked';

export type SignInResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'no-account' | 'wrong-mobile' | 'wrong-password' | 'rate-limited';
      retryAfterSeconds?: number;
    };

const KEY_SALT = 'pv.salt';
const KEY_WRAPPED = 'pv.wrappedKey';
const KEY_ACCOUNT = 'pv.account';
const KEY_ATTEMPTS = 'pv.auth.attempts';
const KEY_LOCKED_UNTIL = 'pv.auth.lockedUntil';

const MAX_FREE_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000;

export interface VaultKeyMaterial {
  salt: string;
  wrappedKey: string;
}

export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Owns the family account and the vault's encryption key. The data key only
 * lives in memory while signed in; at rest it is wrapped with a key derived
 * from the password (PBKDF2-SHA256, 310k iterations). The password is never stored.
 */
@Injectable({ providedIn: 'root' })
export class VaultLockService {
  private readonly _status = signal<LockStatus>('loading');
  private readonly _account = signal<FamilyAccount | null>(null);
  readonly status = this._status.asReadonly();
  readonly account = this._account.asReadonly();
  readonly isUnlocked = computed(() => this._status() === 'unlocked');

  private dataKey: CryptoKey | null = null;
  private salt: Uint8Array<ArrayBuffer> | null = null;
  private wrappedKey: string | null = null;
  private attempts = 0;
  private lockedUntil = 0;
  private hiddenAt: number | null = null;
  private autoLockMs = 2 * 60_000;
  private listening = false;

  /** Loads stored key material and account. Safe to call more than once. */
  async init(): Promise<void> {
    const [salt, wrapped, account, attempts, lockedUntil] = await Promise.all(
      [KEY_SALT, KEY_WRAPPED, KEY_ACCOUNT, KEY_ATTEMPTS, KEY_LOCKED_UNTIL].map(
        (key) => Preferences.get({ key }).then((r) => r.value),
      ),
    );
    this.attempts = Number(attempts ?? 0) || 0;
    this.lockedUntil = Number(lockedUntil ?? 0) || 0;
    if (salt && wrapped && account) {
      this.salt = saltFromBase64(salt);
      this.wrappedKey = wrapped;
      this._account.set(JSON.parse(account) as FamilyAccount);
      this._status.set(this.dataKey ? 'unlocked' : 'locked');
    } else {
      this._status.set('uninitialized');
    }
    this.listenForBackgrounding();
  }

  get isInitialized(): boolean {
    return this._status() !== 'uninitialized' && this._status() !== 'loading';
  }

  /** Creates the vault key for a new family account protected by `password`. */
  async createVault(account: FamilyAccount, password: string): Promise<void> {
    const salt = randomBytes(16);
    const passwordKey = await deriveKeyFromPin(password, salt);
    const dataKey = await generateDataKey();
    const wrapped = await wrapDataKey(dataKey, passwordKey);
    await Promise.all([
      Preferences.set({ key: KEY_SALT, value: saltToBase64(salt) }),
      Preferences.set({ key: KEY_WRAPPED, value: wrapped }),
      Preferences.set({ key: KEY_ACCOUNT, value: JSON.stringify(account) }),
      this.persistAttempts(0, 0),
    ]);
    this.salt = salt;
    this.wrappedKey = wrapped;
    this.dataKey = dataKey;
    this._account.set(account);
    this._status.set('unlocked');
  }

  /** Verifies the mobile number and password (by unwrapping the data key), with back-off after repeated failures. */
  /** Verifies the identifier (mobile or email) and password locally, with back-off after repeated failures. */
  async signIn(identifier: string, password: string): Promise<SignInResult> {
    const account = this._account();
    if (!account || !this.salt || !this.wrappedKey)
      return { ok: false, reason: 'no-account' };
    const retry = this.retryAfterSeconds();
    if (retry > 0)
      return { ok: false, reason: 'rate-limited', retryAfterSeconds: retry };
    const matchesMobile = normalizeMobile(identifier) === account.mobile;
    const matchesEmail =
      !!account.email &&
      identifier.trim().toLowerCase() === account.email.toLowerCase();
    if (!matchesMobile && !matchesEmail) {
      await this.registerFailure();
      return { ok: false, reason: 'wrong-mobile' };
    }
    return this.unlock(password);
  }

  /** Unlocks with the password only (identity already verified elsewhere, e.g. by Supabase). */
  async unlock(password: string): Promise<SignInResult> {
    if (!this.salt || !this.wrappedKey)
      return { ok: false, reason: 'no-account' };
    const retry = this.retryAfterSeconds();
    if (retry > 0)
      return { ok: false, reason: 'rate-limited', retryAfterSeconds: retry };
    try {
      const passwordKey = await deriveKeyFromPin(password, this.salt);
      this.dataKey = await unwrapDataKey(this.wrappedKey, passwordKey);
    } catch {
      await this.registerFailure();
      const after = this.retryAfterSeconds();
      return after > 0
        ? { ok: false, reason: 'rate-limited', retryAfterSeconds: after }
        : { ok: false, reason: 'wrong-password' };
    }
    await this.persistAttempts(0, 0);
    this._status.set('unlocked');
    return { ok: true };
  }

  /** Seconds until another sign-in attempt is allowed; 0 when not rate-limited. */
  retryAfterSeconds(): number {
    return Math.max(0, Math.ceil((this.lockedUntil - Date.now()) / 1000));
  }

  /** Installs key material from another device (e.g. from Supabase); the vault stays locked until `unlock`. */
  async adoptVault(
    account: FamilyAccount,
    material: VaultKeyMaterial,
  ): Promise<void> {
    await Promise.all([
      Preferences.set({ key: KEY_SALT, value: material.salt }),
      Preferences.set({ key: KEY_WRAPPED, value: material.wrappedKey }),
      Preferences.set({ key: KEY_ACCOUNT, value: JSON.stringify(account) }),
      this.persistAttempts(0, 0),
    ]);
    this.salt = saltFromBase64(material.salt);
    this.wrappedKey = material.wrappedKey;
    this.dataKey = null;
    this._account.set(account);
    this._status.set('locked');
  }

  lock(): void {
    this.dataKey = null;
    if (this.isInitialized) this._status.set('locked');
  }

  async changePassword(
    currentPassword: string,
    nextPassword: string,
  ): Promise<boolean> {
    if (!this.salt || !this.wrappedKey) return false;
    try {
      const currentKey = await deriveKeyFromPin(currentPassword, this.salt);
      const dataKey = await unwrapDataKey(this.wrappedKey, currentKey);
      const salt = randomBytes(16);
      const wrapped = await wrapDataKey(
        dataKey,
        await deriveKeyFromPin(nextPassword, salt),
      );
      await Preferences.set({ key: KEY_SALT, value: saltToBase64(salt) });
      await Preferences.set({ key: KEY_WRAPPED, value: wrapped });
      this.salt = salt;
      this.wrappedKey = wrapped;
      this.dataKey = dataKey;
      return true;
    } catch {
      return false;
    }
  }

  async updateAccount(
    patch: Partial<Omit<FamilyAccount, 'createdAt'>>,
  ): Promise<void> {
    const current = this._account();
    if (!current) return;
    const next = { ...current, ...patch };
    await Preferences.set({ key: KEY_ACCOUNT, value: JSON.stringify(next) });
    this._account.set(next);
  }

  /** Throws when locked; repositories call this before touching encrypted data. */
  requireKey(): CryptoKey {
    if (!this.dataKey) throw new Error('Vault is locked.');
    return this.dataKey;
  }

  /** Exported with backups so a restore can unwrap the files with the same password. */
  keyMaterial(): VaultKeyMaterial {
    if (!this.salt || !this.wrappedKey) throw new Error('Vault is not set up.');
    return { salt: saltToBase64(this.salt), wrappedKey: this.wrappedKey };
  }

  /** Forgets the account and key material. Callers must wipe the database separately. */
  async reset(): Promise<void> {
    await Promise.all(
      [KEY_SALT, KEY_WRAPPED, KEY_ACCOUNT, KEY_ATTEMPTS, KEY_LOCKED_UNTIL].map(
        (key) => Preferences.remove({ key }),
      ),
    );
    this.dataKey = null;
    this.salt = null;
    this.wrappedKey = null;
    this.attempts = 0;
    this.lockedUntil = 0;
    this._account.set(null);
    this._status.set('uninitialized');
  }

  setAutoLockMinutes(minutes: number): void {
    this.autoLockMs = Math.max(0, minutes) * 60_000;
  }

  private async registerFailure(): Promise<void> {
    const attempts = this.attempts + 1;
    const over = attempts - MAX_FREE_ATTEMPTS;
    const lockedUntil =
      over >= 0 ? Date.now() + BASE_BACKOFF_MS * 2 ** over : 0;
    await this.persistAttempts(attempts, lockedUntil);
  }

  private async persistAttempts(
    attempts: number,
    lockedUntil: number,
  ): Promise<void> {
    this.attempts = attempts;
    this.lockedUntil = lockedUntil;
    await Promise.all([
      Preferences.set({ key: KEY_ATTEMPTS, value: String(attempts) }),
      Preferences.set({ key: KEY_LOCKED_UNTIL, value: String(lockedUntil) }),
    ]);
  }

  private listenForBackgrounding(): void {
    if (this.listening || typeof document === 'undefined') return;
    this.listening = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenAt = Date.now();
        return;
      }
      if (
        this.hiddenAt !== null &&
        this.autoLockMs > 0 &&
        Date.now() - this.hiddenAt >= this.autoLockMs
      ) {
        this.lock();
      }
      this.hiddenAt = null;
    });
  }
}
