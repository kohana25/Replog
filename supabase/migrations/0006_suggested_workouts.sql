-- =====================================================================
-- RepLog — 0006_suggested_workouts.sql
-- The Suggested Workouts catalogue.
--
-- WHY SEPARATE TABLES
--   `workout_routines` is per-user by construction: `user_id` is NOT NULL
--   and its RLS policy is `user_id = auth.uid()`. Suggested routines are
--   shared reference data belonging to nobody, so holding both in that one
--   table would mean a nullable owner and a weaker policy on the table that
--   holds every user's private routines. These two tables mirror its shape
--   instead and leave it exactly as it is.
--
-- WHAT IS REUSED
--   Exercises. `suggested_routine_exercises.exercise_id` is a foreign key
--   into the existing `exercises` library, so a suggestion can only ever
--   point at an exercise that already exists — no duplicates, and the
--   workout that comes out of one is made of the same rows as any other.
--
-- ACCESS
--   Read-only to signed-in users. There is a SELECT policy and deliberately
--   no INSERT/UPDATE/DELETE policy, so the catalogue cannot be written
--   through the API at all; it changes only by migration.
--
-- It is idempotent and non-destructive: nothing existing is dropped or
-- altered, and re-running it changes nothing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- suggested_routines
--
-- One row per suggested routine. `fitness_goal` and `experience_level`
-- repeat the CHECK sets from profiles (0001) rather than inventing new
-- vocabularies, so a routine is matched to a profile by equality.
-- ---------------------------------------------------------------------
create table if not exists public.suggested_routines (
  id                 uuid primary key default gen_random_uuid(),
  -- Stable hand-written key, so the seed can be re-run as an upsert.
  slug               text not null unique
                       check (length(btrim(slug)) between 1 and 80),
  fitness_goal       text not null check (fitness_goal in (
                       'build_muscle','gain_strength','lose_weight',
                       'improve_fitness','maintain_fitness','general_wellness')),
  experience_level   text not null check (experience_level in
                       ('beginner','intermediate','advanced')),
  name               text not null check (length(btrim(name)) between 1 and 120),
  description        text,
  -- Minutes, matching workout_routines.estimated_duration.
  estimated_duration integer check (estimated_duration >= 0 and estimated_duration <= 600),
  days_per_week      integer check (days_per_week >= 1 and days_per_week <= 7),
  -- Short attribution for the guidance a routine is built on. Free text,
  -- never a medical claim.
  source_reference   text,
  -- Display order within one goal + level pair.
  order_index        integer not null default 0 check (order_index >= 0),
  created_at         timestamptz not null default now()
);

-- The Workout tab always reads by this pair, in this order.
create index if not exists suggested_routines_match_idx
  on public.suggested_routines (fitness_goal, experience_level, order_index);

-- ---------------------------------------------------------------------
-- suggested_routine_exercises
--
-- Mirrors routine_exercises: ordered, with targets that the workout screen
-- treats as suggestions rather than logged values.
-- ---------------------------------------------------------------------
create table if not exists public.suggested_routine_exercises (
  id                    uuid primary key default gen_random_uuid(),
  suggested_routine_id  uuid not null references public.suggested_routines (id) on delete cascade,
  -- RESTRICT, like routine_exercises: a suggestion must never be left
  -- pointing at an exercise that has been removed from the library.
  exercise_id           uuid not null references public.exercises (id) on delete restrict,
  order_index           integer not null default 0 check (order_index >= 0),
  sets                  integer not null default 3 check (sets >= 1 and sets <= 50),
  target_reps           integer check (target_reps >= 0 and target_reps <= 1000),
  target_duration       integer check (target_duration >= 0),
  rest_seconds          integer not null default 90
                          check (rest_seconds >= 0 and rest_seconds <= 3600),
  notes                 text,
  unique (suggested_routine_id, order_index)
);

create index if not exists suggested_routine_exercises_parent_idx
  on public.suggested_routine_exercises (suggested_routine_id, order_index);

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Readable by any signed-in user, writable by none. `anon` is not granted
-- anything, matching every other table in this schema.
-- ---------------------------------------------------------------------
alter table public.suggested_routines enable row level security;
alter table public.suggested_routine_exercises enable row level security;

drop policy if exists suggested_routines_select_all on public.suggested_routines;
create policy suggested_routines_select_all
  on public.suggested_routines
  for select
  to authenticated
  using (true);

drop policy if exists suggested_routine_exercises_select_all on public.suggested_routine_exercises;
create policy suggested_routine_exercises_select_all
  on public.suggested_routine_exercises
  for select
  to authenticated
  using (true);

grant select on public.suggested_routines to authenticated;
grant select on public.suggested_routine_exercises to authenticated;
