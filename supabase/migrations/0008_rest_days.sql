-- =====================================================================
-- Movara — 0008_rest_days.sql
-- Rest days: the user saying "today was recovery", on the record.
--
-- WHY A TABLE OF ITS OWN
--   A rest day is not a workout. `workouts.status` is constrained to
--   active/completed/cancelled and every statistic in 0003 counts rows in
--   that table — total workouts, volume, the streak, personal records.
--   Recording rest there, under any status, would either inflate those
--   numbers or require every one of those functions to learn to exclude it.
--   Kept separate, a rest day CANNOT affect them: nothing in 0003 reads
--   this table, so workout counts, volume and PR calculations are untouched
--   by construction rather than by remembering to filter.
--
-- ONE ROW PER USER PER DAY
--   `rest_on` is a DATE, not a timestamp: "which day did you rest" is a
--   calendar question, and the client sends its own local date so a rest day
--   lands on the day the user actually had, not on a UTC day boundary.
--   The unique constraint makes marking a day twice a no-op rather than a
--   duplicate.
--
-- Idempotent and non-destructive: nothing existing is altered or dropped.
-- =====================================================================

create table if not exists public.rest_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- The user's own calendar date, supplied by the client in local time.
  rest_on    date not null default current_date,
  -- Optional: "travelling", "sore knee". Never required.
  note       text check (note is null or length(btrim(note)) <= 280),
  created_at timestamptz not null default now(),
  -- Marking the same day twice is the same fact, not a second one.
  unique (user_id, rest_on)
);

-- The calendar and the week strip both read a date range for one user.
create index if not exists rest_days_user_idx
  on public.rest_days (user_id, rest_on desc);

-- ---------------------------------------------------------------------
-- Row Level Security — owner-only, exactly like workouts and measurements.
-- ---------------------------------------------------------------------
alter table public.rest_days enable row level security;

drop policy if exists rest_days_all_own on public.rest_days;
create policy rest_days_all_own
  on public.rest_days
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.rest_days to authenticated;

-- 0002 ends with "Anonymous users get nothing at all" and revokes every
-- table from anon. This keeps that promise for this table too.
revoke all on public.rest_days from anon;
