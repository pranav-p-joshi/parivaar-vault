# Supabase setup for Parivaar Vault

Supabase Auth provides sign-up and sign-in. Documents stay encrypted on the device;
the server only stores the family profile and the password-wrapped vault key.

## 1. Create a project

1. Create a project at https://supabase.com/dashboard.
2. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
3. Paste them into `apps/parivaar-vault/src/environments/environment.ts` (and `environment.prod.ts`).

## 2. Choose the sign-in identity

`identity` in the environment file is `'phone'` (mobile + password, as in the design) or `'email'`.

- **phone**: in **Authentication → Providers** enable **Phone** and configure an SMS provider
  (Twilio, MessageBird, Vonage, Textlocal). With "Confirm phone" on, sign-up asks for the SMS code.
  For local development you can turn "Confirm phone" off so no SMS is sent.
- **email**: enable **Email**. With "Confirm email" on, the user must click the link before signing in.

## 3. Create the tables

Run `supabase/migrations/0001_profiles_and_vault_keys.sql` in **SQL Editor**, or with the CLI:

```sh
supabase link --project-ref <your-ref>
supabase db push
```

Row Level Security limits every row to its owner.

## 4. How the app uses it

- Sign-up → `auth.signUp` → local vault created with a key derived from the password → `profiles` and
  `vault_keys` upserted.
- Sign-in → `auth.signInWithPassword` → the local vault unlocks with the same password. On a new device
  the wrapped key is fetched from `vault_keys`, so backups made elsewhere restore with the same key.
- Offline → if the vault already exists on the device, sign-in verifies the password locally.
- Leaving the URL and key empty keeps the app device-only (no cloud account).
