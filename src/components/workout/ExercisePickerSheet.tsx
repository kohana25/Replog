import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, Input, LoadingState, OptionGroup, Sheet } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { muscleLabel } from '@/lib/format';
import { listExercises } from '@/services/exercises';
import { useTheme } from '@/theme/ThemeProvider';
import type { ExerciseRow, MuscleGroup } from '@/types/database';
import { ExerciseListItem } from './Cards';

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

/**
 * Multi-select exercise picker, shared by the routine builder and the live
 * workout screen so "add an exercise" behaves identically in both.
 */
export function ExercisePickerSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (exercises: ExerciseRow[]) => void;
}) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [selected, setSelected] = useState<ExerciseRow[]>([]);

  const { data, error, isLoading, refetch } = useAsync(
    () => listExercises({ search, muscle }),
    [search, muscle],
    { enabled: visible },
  );

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  const toggle = (exercise: ExerciseRow) => {
    setSelected((current) =>
      current.some((item) => item.id === exercise.id)
        ? current.filter((item) => item.id !== exercise.id)
        : [...current, exercise],
    );
  };

  const close = () => {
    setSelected([]);
    setSearch('');
    setMuscle(null);
    onClose();
  };

  const confirm = () => {
    onConfirm(selected);
    close();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Add exercises"
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            label={
              selected.length === 0
                ? 'Select at least one exercise'
                : `Add ${selected.length} exercise${selected.length === 1 ? '' : 's'}`
            }
            onPress={confirm}
            disabled={selected.length === 0}
          />
          <Button
            label="Create a custom exercise"
            variant="ghost"
            size="sm"
            icon="add"
            onPress={() => {
              close();
              router.push('/exercises/new');
            }}
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          autoCorrect={false}
          accessibilityLabel="Search exercises"
        />
        <OptionGroup
          options={MUSCLES.map((value) => ({ value, label: muscleLabel(value) }))}
          value={muscle}
          onChange={setMuscle}
          allowClear
        />
      </View>

      {isLoading ? (
        <LoadingState message="Loading exercises…" />
      ) : error ? (
        <ErrorState message="Unable to load exercises." onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.sm,
            paddingBottom: spacing['3xl'],
          }}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No exercises found"
              message="Try a different search term or filter."
            />
          }
          renderItem={({ item }) => (
            <ExerciseListItem
              exercise={item}
              selected={selectedIds.has(item.id)}
              onPress={() => toggle(item)}
              right={
                <Ionicons
                  name={selectedIds.has(item.id) ? 'checkmark-circle' : 'add-circle-outline'}
                  size={24}
                  color={selectedIds.has(item.id) ? colors.primary : colors.textSubtle}
                />
              }
            />
          )}
        />
      )}

      {selected.length > 0 ? (
        <View style={[styles.selectedBar, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted }}>
            {selected.map((item) => item.name).join(', ')}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  selectedBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
