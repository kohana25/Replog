-- =====================================================================
-- Local verification harness (NOT part of the app).
--
-- Stubs the parts of Supabase the migrations depend on (the `auth` schema,
-- auth.uid(), and the anon/authenticated roles) so the real migrations can
-- be executed and the RLS policies exercised with two different users.
-- =====================================================================

create extension if not exists "pgcrypto";

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Mirrors Supabase: reads the subject claim of the current request's JWT.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
