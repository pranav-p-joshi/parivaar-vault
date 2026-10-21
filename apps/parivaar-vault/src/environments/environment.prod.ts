import type { SupabaseConfig } from '@pranav/pv-data-access';

/**
 * Supabase project settings (Project Settings → API). The publishable key is a
 * public client key. Set `identity` to 'phone' once the Phone provider and an
 * SMS provider are enabled in Supabase; 'email' works with the default setup.
 */
export const environment = {
  production: true,
  supabase: {
    url: 'https://ajglqoocildaurmblihv.supabase.co',
    anonKey: 'sb_publishable_W0p9_FO8ZMlR6x_lr4_-8w_XXO11bUI',
    identity: 'email',
  } satisfies SupabaseConfig,
};
