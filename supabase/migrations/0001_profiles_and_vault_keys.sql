-- Parivaar Vault: per-user profile and password-wrapped vault key.
-- Run in Supabase → SQL editor (or `supabase db push`). Documents never reach the server.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_name text not null,
  head_name text not null,
  mobile text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The AES data key wrapped with a PBKDF2 key derived from the user's password.
-- Useless without the password; lets a second device unlock the same vault.
create table if not exists public.vault_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  wrapped_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.vault_keys enable row level security;

drop policy if exists "vault_keys: own row" on public.vault_keys;
create policy "vault_keys: own row" on public.vault_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
