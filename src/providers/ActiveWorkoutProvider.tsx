import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { dataErrorMessage } from '@/lib/validation';
import { getPreviousSetsForMany } from '@/services/exercises';
import { saveWorkout, type SaveWorkoutResult } from '@/services/workouts';
import type { ExerciseType, PreviousSetRow, SetType, UUID } from '@/types/database';
import type {
  ActiveWorkoutDraft,
  DraftExercise,
  DraftSet,
  PlannedExercise,
  RestTimerState,
  RoutineWithExercises,
  SuggestedRoutineWithExercises,
  SyncStatus,
} from '@/types/models';
import { useAuth } from './AuthProvider';
import { useSettings } from './SettingsProvider';

/**
 * The in-progress workout.
 *
 * Everything here is local: typing a weight must never wait on a round trip.
 * The draft is mirrored to AsyncStorage on every change so that force-quitting
 * the app, taking a call, or accidentally navigating away does not lose the
 * session. It is written to Supabase exactly once, on Finish.
 */

const DRAFT_KEY = 'replog.activeWorkout.v1';

interface PersistedState {
  draft: ActiveWorkoutDraft | null;
  restTimer: RestTimerState;
}

const NO_REST: RestTimerState = {
  endsAt: null,
  totalSeconds: 0,
  pausedRemaining: null,
  label: null,
};

function localId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySet(setNumber: number, setType: SetType = 'normal'): DraftSet {
  return {
    localId: localId(),
    setNumber,
    setType,
    weight: null,
    reps: null,
    durationSeconds: null,
    rpe: null,
    completed: false,
  };
}

function renumber(sets: DraftSet[]): DraftSet[] {
  return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

export interface AddExerciseInput {
  exerciseId: UUID;
  name: string;
  exerciseType: ExerciseType;
  restSeconds?: number;
  initialSets?: number;
  targetReps?: number | null;
  targetWeight?: number | null;
  targetDuration?: number | null;
  notes?: string | null;
}

interface ActiveWorkoutContextValue {
  draft: ActiveWorkoutDraft | null;
  hasActiveWorkout: boolean;
  /** True until the stored draft has been read on launch. */
  isRestoring: boolean;
  syncStatus: SyncStatus;
  saveError: string | null;
  restTimer: RestTimerState;
  previousSets: Record<UUID, PreviousSetRow[]>;

  startEmptyWorkout: (name?: string) => void;
  startFromRoutine: (routine: RoutineWithExercises) => void;
  /** Start straight from a suggestion, without saving it as a routine. */
  startFromSuggestedRoutine: (routine: SuggestedRoutineWithExercises) => void;
  addExercises: (exercises: AddExerciseInput[]) => void;
  removeExercise: (exerciseLocalId: string) => void;
  moveExercise: (exerciseLocalId: string, direction: -1 | 1) => void;
  setExerciseNotes: (exerciseLocalId: string, notes: string) => void;

  addSet: (exerciseLocalId: string) => void;
  removeSet: (exerciseLocalId: string, setLocalId: string) => void;
  updateSet: (exerciseLocalId: string, setLocalId: string, patch: Partial<DraftSet>) => void;
  toggleSetCompleted: (exerciseLocalId: string, setLocalId: string) => boolean;

  setWorkoutName: (name: string) => void;
  setWorkoutNotes: (notes: string) => void;

  startRest: (seconds: number, label?: string) => void;
  adjustRest: (deltaSeconds: number) => void;
  pauseRest: () => void;
  resumeRest: () => void;
  skipRest: () => void;

  finishWorkout: () => Promise<SaveWorkoutResult>;
  discardWorkout: () => void;
  clearSaveError: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [draft, setDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState>(NO_REST);
  const [isRestoring, setIsRestoring] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSets, setPreviousSets] = useState<Record<UUID, PreviousSetRow[]>>({});

  const restoredRef = useRef(false);

  /**
   * The draft as of this render, readable from an event handler without
   * putting `draft` in every callback's dependency list.
   */
  const draftRef = useRef<ActiveWorkoutDraft | null>(draft);
  draftRef.current = draft;

  /* ------------------------- restore on launch ------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(DRAFT_KEY);
        if (!cancelled && stored) {
          const parsed = JSON.parse(stored) as PersistedState;
          if (parsed?.draft?.localId && Array.isArray(parsed.draft.exercises)) {
            setDraft(parsed.draft);
            setRestTimer(parsed.restTimer ?? NO_REST);
          }
        }
      } catch {
        // A corrupt draft is discarded rather than blocking the app.
      } finally {
        if (!cancelled) {
          restoredRef.current = true;
          setIsRestoring(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------- persist changes -------------------------- */
  useEffect(() => {
    if (!restoredRef.current) return;

    const payload: PersistedState = { draft, restTimer };
    void (async () => {
      try {
        if (draft) {
          await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } else {
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Non-fatal; the in-memory draft is still intact for this session.
      }
    })();
  }, [draft, restTimer]);

  /* --------------------- previous performance lookup -------------------- */
  const loadPreviousSets = useCallback(async (exerciseIds: UUID[]) => {
    const missing = exerciseIds.filter((id) => id);
    if (missing.length === 0) return;
    try {
      const map = await getPreviousSetsForMany(missing);
      setPreviousSets((current) => ({ ...current, ...map }));
    } catch {
      // Previous values are a convenience; logging still works without them.
    }
  }, []);

  /* ------------------------------ starting ------------------------------ */

  const startEmptyWorkout = useCallback((name?: string) => {
    setDraft({
      localId: localId(),
      routineId: null,
      name: name?.trim() || 'Quick Workout',
      startedAt: Date.now(),
      exercises: [],
      notes: null,
    });
    setRestTimer(NO_REST);
    setSyncStatus('idle');
    setSaveError(null);
  }, []);

  /**
   * Turn a planned exercise list into draft exercises.
   *
   * Shared by saved routines and suggested ones: the two carry the same plan
   * (which exercise, how many sets, how long to rest), so the draft they
   * produce is built in one place rather than twice.
   */
  const toDraftExercises = useCallback(
    (items: PlannedExercise[]): DraftExercise[] =>
      items.map((item) => ({
        localId: localId(),
        exerciseId: item.exercise_id,
        name: item.exercise.name,
        exerciseType: item.exercise.exercise_type,
        restSeconds: item.rest_seconds ?? settings.defaultRestSeconds,
        notes: item.notes,
        supersetGroup: item.superset_group ?? null,
        sets: Array.from({ length: Math.max(1, item.sets) }, (_, index) => ({
          ...emptySet(index + 1),
          // Routine targets are suggestions, not logged values: they are
          // filled in when the user ticks the set off.
          weight: null,
          reps: null,
        })),
      })),
    [settings.defaultRestSeconds],
  );

  const startFromRoutine = useCallback(
    (routine: RoutineWithExercises) => {
      setDraft({
        localId: localId(),
        routineId: routine.id,
        name: routine.name,
        startedAt: Date.now(),
        exercises: toDraftExercises(routine.routine_exercises),
        notes: null,
      });
      setRestTimer(NO_REST);
      setSyncStatus('idle');
      setSaveError(null);
      void loadPreviousSets(routine.routine_exercises.map((item) => item.exercise_id));
    },
    [loadPreviousSets, toDraftExercises],
  );

  /**
   * Start a workout from a suggestion, without saving it as a routine first.
   *
   * `routineId` stays null: `workouts.routine_id` is a foreign key into
   * `workout_routines`, and a suggested routine is not a row there. The
   * workout is otherwise identical to any other — same draft, same save, same
   * history and personal records. Someone who wants the plan kept can add it
   * to their routines from the suggestion screen, and start it that way.
   */
  const startFromSuggestedRoutine = useCallback(
    (routine: SuggestedRoutineWithExercises) => {
      setDraft({
        localId: localId(),
        routineId: null,
        name: routine.name,
        startedAt: Date.now(),
        exercises: toDraftExercises(routine.suggested_routine_exercises),
        notes: null,
      });
      setRestTimer(NO_REST);
      setSyncStatus('idle');
      setSaveError(null);
      void loadPreviousSets(routine.suggested_routine_exercises.map((item) => item.exercise_id));
    },
    [loadPreviousSets, toDraftExercises],
  );

  const addExercises = useCallback(
    (items: AddExerciseInput[]) => {
      if (items.length === 0) return;
      setDraft((current) => {
        if (!current) return current;
        const additions: DraftExercise[] = items.map((item) => ({
          localId: localId(),
          exerciseId: item.exerciseId,
          name: item.name,
          exerciseType: item.exerciseType,
          restSeconds: item.restSeconds ?? settings.defaultRestSeconds,
          notes: item.notes ?? null,
          supersetGroup: null,
          sets: Array.from({ length: Math.max(1, item.initialSets ?? 1) }, (_, index) =>
            emptySet(index + 1),
          ),
        }));
        return { ...current, exercises: [...current.exercises, ...additions] };
      });
      void loadPreviousSets(items.map((item) => item.exerciseId));
    },
    [loadPreviousSets, settings.defaultRestSeconds],
  );

  const removeExercise = useCallback((exerciseLocalId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.filter((item) => item.localId !== exerciseLocalId),
          }
        : current,
    );
  }, []);

  const moveExercise = useCallback((exerciseLocalId: string, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const index = current.exercises.findIndex((item) => item.localId === exerciseLocalId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...current, exercises };
    });
  }, []);

  const setExerciseNotes = useCallback((exerciseLocalId: string, notes: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) =>
              item.localId === exerciseLocalId ? { ...item, notes: notes || null } : item,
            ),
          }
        : current,
    );
  }, []);

  /* -------------------------------- sets -------------------------------- */

  const addSet = useCallback((exerciseLocalId: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        exercises: current.exercises.map((exercise) => {
          if (exercise.localId !== exerciseLocalId) return exercise;
          const last = exercise.sets[exercise.sets.length - 1];
          const next = emptySet(exercise.sets.length + 1);
          // Carry the last entered load forward — most people repeat it.
          if (last) {
            next.weight = last.weight;
            next.reps = last.reps;
            next.durationSeconds = last.durationSeconds;
          }
          return { ...exercise, sets: [...exercise.sets, next] };
        }),
      };
    });
  }, []);

  const removeSet = useCallback((exerciseLocalId: string, setLocalId: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.localId === exerciseLocalId
            ? {
                ...exercise,
                sets: renumber(exercise.sets.filter((set) => set.localId !== setLocalId)),
              }
            : exercise,
        ),
      };
    });
  }, []);

  const updateSet = useCallback(
    (exerciseLocalId: string, setLocalId: string, patch: Partial<DraftSet>) => {
      setDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          exercises: current.exercises.map((exercise) =>
            exercise.localId === exerciseLocalId
              ? {
                  ...exercise,
                  sets: exercise.sets.map((set) =>
                    set.localId === setLocalId ? { ...set, ...patch } : set,
                  ),
                }
              : exercise,
          ),
        };
      });
    },
    [],
  );

  /* --------------------------- the rest timer --------------------------- */

  const startRest = useCallback((seconds: number, label?: string) => {
    if (seconds <= 0) return;
    setRestTimer({
      endsAt: Date.now() + seconds * 1000,
      totalSeconds: seconds,
      pausedRemaining: null,
      label: label ?? null,
    });
  }, []);

  const adjustRest = useCallback((deltaSeconds: number) => {
    setRestTimer((current) => {
      if (current.pausedRemaining !== null) {
        const remaining = Math.max(0, current.pausedRemaining + deltaSeconds);
        return {
          ...current,
          pausedRemaining: remaining,
          totalSeconds: Math.max(current.totalSeconds + deltaSeconds, remaining),
        };
      }
      if (current.endsAt === null) return current;
      const endsAt = Math.max(Date.now(), current.endsAt + deltaSeconds * 1000);
      return {
        ...current,
        endsAt,
        totalSeconds: Math.max(1, current.totalSeconds + deltaSeconds),
      };
    });
  }, []);

  const pauseRest = useCallback(() => {
    setRestTimer((current) => {
      if (current.endsAt === null || current.pausedRemaining !== null) return current;
      const remaining = Math.max(0, Math.round((current.endsAt - Date.now()) / 1000));
      return { ...current, endsAt: null, pausedRemaining: remaining };
    });
  }, []);

  const resumeRest = useCallback(() => {
    setRestTimer((current) => {
      if (current.pausedRemaining === null) return current;
      return {
        ...current,
        endsAt: Date.now() + current.pausedRemaining * 1000,
        pausedRemaining: null,
      };
    });
  }, []);

  const skipRest = useCallback(() => setRestTimer(NO_REST), []);

  /**
   * Ticking a set off is the single most-used control in the app, so it does
   * several helpful things at once: fills in blanks from the previous
   * session, and kicks off the rest timer.
   *
   * Returns true when the set became complete (the caller uses this to fire
   * haptic feedback).
   */
  const toggleSetCompleted = useCallback(
    (exerciseLocalId: string, setLocalId: string): boolean => {
      // Decide from the current draft rather than from inside the state
      // updater. React does not promise to run an updater synchronously, so
      // reading a flag it assigned is a race: when it loses, the caller gets
      // no haptic and the rest timer never starts.
      const exercise = draftRef.current?.exercises.find(
        (item) => item.localId === exerciseLocalId,
      );
      const target = exercise?.sets.find((set) => set.localId === setLocalId);
      if (!exercise || !target) return false;

      const becameComplete = !target.completed;

      setDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          exercises: current.exercises.map((item) => {
            if (item.localId !== exerciseLocalId) return item;

            const history = previousSets[item.exerciseId] ?? [];

            return {
              ...item,
              sets: item.sets.map((set) => {
                if (set.localId !== setLocalId) return set;

                if (set.completed) return { ...set, completed: false };

                const reference =
                  history.find((entry) => entry.set_number === set.setNumber) ??
                  history[history.length - 1];

                const needsLoad =
                  item.exerciseType === 'strength' || item.exerciseType === 'bodyweight';
                const needsDuration =
                  item.exerciseType === 'duration' || item.exerciseType === 'cardio';

                return {
                  ...set,
                  completed: true,
                  weight:
                    set.weight ?? (needsLoad ? (reference?.weight ?? null) : set.weight),
                  reps: set.reps ?? (needsLoad ? (reference?.reps ?? null) : set.reps),
                  durationSeconds:
                    set.durationSeconds ??
                    (needsDuration ? (reference?.duration_seconds ?? null) : set.durationSeconds),
                };
              }),
            };
          }),
        };
      });

      if (becameComplete && exercise.restSeconds > 0) {
        startRest(exercise.restSeconds, 'Rest');
      }
      return becameComplete;
    },
    [previousSets, startRest],
  );

  /* ------------------------------ metadata ------------------------------ */

  const setWorkoutName = useCallback((name: string) => {
    setDraft((current) => (current ? { ...current, name } : current));
  }, []);

  const setWorkoutNotes = useCallback((notes: string) => {
    setDraft((current) => (current ? { ...current, notes: notes || null } : current));
  }, []);

  /* ------------------------------ finishing ----------------------------- */

  const finishWorkout = useCallback(async (): Promise<SaveWorkoutResult> => {
    if (!draft) throw new Error('No workout in progress');
    if (!user) throw new Error('You are signed out. Log in and try again.');

    setSyncStatus('saving');
    setSaveError(null);

    try {
      const result = await saveWorkout(user.id, draft);
      setSyncStatus('saved');
      setDraft(null);
      setRestTimer(NO_REST);
      setPreviousSets({});
      return result;
    } catch (error) {
      setSyncStatus('failed');
      // The draft is deliberately left in place so the user can retry.
      setSaveError(dataErrorMessage(error, 'Workout could not be saved.'));
      throw error;
    }
  }, [draft, user]);

  const discardWorkout = useCallback(() => {
    setDraft(null);
    setRestTimer(NO_REST);
    setPreviousSets({});
    setSyncStatus('idle');
    setSaveError(null);
  }, []);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const value = useMemo<ActiveWorkoutContextValue>(
    () => ({
      draft,
      hasActiveWorkout: draft !== null,
      isRestoring,
      syncStatus,
      saveError,
      restTimer,
      previousSets,
      startEmptyWorkout,
      startFromRoutine,
      startFromSuggestedRoutine,
      addExercises,
      removeExercise,
      moveExercise,
      setExerciseNotes,
      addSet,
      removeSet,
      updateSet,
      toggleSetCompleted,
      setWorkoutName,
      setWorkoutNotes,
      startRest,
      adjustRest,
      pauseRest,
      resumeRest,
      skipRest,
      finishWorkout,
      discardWorkout,
      clearSaveError,
    }),
    [
      draft,
      isRestoring,
      syncStatus,
      saveError,
      restTimer,
      previousSets,
      startEmptyWorkout,
      startFromRoutine,
      startFromSuggestedRoutine,
      addExercises,
      removeExercise,
      moveExercise,
      setExerciseNotes,
      addSet,
      removeSet,
      updateSet,
      toggleSetCompleted,
      setWorkoutName,
      setWorkoutNotes,
      startRest,
      adjustRest,
      pauseRest,
      resumeRest,
      skipRest,
      finishWorkout,
      discardWorkout,
      clearSaveError,
    ],
  );

  return (
    <ActiveWorkoutContext.Provider value={value}>{children}</ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout(): ActiveWorkoutContextValue {
  const context = useContext(ActiveWorkoutContext);
  if (!context) {
    throw new Error('useActiveWorkout must be used inside <ActiveWorkoutProvider>');
  }
  return context;
}
