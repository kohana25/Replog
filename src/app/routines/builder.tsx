import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet';
import {
  AppBar,
  Button,
  Card,
  EmptyState,
  IconButton,
  InlineError,
  Input,
  LoadingState,
  Screen,
} from '@/components/ui';
import { muscleLabel } from '@/lib/format';
import { parseNumericInput, parseWeightInput, weightInputValue } from '@/lib/units';
import { clampRestSeconds, dataErrorMessage, validateRequiredText } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { createRoutine, getRoutine, updateRoutine } from '@/services/routines';
import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';
import type { ExerciseRow, MuscleGroup } from '@/types/database';

interface BuilderRow {
  key: string;
  exerciseId: string;
  name: string;
  muscle: MuscleGroup;
  sets: number;
  targetReps: number | null;
  targetWeight: number | null;
  restSeconds: number;
}

/** Create (no `id` param) and edit (with `id`) share this screen. */
export default function RoutineBuilderScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const routine = await getRoutine(id);
        if (!routine) {
          setFormError('That routine no longer exists.');
          return;
        }
        setName(routine.name);
        setDescription(routine.description ?? '');
        setRows(
          routine.routine_exercises.map((item) => ({
            key: item.id,
            exerciseId: item.exercise_id,
            name: item.exercise.name,
            muscle: item.exercise.primary_muscle,
            sets: item.sets,
            targetReps: item.target_reps,
            targetWeight: item.target_weight,
            restSeconds: item.rest_seconds,
          })),
        );
      } catch (caught) {
        setFormError(dataErrorMessage(caught, 'Unable to load that routine.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const addExercises = (exercises: ExerciseRow[]) => {
    setRows((current) => [
      ...current,
      ...exercises.map((exercise) => ({
        key: `${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: exercise.id,
        name: exercise.name,
        muscle: exercise.primary_muscle,
        sets: 3,
        targetReps: exercise.exercise_type === 'strength' ? 10 : null,
        targetWeight: null,
        restSeconds: settings.defaultRestSeconds,
      })),
    ]);
  };

  const patchRow = (key: string, patch: Partial<BuilderRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const move = (key: string, direction: -1 | 1) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    const error = validateRequiredText(name, 'Routine name');
    setNameError(error);
    setFormError(null);
    if (error) return;

    if (rows.length === 0) {
      setFormError('Add at least one exercise to this routine.');
      return;
    }
    if (!user) {
      setFormError('You are signed out. Log in and try again.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        // A rough duration estimate: sets plus rest, rounded to minutes.
        estimatedDuration: Math.max(
          5,
          Math.round(
            rows.reduce((sum, row) => sum + row.sets * (row.restSeconds + 45), 0) / 60,
          ),
        ),
        exercises: rows.map((row) => ({
          exerciseId: row.exerciseId,
          sets: row.sets,
          targetReps: row.targetReps,
          targetWeight: row.targetWeight,
          targetDuration: null,
          restSeconds: row.restSeconds,
        })),
      };

      if (isEditing && id) {
        await updateRoutine(id, payload);
        router.replace(`/routines/${id}`);
      } else {
        const newId = await createRoutine(user.id, payload);
        router.replace(`/routines/${newId}`);
      }
    } catch (caught) {
      setFormError(dataErrorMessage(caught, 'Could not save this routine.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppBar title="Edit routine" />
        <LoadingState message="Loading routine…" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title={isEditing ? 'Edit routine' : 'New routine'} />

      <Screen keyboardAware>
        <View style={{ gap: spacing.lg }}>
          <Input
            label="Routine name"
            value={name}
            onChangeText={setName}
            error={nameError}
            placeholder="Push Day"
          />

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Chest, shoulders and triceps"
            multiline
          />

          {rows.length === 0 ? (
            <EmptyState
              icon="barbell-outline"
              title="No exercises yet"
              message="Add the exercises you want in this routine, then set targets for each."
              actionLabel="Add exercises"
              onAction={() => setPickerOpen(true)}
            />
          ) : (
            rows.map((row, index) => (
              <Card key={row.key} style={{ gap: spacing.sm }}>
                <View style={styles.header}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[typography.h3, { color: colors.text }]}>
                      {row.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {muscleLabel(row.muscle)}
                    </Text>
                  </View>
                  <IconButton
                    icon="arrow-up"
                    size={18}
                    disabled={index === 0}
                    onPress={() => move(row.key, -1)}
                    accessibilityLabel={`Move ${row.name} up`}
                  />
                  <IconButton
                    icon="arrow-down"
                    size={18}
                    disabled={index === rows.length - 1}
                    onPress={() => move(row.key, 1)}
                    accessibilityLabel={`Move ${row.name} down`}
                  />
                  <IconButton
                    icon="trash-outline"
                    size={18}
                    color={colors.danger}
                    onPress={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                    accessibilityLabel={`Remove ${row.name}`}
                  />
                </View>

                <View style={styles.fields}>
                  <FieldCell
                    label="SETS"
                    value={String(row.sets)}
                    accessibilityLabel={`Sets for ${row.name}`}
                    onChangeText={(text) => {
                      const parsed = parseNumericInput(text);
                      patchRow(row.key, {
                        sets: parsed === null ? 1 : Math.min(Math.max(Math.round(parsed), 1), 50),
                      });
                    }}
                  />
                  <FieldCell
                    label="REPS"
                    value={row.targetReps === null ? '' : String(row.targetReps)}
                    placeholder="—"
                    accessibilityLabel={`Target reps for ${row.name}`}
                    onChangeText={(text) => {
                      const parsed = parseNumericInput(text);
                      patchRow(row.key, {
                        targetReps: parsed === null ? null : Math.round(parsed),
                      });
                    }}
                  />
                  <FieldCell
                    label={settings.unit.toUpperCase()}
                    value={weightInputValue(row.targetWeight, settings.unit)}
                    placeholder="—"
                    accessibilityLabel={`Target weight for ${row.name}`}
                    onChangeText={(text) =>
                      patchRow(row.key, { targetWeight: parseWeightInput(text, settings.unit) })
                    }
                  />
                  <FieldCell
                    label="REST (S)"
                    value={String(row.restSeconds)}
                    accessibilityLabel={`Rest seconds for ${row.name}`}
                    onChangeText={(text) =>
                      patchRow(row.key, { restSeconds: clampRestSeconds(parseNumericInput(text)) })
                    }
                  />
                </View>
              </Card>
            ))
          )}

          {rows.length > 0 ? (
            <Button
              label="Add exercises"
              variant="secondary"
              icon="add"
              onPress={() => setPickerOpen(true)}
            />
          ) : null}

          <InlineError message={formError} />

          <Button
            label={isEditing ? 'Save changes' : 'Create routine'}
            size="lg"
            loading={saving}
            onPress={handleSave}
          />

          <Button
            label="Cancel"
            variant="ghost"
            onPress={() =>
              rows.length > 0
                ? Alert.alert('Discard changes?', 'Your edits will not be saved.', [
                    { text: 'Keep editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                  ])
                : router.back()
            }
          />
        </View>
      </Screen>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addExercises}
      />
    </View>
  );
}

function FieldCell({
  label,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
}) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4, minWidth: 64 }}>
      <Text style={[typography.micro, { color: colors.textSubtle, textAlign: 'center' }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        keyboardType="number-pad"
        inputMode="numeric"
        selectTextOnFocus
        accessibilityLabel={accessibilityLabel}
        style={[
          typography.bodyStrong,
          {
            textAlign: 'center',
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.sm,
            paddingVertical: 10,
            minHeight: MIN_TOUCH_TARGET - 6,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  fields: { flexDirection: 'row', gap: 8 },
});
