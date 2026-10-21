import { InjectionToken, inject } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthIdentity = 'phone' | 'email';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  /** Which identifier users sign in with. Phone needs an SMS provider in Supabase. */
  identity: AuthIdentity;
}

/** Provided by the app from its environment file. */
export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>(
  'SUPABASE_CONFIG',
);

/** `null` when the app has no Supabase credentials configured. */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>(
  'SUPABASE_CLIENT',
  {
    providedIn: 'root',
    factory: () => {
      const config = inject(SUPABASE_CONFIG, { optional: true });
      if (!config?.url || !config.anonKey) return null;
      return createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    },
  },
);
