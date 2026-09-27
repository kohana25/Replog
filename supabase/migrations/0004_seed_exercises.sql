-- =====================================================================
-- RepLog — 0004_seed_exercises.sql
-- A curated starter library. Deliberately small: enough to build real
-- routines with, few enough to browse without a search engine.
-- These rows are public (is_public = true, created_by = null) and are
-- readable by every signed-in user but writable by none of them.
-- Re-running this migration is safe.
-- =====================================================================

create unique index if not exists exercises_public_name_uq
  on public.exercises (lower(btrim(name)))
  where is_public;

insert into public.exercises
  (is_public, created_by, name, description, exercise_type, equipment,
   primary_muscle, secondary_muscles, difficulty, instructions)
values
-- ---------------- Chest ----------------
(true, null, 'Barbell Bench Press', 'Flat barbell press — the standard horizontal push.', 'strength', 'barbell', 'chest', array['triceps','shoulders'], 'intermediate',
 'Lie flat with eyes under the bar. Grip slightly wider than shoulders, brace, lower to mid-chest with control, then press back up without flaring the elbows.'),
(true, null, 'Incline Barbell Press', 'Bench set to 30–45° to bias the upper chest.', 'strength', 'barbell', 'chest', array['shoulders','triceps'], 'intermediate',
 'Set the bench to roughly 30 degrees. Lower the bar to the upper chest and press up, keeping the shoulder blades pulled back.'),
(true, null, 'Dumbbell Bench Press', 'Dumbbell horizontal press with a longer range of motion.', 'strength', 'dumbbell', 'chest', array['triceps','shoulders'], 'beginner',
 'Press both dumbbells from chest level to arm''s length, keeping the wrists stacked over the elbows.'),
(true, null, 'Incline Dumbbell Press', 'Upper-chest press with free weights.', 'strength', 'dumbbell', 'chest', array['shoulders','triceps'], 'beginner',
 'On a 30-degree bench, press the dumbbells up and slightly together, then lower under control.'),
(true, null, 'Cable Chest Fly', 'Isolation movement for the chest through a wide arc.', 'strength', 'cable', 'chest', array['shoulders'], 'beginner',
 'With a soft elbow bend, bring both handles together in front of the chest, then open slowly.'),
(true, null, 'Push-Up', 'Bodyweight horizontal push.', 'bodyweight', 'bodyweight', 'chest', array['triceps','core','shoulders'], 'beginner',
 'Hands under the shoulders, body in one straight line. Lower the chest to just above the floor and press back up.'),
(true, null, 'Chest Dip', 'Dip with a forward lean to emphasise the chest.', 'bodyweight', 'bodyweight', 'chest', array['triceps','shoulders'], 'intermediate',
 'Lean the torso forward, lower until the upper arms are roughly parallel to the floor, then press up.'),

-- ---------------- Back ----------------
(true, null, 'Deadlift', 'Conventional barbell deadlift from the floor.', 'strength', 'barbell', 'back', array['glutes','legs','core'], 'advanced',
 'Bar over mid-foot. Hinge, take the slack out, then drive the floor away keeping the bar close to the legs and the spine neutral.'),
(true, null, 'Barbell Row', 'Bent-over horizontal pull.', 'strength', 'barbell', 'back', array['biceps','shoulders'], 'intermediate',
 'Hinge to about 45 degrees, pull the bar to the lower ribs, pause briefly and lower under control.'),
(true, null, 'Lat Pulldown', 'Vertical pull on the cable stack.', 'strength', 'cable', 'back', array['biceps'], 'beginner',
 'Pull the bar to the upper chest by driving the elbows down, then return slowly to a full stretch.'),
(true, null, 'Seated Cable Row', 'Horizontal cable pull.', 'strength', 'cable', 'back', array['biceps','shoulders'], 'beginner',
 'Sit tall, pull the handle to the navel while keeping the torso still, then extend the arms fully.'),
(true, null, 'Pull-Up', 'Bodyweight vertical pull, overhand grip.', 'bodyweight', 'bodyweight', 'back', array['biceps','core'], 'advanced',
 'From a dead hang, pull until the chin clears the bar, then lower all the way down.'),
(true, null, 'Chin-Up', 'Bodyweight vertical pull, underhand grip.', 'bodyweight', 'bodyweight', 'back', array['biceps'], 'intermediate',
 'Underhand grip about shoulder width. Pull the chest toward the bar and lower under control.'),
(true, null, 'Dumbbell Row', 'Single-arm supported row.', 'strength', 'dumbbell', 'back', array['biceps'], 'beginner',
 'Support one hand and knee on a bench. Row the dumbbell to the hip, keeping the shoulders square.'),
(true, null, 'Face Pull', 'Rear-delt and upper-back pull.', 'strength', 'cable', 'back', array['shoulders'], 'beginner',
 'Pull the rope toward the forehead, separating the hands and squeezing the shoulder blades together.'),

-- ---------------- Shoulders ----------------
(true, null, 'Overhead Press', 'Standing barbell press.', 'strength', 'barbell', 'shoulders', array['triceps','core'], 'intermediate',
 'Brace the midsection, press the bar overhead in a straight line, moving the head back slightly as it passes.'),
(true, null, 'Seated Dumbbell Shoulder Press', 'Supported vertical press.', 'strength', 'dumbbell', 'shoulders', array['triceps'], 'beginner',
 'Press the dumbbells overhead without letting the lower back arch, then lower to ear height.'),
(true, null, 'Lateral Raise', 'Side-delt isolation.', 'strength', 'dumbbell', 'shoulders', array[]::text[], 'beginner',
 'Raise the dumbbells out to the sides to shoulder height with a slight elbow bend. Lower slowly.'),
(true, null, 'Rear Delt Fly', 'Rear-delt isolation.', 'strength', 'dumbbell', 'shoulders', array['back'], 'beginner',
 'Hinge forward and raise the dumbbells out to the sides, leading with the elbows.'),
(true, null, 'Arnold Press', 'Rotating dumbbell shoulder press.', 'strength', 'dumbbell', 'shoulders', array['triceps'], 'intermediate',
 'Start with the palms facing you, rotate outward as you press overhead, then reverse on the way down.'),

-- ---------------- Biceps ----------------
(true, null, 'Barbell Curl', 'Standing biceps curl.', 'strength', 'barbell', 'biceps', array[]::text[], 'beginner',
 'Keep the elbows at the sides and curl the bar up without swinging the torso.'),
(true, null, 'Dumbbell Curl', 'Alternating or simultaneous curl.', 'strength', 'dumbbell', 'biceps', array[]::text[], 'beginner',
 'Curl with the palms facing up, pause at the top and lower slowly.'),
(true, null, 'Hammer Curl', 'Neutral-grip curl.', 'strength', 'dumbbell', 'biceps', array[]::text[], 'beginner',
 'Hold the dumbbells with palms facing each other and curl straight up.'),
(true, null, 'Preacher Curl', 'Supported curl over a pad.', 'strength', 'machine', 'biceps', array[]::text[], 'beginner',
 'Rest the upper arms on the pad and curl through a full range without lifting the elbows.'),
(true, null, 'Cable Curl', 'Constant-tension biceps curl.', 'strength', 'cable', 'biceps', array[]::text[], 'beginner',
 'Curl the bar or handle with the elbows fixed at the sides.'),

-- ---------------- Triceps ----------------
(true, null, 'Tricep Pushdown', 'Cable pushdown with bar or rope.', 'strength', 'cable', 'triceps', array[]::text[], 'beginner',
 'Keep the elbows pinned to the sides and extend the arms fully, then return under control.'),
(true, null, 'Overhead Tricep Extension', 'Long-head focused extension.', 'strength', 'dumbbell', 'triceps', array[]::text[], 'beginner',
 'Hold the weight overhead, lower behind the head by bending the elbows, then extend.'),
(true, null, 'Close-Grip Bench Press', 'Bench press with a narrow grip.', 'strength', 'barbell', 'triceps', array['chest','shoulders'], 'intermediate',
 'Grip about shoulder width, tuck the elbows and press, keeping the forearms vertical.'),
(true, null, 'Tricep Dip', 'Bodyweight dip with an upright torso.', 'bodyweight', 'bodyweight', 'triceps', array['chest','shoulders'], 'intermediate',
 'Stay upright, lower until the elbows reach about 90 degrees, then press back up.'),
(true, null, 'Skull Crusher', 'Lying triceps extension.', 'strength', 'barbell', 'triceps', array[]::text[], 'intermediate',
 'Lying flat, lower the bar toward the forehead by bending only the elbows, then extend.'),

-- ---------------- Legs ----------------
(true, null, 'Back Squat', 'Barbell squat with the bar on the upper back.', 'strength', 'barbell', 'legs', array['glutes','core'], 'intermediate',
 'Brace, sit down and back to at least parallel, then drive up through the whole foot.'),
(true, null, 'Front Squat', 'Barbell squat with the bar in the front rack.', 'strength', 'barbell', 'legs', array['core','glutes'], 'advanced',
 'Keep the elbows high and the torso upright throughout the squat.'),
(true, null, 'Leg Press', 'Machine-based compound leg push.', 'strength', 'machine', 'legs', array['glutes'], 'beginner',
 'Lower the sled until the knees reach roughly 90 degrees, then press without locking out hard.'),
(true, null, 'Romanian Deadlift', 'Hip hinge for the hamstrings.', 'strength', 'barbell', 'legs', array['glutes','back'], 'intermediate',
 'With soft knees, push the hips back and lower the bar along the legs until you feel a hamstring stretch.'),
(true, null, 'Bulgarian Split Squat', 'Rear-foot-elevated single-leg squat.', 'strength', 'dumbbell', 'legs', array['glutes','core'], 'intermediate',
 'Elevate the rear foot, lower straight down until the front thigh is parallel, then drive up.'),
(true, null, 'Walking Lunge', 'Alternating forward lunges.', 'strength', 'dumbbell', 'legs', array['glutes','core'], 'beginner',
 'Step forward and lower the back knee toward the floor, then step through into the next rep.'),
(true, null, 'Leg Extension', 'Quadriceps isolation.', 'strength', 'machine', 'legs', array[]::text[], 'beginner',
 'Extend the knees fully, pause at the top and lower slowly.'),
(true, null, 'Leg Curl', 'Hamstring isolation.', 'strength', 'machine', 'legs', array[]::text[], 'beginner',
 'Curl the pad toward the glutes and control the return.'),
(true, null, 'Standing Calf Raise', 'Calf isolation through a full range.', 'strength', 'machine', 'legs', array[]::text[], 'beginner',
 'Rise onto the toes as high as possible, pause, then lower into a deep stretch.'),

-- ---------------- Glutes ----------------
(true, null, 'Hip Thrust', 'Barbell glute bridge from a bench.', 'strength', 'barbell', 'glutes', array['legs'], 'intermediate',
 'With the upper back on a bench, drive the hips up until the torso is parallel to the floor and squeeze.'),
(true, null, 'Glute Bridge', 'Floor-based hip extension.', 'bodyweight', 'bodyweight', 'glutes', array['legs','core'], 'beginner',
 'Lying on your back with the knees bent, drive the hips up and squeeze at the top.'),
(true, null, 'Cable Kickback', 'Single-leg glute isolation.', 'strength', 'cable', 'glutes', array[]::text[], 'beginner',
 'Drive one leg back against the cable, keeping the lower back still.'),

-- ---------------- Core ----------------
(true, null, 'Plank', 'Isometric anti-extension hold.', 'duration', 'bodyweight', 'core', array['shoulders'], 'beginner',
 'Forearms under the shoulders, squeeze the glutes and hold a straight line from head to heels.'),
(true, null, 'Hanging Leg Raise', 'Hanging hip flexion.', 'bodyweight', 'bodyweight', 'core', array[]::text[], 'advanced',
 'From a hang, raise the legs without swinging, then lower with control.'),
(true, null, 'Cable Crunch', 'Weighted trunk flexion.', 'strength', 'cable', 'core', array[]::text[], 'beginner',
 'Kneel below the cable and crunch the ribs toward the hips, keeping the hips still.'),
(true, null, 'Russian Twist', 'Rotational core work.', 'bodyweight', 'bodyweight', 'core', array[]::text[], 'beginner',
 'Sitting with the feet off the floor, rotate the torso side to side under control.'),
(true, null, 'Dead Bug', 'Anti-extension core control drill.', 'bodyweight', 'bodyweight', 'core', array[]::text[], 'beginner',
 'Lying on your back, extend the opposite arm and leg while keeping the lower back flat.'),

-- ---------------- Cardio / Full body ----------------
(true, null, 'Treadmill Run', 'Steady or interval running.', 'cardio', 'machine', 'cardio', array['legs'], 'beginner',
 'Log total time; adjust speed and incline to match the session goal.'),
(true, null, 'Stationary Bike', 'Low-impact cardio.', 'cardio', 'machine', 'cardio', array['legs'], 'beginner',
 'Log total time and keep the cadence steady.'),
(true, null, 'Rowing Machine', 'Full-body cardio.', 'cardio', 'machine', 'cardio', array['back','legs'], 'beginner',
 'Drive with the legs, then the back, then the arms. Reverse the order on the recovery.'),
(true, null, 'Jump Rope', 'Skipping intervals.', 'cardio', 'other', 'cardio', array['legs'], 'beginner',
 'Stay on the balls of the feet with small, quick jumps.'),
(true, null, 'Burpee', 'Full-body conditioning movement.', 'bodyweight', 'bodyweight', 'full_body', array['chest','legs','core'], 'intermediate',
 'Drop to a push-up, return the feet under the hips and jump.'),
(true, null, 'Kettlebell Swing', 'Ballistic hip hinge.', 'strength', 'kettlebell', 'full_body', array['glutes','back','core'], 'intermediate',
 'Hike the bell back, then snap the hips forward to float it to chest height.'),
(true, null, 'Farmer''s Walk', 'Loaded carry.', 'duration', 'dumbbell', 'full_body', array['core','back'], 'beginner',
 'Walk tall with a heavy weight in each hand for the prescribed time or distance.'),
(true, null, 'Resistance Band Pull-Apart', 'Upper-back warm-up.', 'strength', 'resistance_band', 'back', array['shoulders'], 'beginner',
 'Hold the band at shoulder height and pull it apart until the arms are wide, then return slowly.')
on conflict do nothing;
