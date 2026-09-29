-- =====================================================================
-- RepLog — 0005_username_auth.sql
-- Sign-in moves from an email address to a username.
--
-- WHAT CHANGES
--   The app now identifies an account by `profiles.username`. Supabase Auth
--   still holds the credentials — it hashes the password with bcrypt and
--   issues the session — so nothing about authentication moves into these
--   tables, and no password is ever stored here in any form.
--
--   The username the user types is mapped by the client to a fixed address on
--   a domain reserved by RFC 2606 to never exist (`<name>@users.replog.invalid`),
--   which is what auth.users.email holds. That address is never mailed: it is
--   only how Supabase tells one account from another, and it makes usernames
--   unique for free, because auth.users.email already is.
--
-- WHAT THIS MIGRATION DOES
--   1. Seeds profiles.username from the sign-up metadata.
--   2. Enforces uniqueness case-insensitively, so "Alex" cannot be taken
--      alongside "alex".
--   3. Backfills existing profiles that have no username yet.
--
-- It is idempotent and non-destructive: no column is dropped, no row is
-- deleted, and an existing username is never overwritten.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Seed the username when the account is created
--
-- The trigger already copied full_name out of the sign-up metadata; it now
-- copies username as well. A username that somehow collides (only possible
-- for a profile that took the name before this migration) is dropped rather
-- than failing the sign-up: profiles.username mirrors the identifier, it is
-- not the identifier itself, so the account is still perfectly usable.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_username  text := nullif(lower(trim(coalesce(new.raw_user_meta_data ->> 'username', ''))), '');
begin
  begin
    insert into public.profiles (user_id, full_name, username)
    values (new.id, v_full_name, v_username)
    on conflict (user_id) do nothing;
  exception when unique_violation then
    insert into public.profiles (user_id, full_name)
    values (new.id, v_full_name)
    on conflict (user_id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Usernames are unique regardless of case
--
-- The column's own `unique` constraint from 0001 stays; this adds the
-- case-insensitive half of the rule. Partial, because a profile with no
-- username yet is not competing for one.
-- ---------------------------------------------------------------------
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

-- ---------------------------------------------------------------------
-- 3. Backfill profiles created before this migration
--
-- Takes the username from the sign-up metadata, falling back to the local
-- part of the account's address. Rows that would collide with a username
-- already in use are left alone rather than renamed.
--
-- TWO ACCOUNTS CAN WANT THE SAME NAME
-- `not exists` alone is not enough: every row of a single UPDATE sees the
-- table as it was before the statement began, so two profiles whose
-- candidate is the same would both pass that check, both be written, and
-- the index added above would then reject the whole statement. The
-- candidates are therefore deduplicated first and only one row may take
-- each name; the rest keep a null username, which the app handles by
-- reading the name back off the account address.
-- ---------------------------------------------------------------------
with candidates as (
  select
    u.id as user_id,
    nullif(
      lower(trim(coalesce(
        u.raw_user_meta_data ->> 'username',
        split_part(coalesce(u.email, ''), '@', 1)
      ))),
      ''
    ) as value
  from auth.users u
),
eligible as (
  select c.user_id, c.value
  from candidates c
  join public.profiles p on p.user_id = c.user_id
  where p.username is null
    and c.value is not null
    and not exists (
      select 1
      from public.profiles other
      where lower(other.username) = c.value
    )
),
-- Ordered by user_id rather than left to chance, so re-running this on an
-- identical database always picks the same winner.
deduped as (
  select user_id, value
  from (
    select
      user_id,
      value,
      row_number() over (partition by value order by user_id) as rn
    from eligible
  ) ranked
  where rn = 1
)
update public.profiles p
set username = d.value
from deduped d
where p.user_id = d.user_id;
