import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Card, IconButton } from '@/components/ui';
import { formatClock } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { PreviousSetRow, UnitPreference } from '@/types/database';
import type { DraftExercise, DraftSet } from '@/types/models';
import { SetRow, SetRowHeader } from './SetRow';

const SET_TYPE_CYCLE = ['normal', 'warmup', 'drop', 'failure'] as const;

interface Props {
  exercise: DraftExercise;
  previousSets: PreviousSetRow[];
  unit: UnitPreference;
  isFirst: boolean;
  isLast: boolean;
  onAddSet: () => void;
  onRemoveSet: (setLocalId: string) => void;
  onUpdateSet: (setLocalId: string, patch: Partial<DraftSet>) => void;
  onToggleSet: (setLocalId: string) => boolean;
  onRemoveExercise: () => void;
  onMove: (direction: -1 | 1) => void;
  onOpenExercise: () => void;
  onStartRest: () => void;
}

export function ActiveExerciseCard({
  exercise,
  previousSets,
  unit,
  isFirst,
  isLast,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleSet,
  onRemoveExercise,
  onMove,
  onOpenExercise,
  onStartRest,
}: Props) {
  const { colors, typography, spacing } = useTheme();

  const completedCount = exercise.sets.filter((set) => set.completed).length;

  const handleToggle = (setLocalId: string) => {
    const becameComplete = onToggleSet(setLocalId);
    // A short tap confirms the set landed without the user looking at the screen.
    if (becameComplete && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            onPress={onOpenExercise}
            accessibilityRole="link"
            accessibilityHint="Opens exercise details and history"
            style={[typography.h3, { color: colors.primary }]}
          >
            {exercise.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {completedCount}/{exercise.sets.length} sets · rest {formatClock(exercise.restSeconds)}
          </Text>
        </View>

        <IconButton
          icon="arrow-up"
          size={18}
          onPress={() => onMove(-1)}
          disabled={isFirst}
          accessibilityLabel={`Move ${exercise.name} up`}
        />
        <IconButton
          icon="arrow-down"
          size={18}
          onPress={() => onMove(1)}
          disabled={isLast}
          accessibilityLabel={`Move ${exercise.name} down`}
        />
        <IconButton
          icon="trash-outline"
          size={18}
          color={colors.danger}
          onPress={onRemoveExercise}
          accessibilityLabel={`Remove ${exercise.name} from this workout`}
        />
      </View>

      <SetRowHeader exerciseType={exercise.exerciseType} unit={unit} />

      {exercise.sets.map((set, index) => (
        <View key={set.localId} style={styles.setWrapper}>
          <View style={{ flex: 1 }}>
            <SetRow
              set={set}
              previous={previousSets[index] ?? previousSets[previousSets.length - 1] ?? null}
              exerciseType={exercise.exerciseType}
              unit={unit}
              onChange={(patch) => onUpdateSet(set.localId, patch)}
              onToggleComplete={() => handleToggle(set.localId)}
              onCycleType={() => {
                const current = SET_TYPE_CYCLE.indexOf(set.setType);
                const next = SET_TYPE_CYCLE[(current + 1) % SET_TYPE_CYCLE.length];
                onUpdateSet(set.localId, { setType: next });
              }}
            />
          </View>
          {exercise.sets.length > 1 ? (
            <IconButton
              icon="close"
              size={16}
              onPress={() => onRemoveSet(set.localId)}
              accessibilityLabel={`Delete set ${set.setNumber} of ${exercise.name}`}
            />
          ) : null}
        </View>
      ))}

      <View style={styles.actions}>
        <Button label="Add set" variant="secondary" size="sm" icon="add" onPress={onAddSet} />
        <Button
          label="Rest"
          variant="ghost"
          size="sm"
          icon="timer-outline"
          onPress={onStartRest}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  setWrapper: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
