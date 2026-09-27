-- =====================================================================
-- RepLog — 0005_username_accounts.sql
-- Accounts are identified by a username, not an email address.
--
-- Supabase Auth has no username credential, so the app registers each
-- account under a synthetic address, `<username>@replog.invalid`, and
-- passes the username through in the sign-up metadata. This migration
-- teaches handle_new_user() to seed profiles.username from that metadata,
-- so the username is stored once, at the authoritative moment, rather
-- than written later by a client that could send anything.
--
-- profiles.username is already `text unique` (0001_schema.sql), so a
-- duplicate cannot be stored. In practice it cannot even be attempted:
-- Supabase requires the address to be unique, so a taken username is
-- rejected before any row is inserted.
--
-- Idempotent, like every other migration here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Seed the profile row, now including the username
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  -- Lowercased so `Alice` and `alice` can never become two accounts that
  -- look identical. The app applies the same rule before signing up.
  v_username := nullif(
    lower(trim(coalesce(new.raw_user_meta_data ->> 'username', ''))),
    ''
  );

  -- An account created before this migration, or by a client that sent no
  -- username, still gets a profile — just without one. Never guess a
  -- username from the address: on an old account that address is a real
  -- inbox, and its local part is not something the owner chose to be
  -- shown publicly as their name.
  insert into public.profiles (user_id, full_name, username)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    v_username
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Backfill
--
-- Only for accounts already registered on the synthetic domain, where the
-- local part IS the username the person chose — an account whose profile
-- row was created before the trigger knew about usernames. Accounts on a
-- real email domain are left alone deliberately: they predate this change
-- and can no longer sign in, because the app now only ever authenticates
-- <username>@replog.invalid.
-- ---------------------------------------------------------------------
update public.profiles p
set username = split_part(u.email, '@', 1),
    updated_at = now()
from auth.users u
where u.id = p.user_id
  and p.username is null
  and u.email like '%@replog.invalid'
  -- Never collide with a username someone else already holds.
  and not exists (
    select 1 from public.profiles other
    where other.username = split_part(u.email, '@', 1)
  );
