import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveExerciseCard } from '@/components/workout/ActiveExerciseCard';
import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import {
  AppBar,
  Button,
  Card,
  EmptyState,
  InlineError,
  Input,
  Screen,
} from '@/components/ui';
import { useElapsedSeconds } from '@/hooks/useTick';
import { confirmAction, notify } from '@/lib/alert';
import { formatClock, pluralize } from '@/lib/format';
import { formatVolume } from '@/lib/units';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useUnit } from '@/providers/SettingsProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';

export default function ActiveWorkoutScreen() {
  const { colors, typography, spacing } = useTheme();
  const { gutter, contentMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unit = useUnit();

  // The screen should not sleep while someone is between sets.
  useKeepAwake();

  const {
    draft,
    restTimer,
    previousSets,
    syncStatus,
    saveError,
    addExercises,
    removeExercise,
    moveExercise,
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
  } = useActiveWorkout();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const elapsed = useElapsedSeconds(draft?.startedAt ?? null);

  const totals = useMemo(() => {
    if (!draft) return { sets: 0, volume: 0 };
    let sets = 0;
    let volume = 0;
    for (const exercise of draft.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed) continue;
        sets += 1;
        volume += (set.weight ?? 0) * (set.reps ?? 0);
      }
    }
    return { sets, volume };
  }, [draft]);

  if (!draft) {
    return (
      <Screen>
        <AppBar title="Workout" />
        <EmptyState
          icon="barbell-outline"
          title="No workout in progress"
          message="Start a routine or an empty session to begin logging."
          actionLabel="Go to workouts"
          onAction={() => router.replace('/(tabs)/workout')}
        />
      </Screen>
    );
  }

  const handleFinish = async () => {
    if (totals.sets === 0) {
      notify(
        'Nothing logged yet',
        'Tick off at least one set before finishing, or discard this workout.',
      );
      return;
    }

    const confirmed = await confirmAction({
      title: 'Finish workout?',
      message: `${pluralize(totals.sets, 'set')} will be saved.`,
      confirmLabel: 'Finish',
      cancelLabel: 'Keep going',
    });
    if (!confirmed) return;

    try {
      const result = await finishWorkout();
      router.replace({
        pathname: '/workout/complete',
        params: {
          workoutId: result.workoutId,
          stats: JSON.stringify(result.stats),
        },
      });
    } catch {
      // The error is surfaced inline below; the draft is kept for a retry.
    }
  };

  const handleDiscard = async () => {
    const confirmed = await confirmAction({
      title: 'Discard workout?',
      message: 'Everything logged in this session will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!confirmed) return;

    discardWorkout();
    router.replace('/(tabs)/workout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title={draft.name}
        subtitle={`${formatClock(elapsed)} · ${pluralize(totals.sets, 'set')}`}
        onBack={() => router.replace('/(tabs)')}
        right={
          <Text
            accessibilityLabel={`Elapsed time ${formatClock(elapsed)}`}
            style={[
              typography.h3,
              { color: colors.text, fontVariant: ['tabular-nums'], paddingRight: 10 },
            ]}
          >
            {formatClock(elapsed)}
          </Text>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: spacing.lg,
          paddingBottom: spacing['4xl'],
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: spacing.lg }}>
          {editingName ? (
            <Input
              label="Workout name"
              value={draft.name}
              onChangeText={setWorkoutName}
              onBlur={() => setEditingName(false)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => setEditingName(false)}
            />
          ) : (
            <Button
              label="Rename workout"
              variant="ghost"
              size="sm"
              icon="create-outline"
              fullWidth={false}
              onPress={() => setEditingName(true)}
            />
          )}

          {draft.exercises.length === 0 ? (
            <EmptyState
              icon="add-circle-outline"
              title="Add your first exercise"
              message="Pick from the library and start logging sets."
              actionLabel="Add exercise"
              onAction={() => setPickerOpen(true)}
            />
          ) : (
            draft.exercises.map((exercise, index) => (
              <ActiveExerciseCard
                key={exercise.localId}
                exercise={exercise}
                previousSets={previousSets[exercise.exerciseId] ?? []}
                unit={unit}
                isFirst={index === 0}
                isLast={index === draft.exercises.length - 1}
                onAddSet={() => addSet(exercise.localId)}
                onRemoveSet={(setLocalId) => removeSet(exercise.localId, setLocalId)}
                onUpdateSet={(setLocalId, patch) => updateSet(exercise.localId, setLocalId, patch)}
                onToggleSet={(setLocalId) => toggleSetCompleted(exercise.localId, setLocalId)}
                onRemoveExercise={() =>
                  void confirmAction({
                    title: 'Remove exercise?',
                    message: `${exercise.name} and its sets will be removed.`,
                    confirmLabel: 'Remove',
                    destructive: true,
                  }).then((confirmed) => {
                    if (confirmed) removeExercise(exercise.localId);
                  })
                }
                onMove={(direction) => moveExercise(exercise.localId, direction)}
                onOpenExercise={() => router.push(`/exercises/${exercise.exerciseId}`)}
                onStartRest={() => startRest(exercise.restSeconds, exercise.name)}
              />
            ))
          )}

          {draft.exercises.length > 0 ? (
            <Button
              label="Add exercise"
              variant="secondary"
              icon="add"
              onPress={() => setPickerOpen(true)}
            />
          ) : null}

          <Card style={{ gap: spacing.sm }}>
            <Input
              label="Session notes"
              value={draft.notes ?? ''}
              onChangeText={setWorkoutNotes}
              placeholder="How did it feel?"
              multiline
            />
          </Card>

          <View style={styles.summaryRow}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {pluralize(totals.sets, 'set')} · {formatVolume(totals.volume, unit)} volume
            </Text>
          </View>

          <InlineError
            message={
              saveError
                ? `${saveError} Your workout is still here — tap Finish to try again.`
                : null
            }
          />

          <Button
            label="Discard workout"
            variant="ghost"
            icon="trash-outline"
            onPress={() => void handleDiscard()}
          />
        </View>
      </ScrollView>

      {restTimer.endsAt !== null || restTimer.pausedRemaining !== null ? (
        <RestTimerBar
          timer={restTimer}
          onAdjust={adjustRest}
          onPause={pauseRest}
          onResume={resumeRest}
          onSkip={skipRest}
        />
      ) : null}

      {/* Finish is always within thumb reach, never scrolled off screen. */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
            paddingHorizontal: gutter,
          },
        ]}
      >
        <Button
          label={syncStatus === 'saving' ? 'Saving…' : 'Finish workout'}
          icon="checkmark"
          size="lg"
          variant="accent"
          loading={syncStatus === 'saving'}
          onPress={() => void handleFinish()}
        />
      </View>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(exercises) =>
          addExercises(
            exercises.map((exercise) => ({
              exerciseId: exercise.id,
              name: exercise.name,
              exerciseType: exercise.exercise_type,
            })),
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { alignItems: 'center' },
  actionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
});
