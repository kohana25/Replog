-- =====================================================================
-- RepLog — 0003_functions.sql
-- Read helpers + the personal-record rules.
--
-- Every function here is SECURITY INVOKER, so Row Level Security still
-- applies inside them: a user can only ever aggregate their own rows.
-- The explicit `auth.uid()` filters are belt-and-braces, not the only
-- line of defence.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Most recent completed performance of one exercise ("Previous: 60 × 10")
-- ---------------------------------------------------------------------
create or replace function public.get_previous_exercise_sets(p_exercise_id uuid)
returns table (
  workout_id       uuid,
  performed_at     timestamptz,
  set_number       integer,
  set_type         text,
  weight           numeric,
  reps             integer,
  duration_seconds integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with last_performance as (
    select we.id as workout_exercise_id, w.id as workout_id, w.completed_at
    from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.exercise_id = p_exercise_id
      and w.user_id = (select auth.uid())
      and w.status = 'completed'
    order by w.completed_at desc
    limit 1
  )
  select lp.workout_id,
         lp.completed_at,
         s.set_number,
         s.set_type,
         s.weight,
         s.reps,
         s.duration_seconds
  from last_performance lp
  join workout_sets s on s.workout_exercise_id = lp.workout_exercise_id
  where s.completed
  order by s.set_number;
$$;

-- ---------------------------------------------------------------------
-- Per-session history for one exercise (drives the exercise detail chart)
-- ---------------------------------------------------------------------
create or replace function public.get_exercise_history(
  p_exercise_id uuid,
  p_limit integer default 12
)
returns table (
  workout_id         uuid,
  workout_name       text,
  performed_at       timestamptz,
  set_count          integer,
  top_weight         numeric,
  top_reps           integer,
  total_volume       numeric,
  best_estimated_1rm numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select w.id,
         w.name,
         w.completed_at,
         count(s.id)::integer,
         max(s.weight),
         max(s.reps)::integer,
         coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0)), 0),
         max(
           case
             when s.weight > 0 and s.reps > 0
               then round(s.weight * (1 + s.reps / 30.0), 2)
             else null
           end
         )
  from workouts w
  join workout_exercises we on we.workout_id = w.id
  join workout_sets s on s.workout_exercise_id = we.id
  where w.user_id = (select auth.uid())
    and w.status = 'completed'
    and we.exercise_id = p_exercise_id
    and s.completed
  group by w.id, w.name, w.completed_at
  order by w.completed_at desc
  limit greatest(p_limit, 1);
$$;

-- ---------------------------------------------------------------------
-- Headline numbers for Home + Progress.
-- The streak is defined as: the number of consecutive calendar days
-- (in p_timezone) with at least one completed workout, counting back
-- from today — or from yesterday if nothing has been logged today yet.
-- ---------------------------------------------------------------------
create or replace function public.get_workout_overview(p_timezone text default 'UTC')
returns table (
  total_workouts        integer,
  total_sets            integer,
  total_volume          numeric,
  total_duration_seconds bigint,
  workouts_this_week    integer,
  current_streak_days   integer,
  last_workout_at       timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_today        date;
  v_streak       integer := 0;
  v_cursor       date;
  v_days         date[];
  v_tz           text := coalesce(nullif(p_timezone, ''), 'UTC');
begin
  -- guard against an invalid timezone string coming from a device
  begin
    v_today := (now() at time zone v_tz)::date;
  exception when others then
    v_tz := 'UTC';
    v_today := (now() at time zone v_tz)::date;
  end;

  -- Collected into an array rather than a temp table: this function is
  -- STABLE, so it is not allowed to write anything, not even temporarily.
  select coalesce(array_agg(distinct (w.completed_at at time zone v_tz)::date), '{}')
    into v_days
  from workouts w
  where w.user_id = (select auth.uid())
    and w.status = 'completed'
    and w.completed_at is not null;

  -- streak anchor: today if trained today, otherwise yesterday
  if v_today = any (v_days) then
    v_cursor := v_today;
  else
    v_cursor := v_today - 1;
  end if;

  while v_cursor = any (v_days) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return query
  with completed as (
    select w.id, w.completed_at, w.duration_seconds
    from workouts w
    where w.user_id = (select auth.uid())
      and w.status = 'completed'
  ),
  set_stats as (
    select count(s.id) as set_count,
           coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0)), 0) as volume
    from completed c
    join workout_exercises we on we.workout_id = c.id
    join workout_sets s on s.workout_exercise_id = we.id
    where s.completed
  )
  select (select count(*) from completed)::integer,
         (select set_count from set_stats)::integer,
         (select volume from set_stats),
         (select coalesce(sum(coalesce(duration_seconds, 0)), 0) from completed)::bigint,
         (select count(*) from completed
           where (completed_at at time zone v_tz)::date
                 >= v_today - ((extract(isodow from v_today)::integer) - 1))::integer,
         v_streak,
         (select max(completed_at) from completed);
end;
$$;

-- ---------------------------------------------------------------------
-- Weekly training volume, including weeks with no training (so charts
-- show the gaps honestly instead of compressing them away).
-- ---------------------------------------------------------------------
create or replace function public.get_volume_by_week(
  p_weeks integer default 8,
  p_timezone text default 'UTC'
)
returns table (
  week_start    date,
  total_volume  numeric,
  workout_count integer,
  set_count     integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select date_trunc('week', (now() at time zone coalesce(nullif(p_timezone, ''), 'UTC')))::date as this_week
  ),
  weeks as (
    select generate_series(
             (select this_week from bounds) - ((greatest(p_weeks, 1) - 1) * 7),
             (select this_week from bounds),
             '7 days'::interval
           )::date as week_start
  ),
  sessions as (
    select w.id,
           date_trunc('week', (w.completed_at at time zone coalesce(nullif(p_timezone, ''), 'UTC')))::date as week_start
    from workouts w
    where w.user_id = (select auth.uid())
      and w.status = 'completed'
      and w.completed_at is not null
  ),
  per_week as (
    select s.week_start,
           count(distinct s.id)::integer as workout_count,
           count(st.id)::integer as set_count,
           coalesce(sum(coalesce(st.weight, 0) * coalesce(st.reps, 0)), 0) as total_volume
    from sessions s
    left join workout_exercises we on we.workout_id = s.id
    left join workout_sets st on st.workout_exercise_id = we.id and st.completed
    group by s.week_start
  )
  select weeks.week_start,
         coalesce(per_week.total_volume, 0),
         coalesce(per_week.workout_count, 0),
         coalesce(per_week.set_count, 0)
  from weeks
  left join per_week on per_week.week_start = weeks.week_start
  order by weeks.week_start;
$$;

-- ---------------------------------------------------------------------
-- Which muscle groups have actually been trained recently
-- ---------------------------------------------------------------------
create or replace function public.get_muscle_distribution(p_days integer default 30)
returns table (
  primary_muscle text,
  set_count      integer,
  total_volume   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select e.primary_muscle,
         count(s.id)::integer,
         coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0)), 0)
  from workouts w
  join workout_exercises we on we.workout_id = w.id
  join exercises e on e.id = we.exercise_id
  join workout_sets s on s.workout_exercise_id = we.id
  where w.user_id = (select auth.uid())
    and w.status = 'completed'
    and s.completed
    and w.completed_at >= now() - (greatest(p_days, 1) || ' days')::interval
  group by e.primary_muscle
  order by count(s.id) desc;
$$;

-- ---------------------------------------------------------------------
-- PERSONAL RECORD RULES — deterministic, evaluated per exercise over the
-- completed sets of one finished workout:
--
--   heaviest_weight  max(weight)                 among sets with reps >= 1
--   best_reps        max(reps)                   among sets with reps >= 1
--   best_volume      max(weight * reps)          single-set volume
--   estimated_1rm    max(weight * (1 + reps/30)) Epley formula, 2 dp
--
-- A record is only written when the candidate is STRICTLY greater than the
-- stored value, so re-running this for the same workout is idempotent.
-- Returns the records that were actually beaten, for the summary screen.
-- ---------------------------------------------------------------------
create or replace function public.refresh_personal_records(p_workout_id uuid)
returns table (
  exercise_id    uuid,
  exercise_name  text,
  record_type    text,
  value          numeric,
  previous_value numeric
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
-- The RETURNS TABLE columns (exercise_id, record_type, value) share names
-- with real columns, which makes bare references inside the body ambiguous —
-- notably in the ON CONFLICT target. Resolve such references to the column.
#variable_conflict use_column
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Only ever touch a workout the caller owns and has finished.
  if not exists (
    select 1 from workouts w
    where w.id = p_workout_id
      and w.user_id = v_user_id
      and w.status = 'completed'
  ) then
    return;
  end if;

  return query
  with performed as (
    select we.exercise_id as ex_id,
           s.weight,
           s.reps,
           coalesce(s.weight, 0) * coalesce(s.reps, 0) as set_volume,
           case when s.weight > 0 and s.reps > 0
                then round(s.weight * (1 + s.reps / 30.0), 2) end as e1rm
    from workout_exercises we
    join workout_sets s on s.workout_exercise_id = we.id
    where we.workout_id = p_workout_id
      and s.completed
  ),
  metrics as (
    select ex_id, 'heaviest_weight'::text as rtype, weight as val, weight as w, reps as r
      from performed where reps >= 1 and weight is not null
    union all
    select ex_id, 'best_reps', reps::numeric, weight, reps
      from performed where reps >= 1
    union all
    select ex_id, 'best_volume', set_volume, weight, reps
      from performed where set_volume > 0
    union all
    select ex_id, 'estimated_1rm', e1rm, weight, reps
      from performed where e1rm is not null
  ),
  -- the single best set per (exercise, record type) carries the context
  unpivoted as (
    select distinct on (ex_id, rtype) ex_id, rtype, val, w, r
    from metrics
    order by ex_id, rtype, val desc
  ),
  existing as (
    select u.ex_id, u.rtype, u.val, u.w, u.r, pr.value as old_value
    from unpivoted u
    left join personal_records pr
      on pr.user_id = v_user_id
     and pr.exercise_id = u.ex_id
     and pr.record_type = u.rtype
  ),
  beaten as (
    select * from existing
    where old_value is null or val > old_value
  ),
  upserted as (
    insert into personal_records
      (user_id, exercise_id, record_type, value, weight, reps, workout_id, achieved_at)
    select v_user_id, b.ex_id, b.rtype, b.val, b.w, b.r, p_workout_id, now()
    from beaten b
    on conflict (user_id, exercise_id, record_type)
    do update set value = excluded.value,
                  weight = excluded.weight,
                  reps = excluded.reps,
                  workout_id = excluded.workout_id,
                  achieved_at = excluded.achieved_at
    returning personal_records.exercise_id, personal_records.record_type, personal_records.value
  )
  select up.exercise_id,
         e.name,
         up.record_type,
         up.value,
         b.old_value
  from upserted up
  join exercises e on e.id = up.exercise_id
  join beaten b on b.ex_id = up.exercise_id and b.rtype = up.record_type;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants: signed-in users only.
-- ---------------------------------------------------------------------
revoke all on function public.get_previous_exercise_sets(uuid) from public, anon;
revoke all on function public.get_exercise_history(uuid, integer) from public, anon;
revoke all on function public.get_workout_overview(text) from public, anon;
revoke all on function public.get_volume_by_week(integer, text) from public, anon;
revoke all on function public.get_muscle_distribution(integer) from public, anon;
revoke all on function public.refresh_personal_records(uuid) from public, anon;

grant execute on function public.get_previous_exercise_sets(uuid) to authenticated;
grant execute on function public.get_exercise_history(uuid, integer) to authenticated;
grant execute on function public.get_workout_overview(text) to authenticated;
grant execute on function public.get_volume_by_week(integer, text) to authenticated;
grant execute on function public.get_muscle_distribution(integer) to authenticated;
grant execute on function public.refresh_personal_records(uuid) to authenticated;
