import { Injectable, inject } from '@angular/core';
import type {
  AuthError as SupabaseAuthError,
  User,
} from '@supabase/supabase-js';
import type { FamilyAccount } from '@pranav/shared-models';
import {
  normalizeMobile,
  type VaultKeyMaterial,
} from '../lock/vault-lock.service';
import {
  SUPABASE_CLIENT,
  SUPABASE_CONFIG,
  type AuthIdentity,
} from './supabase-config';

export type CloudAuthErrorCode =
  | 'not-configured'
  | 'invalid-credentials'
  | 'not-confirmed'
  | 'already-registered'
  | 'invalid-otp'
  | 'rate-limited'
  | 'network'
  | 'unknown';

export class CloudAuthError extends Error {
  constructor(
    readonly code: CloudAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CloudAuthError';
  }
}

export interface CloudSignUpInput {
  familyName: string;
  headName: string;
  mobile: string;
  email?: string;
  password: string;
}

export interface CloudSignUpResult {
  userId: string;
  /** Set when Supabase requires confirming the phone (SMS OTP) or email (link) first. */
  needsVerification: 'phone' | 'email' | null;
}

export interface CloudUser {
  id: string;
  account: Omit<FamilyAccount, 'createdAt'> & { createdAt?: string };
}

const PROFILES = 'profiles';
const VAULT_KEYS = 'vault_keys';

/**
 * Supabase Auth plus two user-scoped tables (see supabase/migrations):
 * `profiles` for the family account and `vault_keys` for the password-wrapped
 * data key, so another device can unlock the same vault. Documents never leave
 * the device.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly config = inject(SUPABASE_CONFIG, { optional: true });

  readonly isConfigured = this.client !== null;
  readonly identity: AuthIdentity = this.config?.identity ?? 'phone';

  /** Builds the Supabase credential object for the configured identity. */
  credentials(
    identifier: string,
    password: string,
  ): { phone: string; password: string } | { email: string; password: string } {
    return this.identity === 'phone'
      ? { phone: `+91${normalizeMobile(identifier)}`, password }
      : { email: identifier.trim().toLowerCase(), password };
  }

  async signUp(input: CloudSignUpInput): Promise<CloudSignUpResult> {
    const client = this.require();
    const identifier =
      this.identity === 'phone' ? input.mobile : (input.email ?? '');
    const { data, error } = await client.auth.signUp({
      ...this.credentials(identifier, input.password),
      options: {
        data: {
          family_name: input.familyName,
          head_name: input.headName,
          mobile: normalizeMobile(input.mobile),
          email: input.email?.trim() || null,
        },
      },
    });
    if (error) throw this.map(error);
    const user = data.user;
    if (!user)
      throw new CloudAuthError('unknown', 'Sign-up did not return a user.');
    // Supabase returns the existing user with an empty identities list when the identifier is taken.
    if (Array.isArray(user.identities) && user.identities.length === 0) {
      throw new CloudAuthError(
        'already-registered',
        'An account with this number already exists. Sign in instead.',
      );
    }
    if (data.session) return { userId: user.id, needsVerification: null };
    return { userId: user.id, needsVerification: this.identity };
  }

  /** Confirms a phone sign-up with the SMS code. */
  async verifyOtp(identifier: string, token: string): Promise<string> {
    const client = this.require();
    const { data, error } =
      this.identity === 'phone'
        ? await client.auth.verifyOtp({
            phone: `+91${normalizeMobile(identifier)}`,
            token,
            type: 'sms',
          })
        : await client.auth.verifyOtp({
            email: identifier.trim().toLowerCase(),
            token,
            type: 'signup',
          });
    if (error) throw this.map(error);
    const id = data.user?.id ?? data.session?.user.id;
    if (!id)
      throw new CloudAuthError('invalid-otp', 'The code was not accepted.');
    return id;
  }

  async signIn(identifier: string, password: string): Promise<CloudUser> {
    const client = this.require();
    const { data, error } = await client.auth.signInWithPassword(
      this.credentials(identifier, password),
    );
    if (error) throw this.map(error);
    if (!data.user)
      throw new CloudAuthError('unknown', 'Sign-in did not return a user.');
    return this.toCloudUser(data.user);
  }

  async signOut(): Promise<void> {
    if (!this.client) return;
    await this.client.auth.signOut();
  }

  /** The cached Supabase session user, if any (does not unlock the vault). */
  async currentUser(): Promise<CloudUser | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data.session ? this.toCloudUser(data.session.user) : null;
  }

  /** Best-effort: the app works even if the tables are missing. */
  async saveProfile(userId: string, account: FamilyAccount): Promise<void> {
    if (!this.client) return;
    await this.client.from(PROFILES).upsert({
      user_id: userId,
      family_name: account.familyName,
      head_name: account.headName,
      mobile: account.mobile,
      email: account.email ?? null,
    });
  }

  async saveKeyMaterial(
    userId: string,
    material: VaultKeyMaterial,
  ): Promise<void> {
    if (!this.client) return;
    await this.client.from(VAULT_KEYS).upsert({
      user_id: userId,
      salt: material.salt,
      wrapped_key: material.wrappedKey,
      updated_at: new Date().toISOString(),
    });
  }

  async loadKeyMaterial(userId: string): Promise<VaultKeyMaterial | null> {
    if (!this.client) return null;
    const { data } = await this.client
      .from(VAULT_KEYS)
      .select('salt, wrapped_key')
      .eq('user_id', userId)
      .maybeSingle();
    return data
      ? { salt: String(data.salt), wrappedKey: String(data.wrapped_key) }
      : null;
  }

  private toCloudUser(user: User): CloudUser {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const mobile =
      typeof meta['mobile'] === 'string'
        ? meta['mobile']
        : normalizeMobile(user.phone ?? '');
    return {
      id: user.id,
      account: {
        familyName:
          typeof meta['family_name'] === 'string'
            ? meta['family_name']
            : 'My family',
        headName:
          typeof meta['head_name'] === 'string' ? meta['head_name'] : 'Me',
        mobile,
        email:
          typeof meta['email'] === 'string'
            ? meta['email']
            : (user.email ?? undefined),
        createdAt: user.created_at,
      },
    };
  }

  private require() {
    if (!this.client)
      throw new CloudAuthError(
        'not-configured',
        'Supabase is not configured for this build.',
      );
    return this.client;
  }

  private map(error: SupabaseAuthError): CloudAuthError {
    const msg = error.message.toLowerCase();
    if (
      error.status === 0 ||
      msg.includes('fetch') ||
      msg.includes('network')
    ) {
      return new CloudAuthError(
        'network',
        'Could not reach the sign-in service. Check your connection.',
      );
    }
    if (
      error.status === 429 ||
      msg.includes('rate limit') ||
      msg.includes('too many')
    ) {
      return new CloudAuthError(
        'rate-limited',
        'Too many attempts. Please wait a minute and try again.',
      );
    }
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return new CloudAuthError(
        'already-registered',
        'An account with this number already exists. Sign in instead.',
      );
    }
    if (msg.includes('not confirmed')) {
      return new CloudAuthError(
        'not-confirmed',
        'Please confirm your account first, then sign in.',
      );
    }
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
      return new CloudAuthError(
        'invalid-credentials',
        'Wrong mobile number or password.',
      );
    }
    if (msg.includes('token') || msg.includes('otp')) {
      return new CloudAuthError(
        'invalid-otp',
        'That code is not valid or has expired.',
      );
    }
    return new CloudAuthError('unknown', error.message);
  }
}
