import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, Badge, Button, Card, ErrorState, LoadingState, Screen } from '@/components/ui';
import { ExerciseImage } from '@/components/workout/ExerciseImage';
import { useAsync } from '@/hooks/useAsync';
import { confirmAction, notify } from '@/lib/alert';
import { experienceLabel, formatClock, goalLabel, muscleLabel, pluralize } from '@/lib/format';
import { dataErrorMessage } from '@/lib/validation';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getSuggestedRoutine, saveSuggestedRoutine } from '@/services/suggestions';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * One suggested routine, in full.
 *
 * Two ways out of here, both landing in the existing workout system rather
 * than a parallel one:
 *   Start workout      — straight into the normal logger, nothing saved.
 *   Add to my routines — copies it into the user's own routines, after which
 *                        it behaves exactly like a routine they built.
 */
export default function SuggestedRoutineScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { draft, startFromSuggestedRoutine } = useActiveWorkout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [saving, setSaving] = useState(false);

  const { data, error, isLoading, refetch } = useAsync(
    () => getSuggestedRoutine(id as string),
    [id],
  );

  const start = async () => {
    if (!data) return;

    if (draft) {
      const confirmed = await confirmAction({
        title: 'A workout is already in progress',
        message: `Starting ${data.name} will discard "${draft.name}".`,
        confirmLabel: 'Discard and start',
        destructive: true,
      });
      if (!confirmed) return;
    }

    startFromSuggestedRoutine(data);
    router.replace('/workout/active');
  };

  const saveToRoutines = async () => {
    if (!data || !user || saving) return;

    setSaving(true);
    try {
      const routineId = await saveSuggestedRoutine(user.id, data);
      router.replace(`/routines/${routineId}`);
    } catch (caught) {
      notify('Could not save', dataErrorMessage(caught, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title={data?.name ?? 'Suggested routine'} />

      <Screen>
        {isLoading ? (
          <LoadingState message="Loading routine…" />
        ) : error || !data ? (
          <ErrorState message="Unable to load this routine." onRetry={refetch} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Badge label={goalLabel(data.fitness_goal)} tone="primary" />
              <Badge label={experienceLabel(data.experience_level)} tone="accent" />
              {data.days_per_week ? (
                <Badge label={`${data.days_per_week}× a week`} tone="neutral" />
              ) : null}
            </View>

            {data.description ? (
              <Text style={[typography.body, { color: colors.textMuted }]}>{data.description}</Text>
            ) : null}

            <Text style={[typography.caption, { color: colors.textSubtle }]}>
              {pluralize(data.suggested_routine_exercises.length, 'exercise')}
              {data.estimated_duration ? ` · about ${data.estimated_duration} min` : ''}
            </Text>

            <Button label="Start workout" icon="play" size="lg" onPress={() => void start()} />

            <Button
              label="Add to my routines"
              variant="secondary"
              icon="bookmark-outline"
              loading={saving}
              loadingLabel="Saving…"
              onPress={() => void saveToRoutines()}
            />

            {data.suggested_routine_exercises.map((item, index) => (
              <Card key={item.id} style={{ gap: 4 }}>
                <View style={styles.row}>
                  <Text style={[typography.caption, { color: colors.textSubtle, width: 22 }]}>
                    {index + 1}
                  </Text>
                  <ExerciseImage
                    name={item.exercise.name}
                    muscle={item.exercise.primary_muscle}
                    size="sm"
                  />
                  <Text
                    onPress={() => router.push(`/exercises/${item.exercise_id}`)}
                    accessibilityRole="link"
                    style={[typography.h3, { color: colors.primaryText, flex: 1 }]}
                  >
                    {item.exercise.name}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 22 }]}>
                  {item.sets} sets
                  {item.target_reps ? ` × ${item.target_reps} reps` : ''}
                  {item.target_duration ? ` × ${formatClock(item.target_duration)}` : ''}
                  {' · rest '}
                  {formatClock(item.rest_seconds)}
                </Text>
                <Text style={[typography.micro, { color: colors.textSubtle, marginLeft: 22 }]}>
                  {muscleLabel(item.exercise.primary_muscle)}
                </Text>
                {item.notes ? (
                  <Text style={[typography.micro, { color: colors.textMuted, marginLeft: 22 }]}>
                    {item.notes}
                  </Text>
                ) : null}
              </Card>
            ))}

            {/*
              What the routine's shape is based on. Public activity guidance,
              named plainly — not a medical recommendation and not a promise
              of any particular result.
            */}
            {data.source_reference ? (
              <Text style={[typography.micro, { color: colors.textSubtle }]}>
                {data.source_reference} Suggestions are general fitness guidance, not medical
                advice.
              </Text>
            ) : null}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
