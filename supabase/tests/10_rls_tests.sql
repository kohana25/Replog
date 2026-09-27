-- =====================================================================
-- Verification: RLS isolation + the stats/PR functions.
-- Run after the four migrations. Every check prints PASS or FAIL.
-- =====================================================================

\set QUIET on
\set ON_ERROR_STOP on
\pset footer off

\set ana  '11111111-1111-1111-1111-111111111111'
\set ben  '22222222-2222-2222-2222-222222222222'
\set r_a  'aaaaaaaa-0000-0000-0000-00000000r001'
\set w_a  'aaaaaaaa-0000-0000-0000-00000000w001'
\set we_a 'aaaaaaaa-0000-0000-0000-0000000we001'

-- Two accounts. The handle_new_user trigger should create both profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.com', '{"full_name":"Ana Cruz"}'),
  ('22222222-2222-2222-2222-222222222222', 'ben@test.com', '{"full_name":"Ben Diaz"}');

\echo '=== 1. Sign-up trigger ==='
select case when count(*) = 2 then 'PASS' else 'FAIL' end as result,
       'profiles auto-created for both users' as check,
       count(*) as found
from public.profiles;

select case when full_name = 'Ana Cruz' then 'PASS' else 'FAIL' end as result,
       'full_name carried from sign-up metadata' as check,
       full_name
from public.profiles where user_id = '11111111-1111-1111-1111-111111111111';

--------------------------------------------------------------------
-- Ana logs a workout
--------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.workout_routines (id, user_id, name)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', auth.uid(), 'Push Day');

insert into public.workouts (id, user_id, name, status, started_at, completed_at, duration_seconds)
values ('aaaaaaaa-0000-0000-0000-0000000000b1', auth.uid(), 'Push Day', 'completed',
        now() - interval '50 minutes', now(), 3000);

insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
select 'aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000b1', id, 0
from public.exercises where name = 'Barbell Bench Press';

insert into public.workout_sets (workout_exercise_id, set_number, weight, reps, completed) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 1, 60, 10, true),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 2, 60, 9,  true),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 3, 65, 6,  true);

\echo ''
\echo '=== 2. Ana sees her own data ==='
select case when count(*) = 1 then 'PASS' else 'FAIL' end as result,
       'Ana sees her routine' as check, count(*) from public.workout_routines;
select case when count(*) = 3 then 'PASS' else 'FAIL' end as result,
       'Ana sees her 3 sets' as check, count(*) from public.workout_sets;

--------------------------------------------------------------------
-- Ben must not see or touch any of it
--------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 3. Cross-user isolation (the important one) ==='
select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot SELECT Ana''s routines' as check, count(*) from public.workout_routines;

select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot SELECT Ana''s workouts' as check, count(*) from public.workouts;

select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot SELECT Ana''s workout_exercises' as check, count(*) from public.workout_exercises;

select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot SELECT Ana''s sets' as check, count(*) from public.workout_sets;

select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot SELECT Ana''s profile' as check, count(*)
from public.profiles where user_id = '11111111-1111-1111-1111-111111111111';

-- UPDATE silently affects zero rows rather than erroring, which is correct:
-- the row is invisible to him in the first place.
with attempted as (
  update public.workout_routines set name = 'Hijacked' returning 1
)
select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot UPDATE Ana''s routines' as check, count(*) from attempted;

with attempted as (
  delete from public.workouts returning 1
)
select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       'Ben cannot DELETE Ana''s workouts' as check, count(*) from attempted;

-- Writing a child row into Ana's workout must be actively rejected.
do $$
begin
  insert into public.workout_sets (workout_exercise_id, set_number, weight, reps, completed)
  values ('aaaaaaaa-0000-0000-0000-0000000000c1', 9, 999, 1, true);
  raise notice 'FAIL | Ben INSERTED a set into Ana''s workout';
exception
  when insufficient_privilege then
    raise notice 'PASS | Ben blocked from inserting a set into Ana''s workout';
  when others then
    raise notice 'PASS | Ben blocked (%)', sqlerrm;
end
$$;

-- Nor may he forge a workout that claims to belong to Ana.
do $$
begin
  insert into public.workouts (user_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'Forged');
  raise notice 'FAIL | Ben forged a workout owned by Ana';
exception
  when insufficient_privilege then
    raise notice 'PASS | Ben blocked from forging a workout under Ana''s user_id';
end
$$;

\echo ''
\echo '=== 4. Shared exercise library is readable by everyone ==='
select case when count(*) = 55 then 'PASS' else 'FAIL' end as result,
       'Ben can read the public library' as check, count(*)
from public.exercises where is_public;

-- but he cannot inject rows into it
do $$
begin
  insert into public.exercises (created_by, is_public, name, primary_muscle)
  values (auth.uid(), true, 'Fake Public Exercise', 'chest');
  raise notice 'FAIL | Ben inserted into the public library';
exception
  when insufficient_privilege then
    raise notice 'PASS | Ben blocked from inserting a public exercise';
end
$$;

--------------------------------------------------------------------
-- Personal records
--------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '=== 5. Personal records ==='
select case when count(*) = 4 then 'PASS' else 'FAIL' end as result,
       'first workout sets 4 record types' as check, count(*)
from public.refresh_personal_records('aaaaaaaa-0000-0000-0000-0000000000b1');

select case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
       're-running the same workout is idempotent' as check, count(*)
from public.refresh_personal_records('aaaaaaaa-0000-0000-0000-0000000000b1');

select case when value = 65 then 'PASS' else 'FAIL' end as result,
       'heaviest_weight = 65' as check, value
from public.personal_records where record_type = 'heaviest_weight';

-- Epley on the best set: 60 x 10 -> 80.00 beats 65 x 6 -> 78.00
select case when value = 80.00 then 'PASS' else 'FAIL' end as result,
       'estimated_1rm = 80.00 (Epley, best set)' as check, value
from public.personal_records where record_type = 'estimated_1rm';

-- A heavier session later should beat the stored record and report the old one.
insert into public.workouts (id, user_id, name, status, started_at, completed_at, duration_seconds)
values ('aaaaaaaa-0000-0000-0000-0000000000b2', auth.uid(), 'Push Day', 'completed',
        now() - interval '1 day' - interval '45 minutes', now() - interval '1 day', 2700);

insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
select 'aaaaaaaa-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-0000000000b2', id, 0
from public.exercises where name = 'Barbell Bench Press';

insert into public.workout_sets (workout_exercise_id, set_number, weight, reps, completed)
values ('aaaaaaaa-0000-0000-0000-0000000000c2', 1, 70, 8, true);

select case when previous_value = 65 and value = 70 then 'PASS' else 'FAIL' end as result,
       'new heaviest_weight reports the previous best' as check, previous_value, value
from public.refresh_personal_records('aaaaaaaa-0000-0000-0000-0000000000b2')
where record_type = 'heaviest_weight';

--------------------------------------------------------------------
-- Stats functions
--------------------------------------------------------------------
\echo ''
\echo '=== 6. Stats functions ==='
select case when total_workouts = 2 and total_sets = 4 then 'PASS' else 'FAIL' end as result,
       'overview counts only Ana''s completed work' as check,
       total_workouts, total_sets, total_volume, current_streak_days
from public.get_workout_overview('UTC');

-- 60*10 + 60*9 + 65*6 + 70*8 = 600 + 540 + 390 + 560 = 2090
select case when total_volume = 2090 then 'PASS' else 'FAIL' end as result,
       'total volume = 2090' as check, total_volume
from public.get_workout_overview('UTC');

select case when current_streak_days = 2 then 'PASS' else 'FAIL' end as result,
       'streak counts today + yesterday' as check, current_streak_days
from public.get_workout_overview('UTC');

-- The 3-set session is dated now(); the 1-set session is dated yesterday,
-- so "previous" must resolve to the 3-set one.
select case when count(*) = 3 then 'PASS' else 'FAIL' end as result,
       'previous sets come from the most recent session' as check, count(*)
from public.get_previous_exercise_sets(
  (select id from public.exercises where name = 'Barbell Bench Press'));

select case when count(*) = 1 then 'PASS' else 'FAIL' end as result,
       'previous sets all come from a single workout' as check, count(*)
from (
  select distinct workout_id
  from public.get_previous_exercise_sets(
    (select id from public.exercises where name = 'Barbell Bench Press'))
) as sessions;

select case when count(*) = 2 then 'PASS' else 'FAIL' end as result,
       'exercise history returns both sessions' as check, count(*)
from public.get_exercise_history(
  (select id from public.exercises where name = 'Barbell Bench Press'), 12);

select case when count(*) = 8 then 'PASS' else 'FAIL' end as result,
       'weekly volume pads empty weeks' as check, count(*)
from public.get_volume_by_week(8, 'UTC');

-- Ben's stats must be empty even though Ana has data.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select case when total_workouts = 0 and total_volume = 0 then 'PASS' else 'FAIL' end as result,
       'Ben''s overview is empty (no leakage through functions)' as check,
       total_workouts, total_volume
from public.get_workout_overview('UTC');

reset role;
