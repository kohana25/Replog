import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ExerciseListItem } from '@/components/workout/Cards';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  OptionGroup,
  Screen,
  ScreenHeading,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { equipmentLabel, muscleLabel } from '@/lib/format';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { listExercises } from '@/services/exercises';
import { useTheme } from '@/theme/ThemeProvider';
import type { Equipment, MuscleGroup } from '@/types/database';

const MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
];

const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'resistance_band',
  'bodyweight',
  'other',
];

export default function ExercisesScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { draft } = useActiveWorkout();

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const { data, error, isLoading, refetch, refresh } = useAsync(
    () => listExercises({ search, muscle, equipment }),
    [search, muscle, equipment],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <Screen bottomInset={draft ? 64 : 0}>
      <ScreenHeading
        title="Exercises"
        subtitle="Browse the library or add your own"
        right={
          <Button
            label="New"
            icon="add"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/exercises/new')}
          />
        }
      />

      <View style={{ gap: spacing.lg }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          autoCorrect={false}
          accessibilityLabel="Search exercises"
        />

        <OptionGroup
          label="Muscle"
          options={MUSCLES.map((value) => ({ value, label: muscleLabel(value) }))}
          value={muscle}
          onChange={setMuscle}
          allowClear
        />

        <OptionGroup
          label="Equipment"
          options={EQUIPMENT.map((value) => ({ value, label: equipmentLabel(value) }))}
          value={equipment}
          onChange={setEquipment}
          allowClear
        />

        {isLoading ? (
          <LoadingState message="Loading exercises…" />
        ) : error ? (
          <ErrorState message="Unable to load exercises." onRetry={refetch} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No exercises match"
            message="Try clearing a filter, or create a custom exercise of your own."
            actionLabel="Create exercise"
            onAction={() => router.push('/exercises/new')}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {data?.map((exercise) => (
              <ExerciseListItem
                key={exercise.id}
                exercise={exercise}
                onPress={() => router.push(`/exercises/${exercise.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
