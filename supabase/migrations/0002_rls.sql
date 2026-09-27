-- =====================================================================
-- RepLog — 0002_rls.sql
-- Row Level Security. Ownership is ALWAYS derived from auth.uid(), never
-- from a user_id sent by the client.
--
-- Child tables (routine_exercises, workout_exercises, workout_sets) have
-- no user_id of their own; ownership is proven by walking up to the
-- parent row, so a user can never attach a set to somebody else's workout.
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_routines  enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.personal_records  enable row level security;
alter table public.body_measurements enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete policy: profiles are removed by the auth.users cascade only.

-- ---------------------------------------------------------------------
-- exercises
-- Public library rows are readable by any signed-in user. Custom
-- exercises are private to their creator and only the creator may edit.
-- ---------------------------------------------------------------------
drop policy if exists exercises_select_public_or_own on public.exercises;
create policy exercises_select_public_or_own on public.exercises
  for select to authenticated
  using (is_public or created_by = (select auth.uid()));

drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own on public.exercises
  for insert to authenticated
  -- a user may only create private exercises owned by themselves;
  -- seeding the public library is a migration/admin job.
  with check (created_by = (select auth.uid()) and is_public = false);

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()) and is_public = false);

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------
-- workout_routines
-- ---------------------------------------------------------------------
drop policy if exists routines_all_own on public.workout_routines;
create policy routines_all_own on public.workout_routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- routine_exercises — ownership via the parent routine
-- ---------------------------------------------------------------------
drop policy if exists routine_exercises_all_own on public.routine_exercises;
create policy routine_exercises_all_own on public.routine_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_exercises.routine_id
        and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_routines r
      where r.id = routine_exercises.routine_id
        and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------
drop policy if exists workouts_all_own on public.workouts;
create policy workouts_all_own on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- workout_exercises — ownership via the parent workout
-- ---------------------------------------------------------------------
drop policy if exists workout_exercises_all_own on public.workout_exercises;
create policy workout_exercises_all_own on public.workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- workout_sets — ownership via workout_exercise -> workout
-- ---------------------------------------------------------------------
drop policy if exists workout_sets_all_own on public.workout_sets;
create policy workout_sets_all_own on public.workout_sets
  for all to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- personal_records
-- ---------------------------------------------------------------------
drop policy if exists personal_records_all_own on public.personal_records;
create policy personal_records_all_own on public.personal_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- body_measurements
-- ---------------------------------------------------------------------
drop policy if exists body_measurements_all_own on public.body_measurements;
create policy body_measurements_all_own on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Anonymous users get nothing at all.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.exercises, public.workout_routines,
              public.routine_exercises, public.workouts, public.workout_exercises,
              public.workout_sets, public.personal_records, public.body_measurements
  from anon;
