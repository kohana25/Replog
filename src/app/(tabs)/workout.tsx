import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { RoutineCard } from '@/components/workout/Cards';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeading,
  SectionHeader,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { getRoutine, listRoutines } from '@/services/routines';
import { useTheme } from '@/theme/ThemeProvider';

export default function WorkoutTabScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { draft, startEmptyWorkout, startFromRoutine } = useActiveWorkout();

  const { data, error, isLoading, isRefreshing, refresh, refetch } = useAsync(
    () => listRoutines(),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const startEmpty = () => {
    startEmptyWorkout();
    router.push('/workout/active');
  };

  const quickStart = async (routineId: string) => {
    try {
      const routine = await getRoutine(routineId);
      if (!routine) return;
      startFromRoutine(routine);
      router.push('/workout/active');
    } catch {
      router.push(`/routines/${routineId}`);
    }
  };

  return (
    <Screen
      bottomInset={draft ? 64 : 0}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeading title="Workout" subtitle="Start training or manage your routines" />

      <View style={{ gap: spacing['2xl'] }}>
        <Card style={{ gap: spacing.md }}>
          {draft ? (
            <>
              <Text style={[typography.h3, { color: colors.text }]}>
                {draft.name} is in progress
              </Text>
              <Button
                label="Resume workout"
                icon="play"
                size="lg"
                onPress={() => router.push('/workout/active')}
              />
            </>
          ) : (
            <>
              <Text style={[typography.h3, { color: colors.text }]}>Quick start</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Begin an empty session and add exercises as you go.
              </Text>
              <Button label="Start empty workout" icon="play" size="lg" onPress={startEmpty} />
            </>
          )}
        </Card>

        <View>
          <SectionHeader
            title="Routines"
            action="New"
            onActionPress={() => router.push('/routines/builder')}
          />

          {isLoading ? (
            <LoadingState message="Loading routines…" />
          ) : error ? (
            <ErrorState message="Unable to load your routines." onRetry={refetch} />
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="No routines yet"
              message="A routine is a reusable plan — build one once and start it in a tap every week."
              actionLabel="Create your first routine"
              onAction={() => router.push('/routines/builder')}
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data?.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onPress={() => router.push(`/routines/${routine.id}`)}
                  onStart={draft ? undefined : () => void quickStart(routine.id)}
                />
              ))}
            </View>
          )}
        </View>

        <Button
          label="Workout history"
          variant="secondary"
          icon="time-outline"
          onPress={() => router.push('/workout/history')}
        />
      </View>
    </Screen>
  );
}
