-- =====================================================================
-- RepLog — 0001_schema.sql
-- Core tables, constraints, indexes and triggers.
--
-- UNITS POLICY
--   All weights are stored in KILOGRAMS and all lengths in CENTIMETRES.
--   The user's kg/lb preference is a *display* setting (profiles.unit_preference)
--   and is converted in the client only. The database never mixes units.
--
-- TIME POLICY
--   All timestamps are `timestamptz` stored in UTC. The client converts to
--   the device timezone for display.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- One row per authenticated user. `user_id` is the authoritative link to
-- auth.users and is what every RLS policy compares against auth.uid().
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users (id) on delete cascade,
  full_name           text,
  username            text unique,
  avatar_url          text,
  fitness_goal        text check (fitness_goal in (
                        'build_muscle','gain_strength','lose_weight',
                        'improve_fitness','maintain_fitness','general_wellness')),
  experience_level    text check (experience_level in ('beginner','intermediate','advanced')),
  height_cm           numeric(5,1) check (height_cm > 0 and height_cm < 300),
  weight_kg           numeric(6,2) check (weight_kg > 0 and weight_kg < 700),
  date_of_birth       date check (date_of_birth < current_date),
  training_days       text[] not null default '{}',
  -- display / app settings
  unit_preference     text not null default 'kg'     check (unit_preference in ('kg','lb')),
  theme_preference    text not null default 'system' check (theme_preference in ('system','light','dark')),
  default_rest_seconds integer not null default 90   check (default_rest_seconds between 0 and 3600),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row automatically when a user signs up, so the app
-- never has to trust a client-supplied user id to bootstrap a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
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
-- exercises
-- Shared library (is_public = true, created_by is null) plus private
-- user-created exercises (is_public = false, created_by = the owner).
-- ---------------------------------------------------------------------
create table if not exists public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  created_by         uuid references auth.users (id) on delete cascade,
  is_public          boolean not null default false,
  name               text not null check (length(btrim(name)) between 1 and 120),
  description        text,
  -- tracking style drives which inputs the logger shows
  exercise_type      text not null default 'strength' check (exercise_type in (
                       'strength','bodyweight','cardio','duration','stretching')),
  equipment          text not null default 'other' check (equipment in (
                       'barbell','dumbbell','machine','cable','kettlebell',
                       'resistance_band','bodyweight','other')),
  primary_muscle     text not null check (primary_muscle in (
                       'chest','back','shoulders','biceps','triceps','legs',
                       'glutes','core','cardio','full_body')),
  secondary_muscles  text[] not null default '{}',
  difficulty         text check (difficulty in ('beginner','intermediate','advanced')),
  instructions       text,
  image_url          text,
  video_url          text,
  created_at         timestamptz not null default now(),
  -- a private exercise must have an owner
  constraint exercises_ownership_ck check (is_public or created_by is not null)
);

create index if not exists exercises_primary_muscle_idx on public.exercises (primary_muscle);
create index if not exists exercises_equipment_idx      on public.exercises (equipment);
create index if not exists exercises_created_by_idx     on public.exercises (created_by);
create unique index if not exists exercises_owner_name_uq
  on public.exercises (created_by, lower(btrim(name)))
  where created_by is not null;

-- ---------------------------------------------------------------------
-- workout_routines  — reusable templates
-- ---------------------------------------------------------------------
create table if not exists public.workout_routines (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (length(btrim(name)) between 1 and 120),
  description        text,
  folder             text,
  estimated_duration integer check (estimated_duration between 0 and 600), -- minutes
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists workout_routines_user_idx on public.workout_routines (user_id, updated_at desc);

create trigger workout_routines_set_updated_at
  before update on public.workout_routines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- routine_exercises  — the planned exercises inside a routine
-- ---------------------------------------------------------------------
create table if not exists public.routine_exercises (
  id               uuid primary key default gen_random_uuid(),
  routine_id       uuid not null references public.workout_routines (id) on delete cascade,
  exercise_id      uuid not null references public.exercises (id) on delete restrict,
  order_index      integer not null default 0 check (order_index >= 0),
  sets             integer not null default 3 check (sets between 1 and 50),
  target_reps      integer check (target_reps between 0 and 1000),
  target_weight    numeric(7,2) check (target_weight >= 0),      -- kg
  target_duration  integer check (target_duration >= 0),         -- seconds
  rest_seconds     integer not null default 90 check (rest_seconds between 0 and 3600),
  superset_group   text,
  notes            text
);

create index if not exists routine_exercises_routine_idx
  on public.routine_exercises (routine_id, order_index);

-- ---------------------------------------------------------------------
-- workouts  — an actual training session
-- ---------------------------------------------------------------------
create table if not exists public.workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  routine_id       uuid references public.workout_routines (id) on delete set null,
  name             text not null default 'Workout',
  status           text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  constraint workouts_completed_ck check (
    (status <> 'completed') or (completed_at is not null)
  )
);

create index if not exists workouts_user_completed_idx
  on public.workouts (user_id, completed_at desc nulls last);
create index if not exists workouts_user_status_idx
  on public.workouts (user_id, status);

-- ---------------------------------------------------------------------
-- workout_exercises
-- ---------------------------------------------------------------------
create table if not exists public.workout_exercises (
  id             uuid primary key default gen_random_uuid(),
  workout_id     uuid not null references public.workouts (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  order_index    integer not null default 0 check (order_index >= 0),
  superset_group text,
  notes          text
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, order_index);
create index if not exists workout_exercises_exercise_idx
  on public.workout_exercises (exercise_id);

-- ---------------------------------------------------------------------
-- workout_sets  — one row per set. Never collapsed into JSON, because
-- progress tracking needs to query these.
-- ---------------------------------------------------------------------
create table if not exists public.workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number          integer not null check (set_number between 1 and 100),
  set_type            text not null default 'normal' check (set_type in ('normal','warmup','drop','failure')),
  weight              numeric(7,2) check (weight >= 0),        -- kg
  reps                integer check (reps >= 0),
  duration_seconds    integer check (duration_seconds >= 0),
  rpe                 numeric(3,1) check (rpe >= 1 and rpe <= 10),
  completed           boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (workout_exercise_id, set_number)
);

create index if not exists workout_sets_parent_idx
  on public.workout_sets (workout_exercise_id, set_number);

-- ---------------------------------------------------------------------
-- personal_records
-- One row per (user, exercise, record_type). See 0003_functions.sql and
-- src/services/workouts.ts for the exact, deterministic PR rules.
-- ---------------------------------------------------------------------
create table if not exists public.personal_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  record_type  text not null check (record_type in
                 ('heaviest_weight','best_reps','best_volume','estimated_1rm')),
  value        numeric(10,2) not null check (value >= 0),
  weight       numeric(7,2) check (weight >= 0),
  reps         integer check (reps >= 0),
  workout_id   uuid references public.workouts (id) on delete set null,
  achieved_at  timestamptz not null default now(),
  unique (user_id, exercise_id, record_type)
);

create index if not exists personal_records_user_idx
  on public.personal_records (user_id, achieved_at desc);

-- ---------------------------------------------------------------------
-- body_measurements  — entirely optional for the user
-- ---------------------------------------------------------------------
create table if not exists public.body_measurements (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  measured_on         date not null default current_date,
  weight_kg           numeric(6,2) check (weight_kg > 0 and weight_kg < 700),
  body_fat_percentage numeric(4,1) check (body_fat_percentage >= 0 and body_fat_percentage <= 100),
  chest_cm            numeric(5,1) check (chest_cm > 0),
  waist_cm            numeric(5,1) check (waist_cm > 0),
  arms_cm             numeric(5,1) check (arms_cm > 0),
  thighs_cm           numeric(5,1) check (thighs_cm > 0),
  notes               text,
  created_at          timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index if not exists body_measurements_user_idx
  on public.body_measurements (user_id, measured_on desc);
