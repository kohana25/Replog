import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppBar,
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { confirmAction, notify } from '@/lib/alert';
import { formatClock, muscleLabel, pluralize } from '@/lib/format';
import { weightInputValue } from '@/lib/units';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useUnit } from '@/providers/SettingsProvider';
import { deleteRoutine, duplicateRoutine, getRoutine } from '@/services/routines';
import { useTheme } from '@/theme/ThemeProvider';

export default function RoutineDetailScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const unit = useUnit();
  const { user } = useAuth();
  const { draft, startFromRoutine } = useActiveWorkout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, error, isLoading, refetch } = useAsync(() => getRoutine(id as string), [id]);

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

    startFromRoutine(data);
    router.replace('/workout/active');
  };

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Delete this routine?',
      message: 'Workouts you already logged from it are kept.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteRoutine(id as string);
      router.replace('/(tabs)/workout');
    } catch {
      notify('Could not delete', 'Please try again.');
    }
  };

  const handleDuplicate = async () => {
    if (!user) return;
    try {
      const newId = await duplicateRoutine(user.id, id as string);
      router.replace(`/routines/${newId}`);
    } catch {
      notify('Could not duplicate', 'Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title={data?.name ?? 'Routine'}
        right={
          data ? (
            <>
              <IconButton
                icon="copy-outline"
                onPress={() => void handleDuplicate()}
                accessibilityLabel="Duplicate this routine"
              />
              <IconButton
                icon="create-outline"
                onPress={() => router.push(`/routines/builder?id=${id}`)}
                accessibilityLabel="Edit this routine"
              />
              <IconButton
                icon="trash-outline"
                color={colors.danger}
                onPress={() => void handleDelete()}
                accessibilityLabel="Delete this routine"
              />
            </>
          ) : null
        }
      />

      <Screen>
        {isLoading ? (
          <LoadingState message="Loading routine…" />
        ) : error || !data ? (
          <ErrorState message="Unable to load this routine." onRetry={refetch} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {data.description ? (
              <Text style={[typography.body, { color: colors.textMuted }]}>{data.description}</Text>
            ) : null}

            <Text style={[typography.caption, { color: colors.textSubtle }]}>
              {pluralize(data.routine_exercises.length, 'exercise')}
              {data.estimated_duration ? ` · about ${data.estimated_duration} min` : ''}
            </Text>

            <Button label="Start workout" icon="play" size="lg" onPress={() => void start()} />

            {data.routine_exercises.map((item, index) => (
              <Card key={item.id} style={{ gap: 4 }}>
                <View style={styles.row}>
                  <Text style={[typography.caption, { color: colors.textSubtle, width: 22 }]}>
                    {index + 1}
                  </Text>
                  <Text
                    onPress={() => router.push(`/exercises/${item.exercise_id}`)}
                    accessibilityRole="link"
                    style={[typography.h3, { color: colors.primary, flex: 1 }]}
                  >
                    {item.exercise.name}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 22 }]}>
                  {item.sets} sets
                  {item.target_reps ? ` × ${item.target_reps} reps` : ''}
                  {item.target_weight
                    ? ` @ ${weightInputValue(item.target_weight, unit)} ${unit}`
                    : ''}
                  {' · rest '}
                  {formatClock(item.rest_seconds)}
                </Text>
                <Text style={[typography.micro, { color: colors.textSubtle, marginLeft: 22 }]}>
                  {muscleLabel(item.exercise.primary_muscle)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
