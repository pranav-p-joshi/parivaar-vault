import { Injectable, computed, inject, signal } from '@angular/core';
import type { FamilyAccount } from '@pranav/shared-models';
import { nowIso } from '@pranav/shared-util';
import {
  CloudAuthError,
  SupabaseAuthService,
  type CloudUser,
} from '../auth/supabase-auth.service';
import {
  VaultLockService,
  normalizeMobile,
  type SignInResult,
} from '../lock/vault-lock.service';
import { MembersStore } from '../stores/members.store';

export interface SignUpInput {
  familyName: string;
  headName: string;
  mobile: string;
  email?: string;
  password: string;
}

export type SignUpOutcome =
  { status: 'ready' } | { status: 'verify'; channel: 'phone' | 'email' };

export type AccountSignInResult =
  | SignInResult
  | {
      ok: false;
      reason: 'cloud';
      code: CloudAuthError['code'];
      message: string;
    }
  | { ok: true; offline: true };

/**
 * Sign-up and sign-in orchestration. Supabase Auth is the identity; the local
 * lock service keeps the encryption key, derived from the same password, so
 * documents never leave the device in readable form.
 */
@Injectable({ providedIn: 'root' })
export class VaultAccountService {
  private readonly lock = inject(VaultLockService);
  private readonly cloud = inject(SupabaseAuthService);
  private readonly members = inject(MembersStore);

  readonly account = this.lock.account;
  readonly cloudEnabled = this.cloud.isConfigured;
  readonly identity = this.cloud.identity;

  private readonly pendingSignUp = signal<SignUpInput | null>(null);
  readonly awaitingVerification = computed(() => this.pendingSignUp() !== null);

  /** Creates the Supabase user, then the local vault, account and head member. */
  async signUp(input: SignUpInput): Promise<SignUpOutcome> {
    if (!this.cloud.isConfigured) {
      // No backend configured: keep the device-only vault working.
      await this.createLocalVault(this.toAccount(input), input.password, null);
      return { status: 'ready' };
    }
    const result = await this.cloud.signUp(input);
    if (result.needsVerification) {
      this.pendingSignUp.set(input);
      return { status: 'verify', channel: result.needsVerification };
    }
    await this.createLocalVault(
      this.toAccount(input),
      input.password,
      result.userId,
    );
    return { status: 'ready' };
  }

  /** Completes a sign-up that required an SMS/email code. */
  async verifySignUp(code: string): Promise<void> {
    const pending = this.pendingSignUp();
    if (!pending)
      throw new CloudAuthError(
        'unknown',
        'There is no sign-up waiting for a code.',
      );
    const identifier =
      this.identity === 'phone' ? pending.mobile : (pending.email ?? '');
    const userId = await this.cloud.verifyOtp(identifier, code);
    await this.createLocalVault(
      this.toAccount(pending),
      pending.password,
      userId,
    );
    this.pendingSignUp.set(null);
  }

  cancelVerification(): void {
    this.pendingSignUp.set(null);
  }

  /**
   * Signs in with Supabase, then unlocks (or adopts) the local vault with the
   * same password. Falls back to a local-only unlock when offline and the
   * vault already exists on this device.
   */
  async signIn(
    identifier: string,
    password: string,
  ): Promise<AccountSignInResult> {
    if (!this.cloud.isConfigured) return this.lock.signIn(identifier, password);

    let user: CloudUser;
    try {
      user = await this.cloud.signIn(identifier, password);
    } catch (error) {
      if (
        error instanceof CloudAuthError &&
        error.code === 'network' &&
        this.lock.isInitialized
      ) {
        const local = await this.lock.signIn(identifier, password);
        return local.ok ? { ok: true, offline: true } : local;
      }
      if (error instanceof CloudAuthError)
        return {
          ok: false,
          reason: 'cloud',
          code: error.code,
          message: error.message,
        };
      throw error;
    }

    const cloudAccount: FamilyAccount = {
      ...user.account,
      createdAt: user.account.createdAt ?? nowIso(),
    };

    if (this.lock.isInitialized) {
      const unlocked = await this.lock.unlock(password);
      if (unlocked.ok) {
        await this.lock.updateAccount(cloudAccount);
        return unlocked;
      }
      // The password changed on another device: adopt that device's key material.
      const material = await this.cloud
        .loadKeyMaterial(user.id)
        .catch(() => null);
      if (!material) return unlocked;
      await this.lock.adoptVault(cloudAccount, material);
      return this.lock.unlock(password);
    }

    // New device: reuse the wrapped key from Supabase so backups restore with the same key.
    const material = await this.cloud
      .loadKeyMaterial(user.id)
      .catch(() => null);
    if (material) {
      await this.lock.adoptVault(cloudAccount, material);
      return this.lock.unlock(password);
    }
    await this.createLocalVault(cloudAccount, password, user.id);
    return { ok: true };
  }

  async signOut(): Promise<void> {
    this.lock.lock();
    await this.cloud.signOut().catch(() => undefined);
  }

  /** Identifier to prefill on the sign-in screen (from the local account or the cached session). */
  async rememberedIdentifier(): Promise<string> {
    const local = this.lock.account();
    if (local)
      return this.identity === 'phone' ? local.mobile : (local.email ?? '');
    const cloud = await this.cloud.currentUser().catch(() => null);
    return cloud
      ? this.identity === 'phone'
        ? cloud.account.mobile
        : (cloud.account.email ?? '')
      : '';
  }

  private async createLocalVault(
    account: FamilyAccount,
    password: string,
    userId: string | null,
  ): Promise<void> {
    await this.lock.createVault(account, password);
    await this.members.load();
    const existingHead = this.members
      .members()
      .find((m) => m.relation === 'Self');
    const head =
      existingHead ??
      (await this.members.save({ name: account.headName, relation: 'Self' }));
    this.members.select(head.id);
    if (userId) {
      await Promise.allSettled([
        this.cloud.saveProfile(userId, account),
        this.cloud.saveKeyMaterial(userId, this.lock.keyMaterial()),
      ]);
    }
  }

  private toAccount(input: SignUpInput): FamilyAccount {
    return {
      familyName: input.familyName.trim(),
      headName: input.headName.trim(),
      mobile: normalizeMobile(input.mobile),
      email: input.email?.trim() || undefined,
      createdAt: nowIso(),
    };
  }
}
