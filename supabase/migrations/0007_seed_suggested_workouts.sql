-- =====================================================================
-- RepLog — 0007_seed_suggested_workouts.sql
-- 36 suggested routines: two for each of the 18 goal × experience pairs.
--
-- EXERCISES ARE REUSED, NEVER CREATED
--   Every exercise below is matched by name against the existing public
--   library seeded in 0004. Nothing is inserted into `exercises`, and a
--   name that does not resolve fails this migration rather than quietly
--   producing a shorter routine — see the LEFT JOIN and the assertions at
--   the end.
--
-- TARGETS FOLLOW THE EXERCISE TYPE
--   The workout screen shows load and reps for `strength` and `bodyweight`
--   exercises and a clock for `duration` and `cardio` ones, so routines
--   give "reps" to the former and "dur" (seconds) to the latter.
--
-- GUIDANCE, NOT PRESCRIPTION
--   `source_reference` names the public guidance a routine's shape is built
--   on. The routines are RepLog's own; no source text is reproduced, and
--   none of this is medical advice or a promise of a particular result.
--
-- Idempotent: keyed on `slug`, so re-running updates in place and never
-- duplicates. Nothing existing is modified or deleted.
-- =====================================================================

with data (slug, goal, level, name, description, duration, days, source, ord, exercises) as (
  values
  -- ---------------- BUILD MUSCLE ----------------
  ('bm-beg-1','build_muscle','beginner','Full-Body Muscle Starter A',
   'Five straightforward lifts covering the whole body. Stop each set with two or three reps still in the tank while you learn the movements.',
   35,3,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines for Americans (2nd ed.).',0,
   '[{"name":"Leg Press","sets":3,"reps":12,"rest":90},
     {"name":"Dumbbell Bench Press","sets":3,"reps":10,"rest":90},
     {"name":"Seated Cable Row","sets":3,"reps":12,"rest":90},
     {"name":"Seated Dumbbell Shoulder Press","sets":3,"reps":10,"rest":60},
     {"name":"Plank","sets":3,"dur":30,"rest":60}]'::jsonb),

  ('bm-beg-2','build_muscle','beginner','Full-Body Muscle Starter B',
   'The alternate day to Starter A. Bodyweight pressing and a machine pull, then a little direct arm work.',
   40,3,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines for Americans (2nd ed.).',1,
   '[{"name":"Walking Lunge","sets":3,"reps":10,"rest":90},
     {"name":"Push-Up","sets":3,"reps":10,"rest":60},
     {"name":"Lat Pulldown","sets":3,"reps":12,"rest":90},
     {"name":"Dumbbell Curl","sets":2,"reps":12,"rest":60},
     {"name":"Tricep Pushdown","sets":2,"reps":12,"rest":60},
     {"name":"Dead Bug","sets":3,"reps":10,"rest":45}]'::jsonb),

  ('bm-int-1','build_muscle','intermediate','Upper Body Hypertrophy',
   'Two heavy compound lifts first, then volume for chest, back and shoulders in the 8-15 rep range.',
   50,4,'Progressive muscle-strengthening across all major muscle groups, per ACE resistance-training guidance.',0,
   '[{"name":"Barbell Bench Press","sets":4,"reps":8,"rest":120},
     {"name":"Barbell Row","sets":4,"reps":8,"rest":120},
     {"name":"Incline Dumbbell Press","sets":3,"reps":10,"rest":90},
     {"name":"Chin-Up","sets":3,"reps":8,"rest":90},
     {"name":"Lateral Raise","sets":3,"reps":15,"rest":60},
     {"name":"Hammer Curl","sets":3,"reps":12,"rest":60}]'::jsonb),

  ('bm-int-2','build_muscle','intermediate','Lower Body Hypertrophy',
   'Squat and hinge first while you are fresh, then single-leg work and isolation to finish.',
   50,4,'Progressive muscle-strengthening across all major muscle groups, per ACE resistance-training guidance.',1,
   '[{"name":"Back Squat","sets":4,"reps":8,"rest":150},
     {"name":"Romanian Deadlift","sets":3,"reps":10,"rest":120},
     {"name":"Bulgarian Split Squat","sets":3,"reps":10,"rest":90},
     {"name":"Leg Curl","sets":3,"reps":12,"rest":60},
     {"name":"Standing Calf Raise","sets":4,"reps":15,"rest":45},
     {"name":"Cable Crunch","sets":3,"reps":15,"rest":60}]'::jsonb),

  ('bm-adv-1','build_muscle','advanced','Advanced Push Volume',
   'Heavier pressing at the front, then accumulated volume for chest, shoulders and triceps.',
   60,5,'Progressive overload across all major muscle groups, per ACE resistance-training guidance.',0,
   '[{"name":"Barbell Bench Press","sets":5,"reps":6,"rest":150},
     {"name":"Overhead Press","sets":4,"reps":8,"rest":120},
     {"name":"Incline Barbell Press","sets":4,"reps":10,"rest":90},
     {"name":"Chest Dip","sets":3,"reps":10,"rest":90},
     {"name":"Lateral Raise","sets":4,"reps":15,"rest":45},
     {"name":"Skull Crusher","sets":3,"reps":12,"rest":60}]'::jsonb),

  ('bm-adv-2','build_muscle','advanced','Advanced Pull & Legs Volume',
   'A heavy hinge and a heavy squat in one session. Leave a rep or two spare on the deadlift sets.',
   60,5,'Progressive overload across all major muscle groups, per ACE resistance-training guidance.',1,
   '[{"name":"Deadlift","sets":4,"reps":5,"rest":180},
     {"name":"Pull-Up","sets":4,"reps":8,"rest":120},
     {"name":"Front Squat","sets":4,"reps":8,"rest":150},
     {"name":"Barbell Row","sets":3,"reps":10,"rest":90},
     {"name":"Face Pull","sets":3,"reps":15,"rest":45},
     {"name":"Hanging Leg Raise","sets":3,"reps":12,"rest":60}]'::jsonb),

  -- ---------------- GAIN STRENGTH ----------------
  ('gs-beg-1','gain_strength','beginner','Strength Basics A',
   'Lower reps and longer rests than a muscle-building session, on machines and dumbbells while technique settles.',
   40,3,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines for Americans (2nd ed.).',0,
   '[{"name":"Leg Press","sets":3,"reps":8,"rest":120},
     {"name":"Dumbbell Bench Press","sets":3,"reps":8,"rest":120},
     {"name":"Seated Cable Row","sets":3,"reps":8,"rest":120},
     {"name":"Glute Bridge","sets":3,"reps":10,"rest":90},
     {"name":"Plank","sets":3,"dur":30,"rest":60}]'::jsonb),

  ('gs-beg-2','gain_strength','beginner','Strength Basics B',
   'The alternate day to Basics A, leading with a lunge and an overhead press.',
   40,3,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines for Americans (2nd ed.).',1,
   '[{"name":"Walking Lunge","sets":3,"reps":8,"rest":120},
     {"name":"Seated Dumbbell Shoulder Press","sets":3,"reps":8,"rest":120},
     {"name":"Lat Pulldown","sets":3,"reps":8,"rest":120},
     {"name":"Dumbbell Row","sets":3,"reps":8,"rest":90},
     {"name":"Dead Bug","sets":3,"reps":10,"rest":45}]'::jsonb),

  ('gs-int-1','gain_strength','intermediate','Squat & Press Strength',
   'Five sets of five on the two main lifts, with full rests. Add a small amount of load only once every set is clean.',
   55,4,'Progressive overload with full recovery between sets, per ACE strength-training guidance.',0,
   '[{"name":"Back Squat","sets":5,"reps":5,"rest":180},
     {"name":"Overhead Press","sets":5,"reps":5,"rest":150},
     {"name":"Barbell Row","sets":4,"reps":6,"rest":120},
     {"name":"Close-Grip Bench Press","sets":3,"reps":8,"rest":90},
     {"name":"Plank","sets":3,"dur":45,"rest":60}]'::jsonb),

  ('gs-int-2','gain_strength','intermediate','Hinge & Bench Strength',
   'The hinge and bench counterpart to Squat & Press. Keep the last rep of every set technically sound.',
   55,4,'Progressive overload with full recovery between sets, per ACE strength-training guidance.',1,
   '[{"name":"Romanian Deadlift","sets":5,"reps":5,"rest":180},
     {"name":"Barbell Bench Press","sets":5,"reps":5,"rest":180},
     {"name":"Chin-Up","sets":4,"reps":6,"rest":120},
     {"name":"Hip Thrust","sets":3,"reps":8,"rest":90},
     {"name":"Farmer''s Walk","sets":3,"dur":40,"rest":90}]'::jsonb),

  ('gs-adv-1','gain_strength','advanced','Advanced Squat & Deadlift',
   'Low reps on both main lifts with long rests. Demanding on recovery — do not run it alongside another heavy lower-body day.',
   65,4,'Progressive overload with full recovery between sets, per ACE strength-training guidance.',0,
   '[{"name":"Back Squat","sets":5,"reps":3,"rest":210},
     {"name":"Deadlift","sets":4,"reps":3,"rest":210},
     {"name":"Front Squat","sets":3,"reps":5,"rest":180},
     {"name":"Barbell Row","sets":3,"reps":6,"rest":120},
     {"name":"Hanging Leg Raise","sets":3,"reps":10,"rest":60}]'::jsonb),

  ('gs-adv-2','gain_strength','advanced','Advanced Press & Pull',
   'Heavy upper-body strength work, finishing with lighter pulling to balance the pressing volume.',
   65,4,'Progressive overload with full recovery between sets, per ACE strength-training guidance.',1,
   '[{"name":"Barbell Bench Press","sets":5,"reps":3,"rest":210},
     {"name":"Overhead Press","sets":4,"reps":4,"rest":180},
     {"name":"Pull-Up","sets":4,"reps":6,"rest":120},
     {"name":"Close-Grip Bench Press","sets":3,"reps":6,"rest":120},
     {"name":"Face Pull","sets":3,"reps":15,"rest":45}]'::jsonb),

  -- ---------------- LOSE WEIGHT ----------------
  ('lw-beg-1','lose_weight','beginner','Full Body & Steady Cardio',
   'Resistance work to keep muscle, then steady aerobic work. Training supports weight management alongside diet and sleep — it does not replace them.',
   35,3,'Combines muscle-strengthening with 150+ min of weekly moderate aerobic activity, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Leg Press","sets":2,"reps":12,"rest":60},
     {"name":"Push-Up","sets":2,"reps":10,"rest":60},
     {"name":"Seated Cable Row","sets":2,"reps":12,"rest":60},
     {"name":"Glute Bridge","sets":2,"reps":12,"rest":45},
     {"name":"Treadmill Run","sets":1,"dur":900,"rest":0,"note":"A brisk pace you could still hold a conversation at."}]'::jsonb),

  ('lw-beg-2','lose_weight','beginner','Low-Impact Circuit',
   'Easier on the joints: the bike opens the session, then light resistance work with short rests.',
   35,3,'Combines muscle-strengthening with moderate aerobic activity, per CDC adult physical activity guidance.',1,
   '[{"name":"Stationary Bike","sets":1,"dur":600,"rest":60},
     {"name":"Leg Press","sets":2,"reps":12,"rest":60},
     {"name":"Lat Pulldown","sets":2,"reps":12,"rest":60},
     {"name":"Dumbbell Bench Press","sets":2,"reps":12,"rest":60},
     {"name":"Glute Bridge","sets":2,"reps":15,"rest":45},
     {"name":"Plank","sets":2,"dur":30,"rest":45}]'::jsonb),

  ('lw-int-1','lose_weight','intermediate','Strength & Rower Intervals',
   'Compound lifts with short rests, finished with steady rowing.',
   45,4,'Combines muscle-strengthening with 150-300 min of weekly moderate aerobic activity, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Back Squat","sets":3,"reps":10,"rest":90},
     {"name":"Dumbbell Bench Press","sets":3,"reps":12,"rest":60},
     {"name":"Seated Cable Row","sets":3,"reps":12,"rest":60},
     {"name":"Walking Lunge","sets":3,"reps":12,"rest":60},
     {"name":"Rowing Machine","sets":1,"dur":600,"rest":60},
     {"name":"Russian Twist","sets":3,"reps":20,"rest":45}]'::jsonb),

  ('lw-int-2','lose_weight','intermediate','Kettlebell & Conditioning',
   'Swings and bodyweight work kept moving with short rests, then rope intervals.',
   45,4,'Combines muscle-strengthening with vigorous aerobic activity, per CDC adult physical activity guidance.',1,
   '[{"name":"Kettlebell Swing","sets":4,"reps":15,"rest":60},
     {"name":"Push-Up","sets":3,"reps":15,"rest":45},
     {"name":"Dumbbell Row","sets":3,"reps":12,"rest":60},
     {"name":"Bulgarian Split Squat","sets":3,"reps":10,"rest":60},
     {"name":"Jump Rope","sets":3,"dur":120,"rest":60},
     {"name":"Plank","sets":3,"dur":45,"rest":45}]'::jsonb),

  ('lw-adv-1','lose_weight','advanced','Advanced Metabolic Strength',
   'Heavier compounds with deliberately short rests, then swings, burpees and a rowing finish.',
   55,5,'Combines muscle-strengthening with 150-300 min of weekly aerobic activity, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Front Squat","sets":4,"reps":8,"rest":90},
     {"name":"Barbell Row","sets":4,"reps":10,"rest":75},
     {"name":"Chest Dip","sets":3,"reps":12,"rest":60},
     {"name":"Kettlebell Swing","sets":4,"reps":20,"rest":60},
     {"name":"Burpee","sets":3,"reps":12,"rest":60},
     {"name":"Rowing Machine","sets":1,"dur":720,"rest":60}]'::jsonb),

  ('lw-adv-2','lose_weight','advanced','Advanced Full Body Conditioning',
   'A heavy hinge to open, then pressing, pulling and rope intervals. High demand — keep one easy day either side of it.',
   55,5,'Combines muscle-strengthening with vigorous aerobic activity, per CDC adult physical activity guidance.',1,
   '[{"name":"Deadlift","sets":4,"reps":6,"rest":150},
     {"name":"Overhead Press","sets":3,"reps":10,"rest":75},
     {"name":"Pull-Up","sets":3,"reps":8,"rest":90},
     {"name":"Walking Lunge","sets":3,"reps":14,"rest":60},
     {"name":"Burpee","sets":4,"reps":10,"rest":45},
     {"name":"Jump Rope","sets":4,"dur":120,"rest":45}]'::jsonb),

  -- ---------------- IMPROVE FITNESS ----------------
  ('if-beg-1','improve_fitness','beginner','Cardio & Strength Intro',
   'A short aerobic block followed by four basic lifts — the two halves of general fitness in one session.',
   35,3,'Aerobic activity plus muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Stationary Bike","sets":1,"dur":600,"rest":60},
     {"name":"Leg Press","sets":2,"reps":12,"rest":60},
     {"name":"Push-Up","sets":2,"reps":10,"rest":60},
     {"name":"Seated Cable Row","sets":2,"reps":12,"rest":60},
     {"name":"Plank","sets":2,"dur":30,"rest":45}]'::jsonb),

  ('if-beg-2','improve_fitness','beginner','Walk, Lift, Brace',
   'Treadmill work at an easy pace, then lower body, back, shoulders and core.',
   35,3,'Aerobic activity plus muscle-strengthening on 2+ days a week, per CDC adult physical activity guidance.',1,
   '[{"name":"Treadmill Run","sets":1,"dur":720,"rest":60,"note":"Walk or jog — pick the pace you can repeat next session."},
     {"name":"Walking Lunge","sets":2,"reps":12,"rest":60},
     {"name":"Lat Pulldown","sets":2,"reps":12,"rest":60},
     {"name":"Seated Dumbbell Shoulder Press","sets":2,"reps":10,"rest":60},
     {"name":"Glute Bridge","sets":2,"reps":15,"rest":45},
     {"name":"Dead Bug","sets":2,"reps":12,"rest":45}]'::jsonb),

  ('if-int-1','improve_fitness','intermediate','Mixed Conditioning A',
   'Row first, lift second, finish with burpees — aerobic base, strength and work capacity together.',
   45,4,'Aerobic activity plus muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Rowing Machine","sets":1,"dur":600,"rest":60},
     {"name":"Back Squat","sets":3,"reps":10,"rest":90},
     {"name":"Dumbbell Bench Press","sets":3,"reps":10,"rest":75},
     {"name":"Barbell Row","sets":3,"reps":10,"rest":75},
     {"name":"Burpee","sets":3,"reps":10,"rest":60},
     {"name":"Plank","sets":3,"dur":45,"rest":45}]'::jsonb),

  ('if-int-2','improve_fitness','intermediate','Mixed Conditioning B',
   'Rope intervals to start, a hinge and a vertical pull, then swings for conditioning.',
   45,4,'Aerobic activity plus muscle-strengthening on 2+ days a week, per CDC adult physical activity guidance.',1,
   '[{"name":"Jump Rope","sets":3,"dur":120,"rest":45},
     {"name":"Romanian Deadlift","sets":3,"reps":10,"rest":90},
     {"name":"Chin-Up","sets":3,"reps":8,"rest":90},
     {"name":"Arnold Press","sets":3,"reps":10,"rest":75},
     {"name":"Kettlebell Swing","sets":3,"reps":15,"rest":60},
     {"name":"Russian Twist","sets":3,"reps":20,"rest":45}]'::jsonb),

  ('if-adv-1','improve_fitness','advanced','Advanced Work Capacity A',
   'A longer aerobic block, heavier compounds and a burpee finisher.',
   55,5,'Aerobic activity plus muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Rowing Machine","sets":1,"dur":900,"rest":60},
     {"name":"Front Squat","sets":4,"reps":8,"rest":120},
     {"name":"Pull-Up","sets":4,"reps":8,"rest":90},
     {"name":"Chest Dip","sets":3,"reps":12,"rest":75},
     {"name":"Burpee","sets":4,"reps":12,"rest":45},
     {"name":"Hanging Leg Raise","sets":3,"reps":12,"rest":60}]'::jsonb),

  ('if-adv-2','improve_fitness','advanced','Advanced Work Capacity B',
   'Twenty minutes of running, then a heavy hinge, pressing and a loaded carry.',
   55,5,'Aerobic activity plus muscle-strengthening on 2+ days a week, per CDC adult physical activity guidance.',1,
   '[{"name":"Treadmill Run","sets":1,"dur":1200,"rest":60},
     {"name":"Deadlift","sets":4,"reps":5,"rest":150},
     {"name":"Overhead Press","sets":4,"reps":8,"rest":90},
     {"name":"Barbell Row","sets":4,"reps":10,"rest":75},
     {"name":"Kettlebell Swing","sets":4,"reps":20,"rest":45},
     {"name":"Farmer''s Walk","sets":3,"dur":45,"rest":60}]'::jsonb),

  -- ---------------- MAINTAIN FITNESS ----------------
  ('mf-beg-1','maintain_fitness','beginner','Steady Full Body A',
   'Two sets per lift, twice a week — enough to hold onto what you have without dominating your week.',
   30,2,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Leg Press","sets":2,"reps":12,"rest":75},
     {"name":"Dumbbell Bench Press","sets":2,"reps":12,"rest":75},
     {"name":"Seated Cable Row","sets":2,"reps":12,"rest":75},
     {"name":"Glute Bridge","sets":2,"reps":12,"rest":45},
     {"name":"Plank","sets":2,"dur":30,"rest":45}]'::jsonb),

  ('mf-beg-2','maintain_fitness','beginner','Steady Full Body B',
   'The alternate session to Steady A, so the two together cover everything across a week.',
   30,2,'Muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',1,
   '[{"name":"Walking Lunge","sets":2,"reps":10,"rest":75},
     {"name":"Push-Up","sets":2,"reps":10,"rest":60},
     {"name":"Lat Pulldown","sets":2,"reps":12,"rest":75},
     {"name":"Lateral Raise","sets":2,"reps":12,"rest":45},
     {"name":"Dead Bug","sets":2,"reps":12,"rest":45}]'::jsonb),

  ('mf-int-1','maintain_fitness','intermediate','Balanced Maintenance A',
   'One squat, one press, one pull, plus a short aerobic block. Repeatable indefinitely.',
   40,3,'Muscle-strengthening plus regular aerobic activity, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Back Squat","sets":3,"reps":8,"rest":120},
     {"name":"Dumbbell Bench Press","sets":3,"reps":10,"rest":90},
     {"name":"Barbell Row","sets":3,"reps":10,"rest":90},
     {"name":"Seated Dumbbell Shoulder Press","sets":2,"reps":12,"rest":60},
     {"name":"Stationary Bike","sets":1,"dur":600,"rest":60},
     {"name":"Plank","sets":2,"dur":45,"rest":45}]'::jsonb),

  ('mf-int-2','maintain_fitness','intermediate','Balanced Maintenance B',
   'Hinge, incline press and a vertical pull, with rowing to close.',
   40,3,'Muscle-strengthening plus regular aerobic activity, per CDC adult physical activity guidance.',1,
   '[{"name":"Romanian Deadlift","sets":3,"reps":8,"rest":120},
     {"name":"Incline Dumbbell Press","sets":3,"reps":10,"rest":90},
     {"name":"Chin-Up","sets":3,"reps":8,"rest":90},
     {"name":"Hip Thrust","sets":3,"reps":10,"rest":75},
     {"name":"Rowing Machine","sets":1,"dur":480,"rest":60},
     {"name":"Russian Twist","sets":2,"reps":20,"rest":45}]'::jsonb),

  ('mf-adv-1','maintain_fitness','advanced','Advanced Maintenance A',
   'Enough load to hold a high level of strength on three sessions a week, without the volume of a building block.',
   50,3,'Muscle-strengthening plus regular aerobic activity, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Back Squat","sets":4,"reps":6,"rest":150},
     {"name":"Barbell Bench Press","sets":4,"reps":6,"rest":150},
     {"name":"Pull-Up","sets":3,"reps":8,"rest":90},
     {"name":"Overhead Press","sets":3,"reps":8,"rest":90},
     {"name":"Rowing Machine","sets":1,"dur":600,"rest":60},
     {"name":"Hanging Leg Raise","sets":3,"reps":10,"rest":60}]'::jsonb),

  ('mf-adv-2','maintain_fitness','advanced','Advanced Maintenance B',
   'The hinge-led counterpart, with rope work and a carry to keep conditioning ticking over.',
   50,3,'Muscle-strengthening plus regular aerobic activity, per CDC adult physical activity guidance.',1,
   '[{"name":"Deadlift","sets":4,"reps":5,"rest":180},
     {"name":"Incline Barbell Press","sets":4,"reps":8,"rest":120},
     {"name":"Barbell Row","sets":4,"reps":8,"rest":90},
     {"name":"Bulgarian Split Squat","sets":3,"reps":10,"rest":75},
     {"name":"Jump Rope","sets":3,"dur":120,"rest":45},
     {"name":"Farmer''s Walk","sets":3,"dur":45,"rest":60}]'::jsonb),

  -- ---------------- GENERAL WELLNESS ----------------
  ('gw-beg-1','general_wellness','beginner','Gentle Start A',
   'Short, low-impact and easy to repeat: a bike block, two light lifts, posture work and core.',
   25,3,'Some activity is better than none, and muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Stationary Bike","sets":1,"dur":600,"rest":60},
     {"name":"Glute Bridge","sets":2,"reps":12,"rest":45},
     {"name":"Resistance Band Pull-Apart","sets":2,"reps":15,"rest":45},
     {"name":"Seated Dumbbell Shoulder Press","sets":2,"reps":10,"rest":60},
     {"name":"Dead Bug","sets":2,"reps":10,"rest":45}]'::jsonb),

  ('gw-beg-2','general_wellness','beginner','Gentle Start B',
   'The alternate gentle day — ten easy minutes on the treadmill, then three simple lifts and a plank.',
   25,3,'Some activity is better than none, per CDC adult physical activity guidance.',1,
   '[{"name":"Treadmill Run","sets":1,"dur":600,"rest":60,"note":"Walking pace is fine — consistency matters more than speed."},
     {"name":"Leg Press","sets":2,"reps":12,"rest":60},
     {"name":"Lat Pulldown","sets":2,"reps":12,"rest":60},
     {"name":"Push-Up","sets":2,"reps":8,"rest":60},
     {"name":"Plank","sets":2,"dur":20,"rest":45}]'::jsonb),

  ('gw-int-1','general_wellness','intermediate','Everyday Strength A',
   'Strength that carries into ordinary life — squat, press, row — with an aerobic opener and shoulder health work.',
   35,3,'Aerobic activity plus muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Stationary Bike","sets":1,"dur":600,"rest":60},
     {"name":"Back Squat","sets":3,"reps":10,"rest":90},
     {"name":"Dumbbell Bench Press","sets":3,"reps":10,"rest":75},
     {"name":"Seated Cable Row","sets":3,"reps":12,"rest":75},
     {"name":"Face Pull","sets":2,"reps":15,"rest":45},
     {"name":"Plank","sets":3,"dur":40,"rest":45}]'::jsonb),

  ('gw-int-2','general_wellness','intermediate','Everyday Strength B',
   'Hinge, incline press and rowing — the movements that keep a back and hips comfortable day to day.',
   35,3,'Aerobic activity plus muscle-strengthening on 2+ days a week, per CDC adult physical activity guidance.',1,
   '[{"name":"Rowing Machine","sets":1,"dur":480,"rest":60},
     {"name":"Romanian Deadlift","sets":3,"reps":10,"rest":90},
     {"name":"Incline Dumbbell Press","sets":3,"reps":10,"rest":75},
     {"name":"Dumbbell Row","sets":3,"reps":12,"rest":75},
     {"name":"Hip Thrust","sets":3,"reps":12,"rest":60},
     {"name":"Russian Twist","sets":2,"reps":16,"rest":45}]'::jsonb),

  ('gw-adv-1','general_wellness','advanced','Well-Rounded Advanced A',
   'Strength, aerobic work and shoulder health in one session, at a level that keeps an experienced lifter honest without wrecking the week.',
   45,4,'Aerobic activity plus muscle-strengthening on 2+ days a week, per the U.S. HHS Physical Activity Guidelines (2nd ed.).',0,
   '[{"name":"Rowing Machine","sets":1,"dur":600,"rest":60},
     {"name":"Front Squat","sets":4,"reps":8,"rest":120},
     {"name":"Pull-Up","sets":3,"reps":8,"rest":90},
     {"name":"Overhead Press","sets":3,"reps":10,"rest":90},
     {"name":"Face Pull","sets":3,"reps":15,"rest":45},
     {"name":"Hanging Leg Raise","sets":3,"reps":10,"rest":60}]'::jsonb),

  ('gw-adv-2','general_wellness','advanced','Well-Rounded Advanced B',
   'Rope intervals, a moderate hinge, pressing and a carry — broad coverage rather than a single emphasis.',
   45,4,'Aerobic activity plus muscle-strengthening on 2+ days a week, per CDC adult physical activity guidance.',1,
   '[{"name":"Jump Rope","sets":3,"dur":120,"rest":45},
     {"name":"Deadlift","sets":3,"reps":6,"rest":150},
     {"name":"Barbell Bench Press","sets":4,"reps":8,"rest":120},
     {"name":"Chin-Up","sets":3,"reps":8,"rest":90},
     {"name":"Bulgarian Split Squat","sets":3,"reps":10,"rest":75},
     {"name":"Farmer''s Walk","sets":3,"dur":45,"rest":60}]'::jsonb)
),

-- Upsert the routines themselves, keyed on the hand-written slug.
upserted as (
  insert into public.suggested_routines
    (slug, fitness_goal, experience_level, name, description,
     estimated_duration, days_per_week, source_reference, order_index)
  select slug, goal, level, name, description, duration, days, source, ord
  from data
  on conflict (slug) do update set
    fitness_goal       = excluded.fitness_goal,
    experience_level   = excluded.experience_level,
    name               = excluded.name,
    description        = excluded.description,
    estimated_duration = excluded.estimated_duration,
    days_per_week      = excluded.days_per_week,
    source_reference   = excluded.source_reference,
    order_index        = excluded.order_index
  returning id, slug
),

-- Flatten each routine's exercise array, keeping array position as the order.
items as (
  select
    u.id                             as routine_id,
    (item.ordinality - 1)::integer   as order_index,
    item.value ->> 'name'            as exercise_name,
    (item.value ->> 'sets')::integer as sets,
    (item.value ->> 'reps')::integer as target_reps,
    (item.value ->> 'dur')::integer  as target_duration,
    (item.value ->> 'rest')::integer as rest_seconds,
    item.value ->> 'note'            as notes
  from data d
  join upserted u on u.slug = d.slug
  cross join lateral jsonb_array_elements(d.exercises) with ordinality as item(value, ordinality)
)

-- LEFT JOIN on purpose: a name that does not match the existing library
-- yields a NULL exercise_id, which the NOT NULL column rejects and the whole
-- migration aborts. A typo can never silently shorten a routine.
insert into public.suggested_routine_exercises
  (suggested_routine_id, exercise_id, order_index, sets,
   target_reps, target_duration, rest_seconds, notes)
select
  i.routine_id, e.id, i.order_index, i.sets,
  i.target_reps, i.target_duration, i.rest_seconds, i.notes
from items i
left join public.exercises e
  on lower(btrim(e.name)) = lower(btrim(i.exercise_name))
 and e.is_public
on conflict (suggested_routine_id, order_index) do update set
  exercise_id     = excluded.exercise_id,
  sets            = excluded.sets,
  target_reps     = excluded.target_reps,
  target_duration = excluded.target_duration,
  rest_seconds    = excluded.rest_seconds,
  notes           = excluded.notes;

-- ---------------------------------------------------------------------
-- Assertions — the seed is worthless if it is quietly incomplete.
-- ---------------------------------------------------------------------
do $$
declare
  v_routines   integer;
  v_pairs      integer;
  v_thin       text;
  v_mistargeted text;
begin
  select count(*) into v_routines from public.suggested_routines;
  if v_routines <> 36 then
    raise exception 'Expected 36 suggested routines, found %', v_routines;
  end if;

  -- All 18 goal x level pairs present, each with exactly two routines.
  select count(*) into v_pairs
  from (
    select fitness_goal, experience_level
    from public.suggested_routines
    group by fitness_goal, experience_level
    having count(*) = 2
  ) ok;
  if v_pairs <> 18 then
    raise exception 'Expected 18 goal/experience pairs with 2 routines each, found %', v_pairs;
  end if;

  -- Every routine kept all of its exercises through the name match.
  select string_agg(slug, ', ') into v_thin
  from (
    select r.slug
    from public.suggested_routines r
    join public.suggested_routine_exercises x on x.suggested_routine_id = r.id
    group by r.slug
    having count(*) < 5
  ) thin;
  if v_thin is not null then
    raise exception 'Routines with fewer than 5 exercises (an exercise name failed to match): %', v_thin;
  end if;

  -- Reps belong to strength/bodyweight, seconds to duration/cardio.
  select string_agg(distinct r.slug, ', ') into v_mistargeted
  from public.suggested_routine_exercises x
  join public.suggested_routines r on r.id = x.suggested_routine_id
  join public.exercises e on e.id = x.exercise_id
  where (e.exercise_type in ('duration','cardio') and x.target_duration is null)
     or (e.exercise_type in ('strength','bodyweight') and x.target_reps is null);
  if v_mistargeted is not null then
    raise exception 'Routines whose targets do not match the exercise type: %', v_mistargeted;
  end if;
end
$$;
