import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { setTypeMarker } from '@/lib/format';
import { parseNumericInput, parseWeightInput, weightInputValue } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';
import type { ExerciseType, PreviousSetRow, UnitPreference } from '@/types/database';
import type { DraftSet } from '@/types/models';

/**
 * One row of the live logger. This is the control the user taps most while
 * actually training, so it is deliberately flat: everything is on screen,
 * nothing opens a new screen, and the tick target is a full 44pt.
 */

interface NumericCellProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
  flex: number;
  completed: boolean;
}

function NumericCell({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  flex,
  completed,
}: NumericCellProps) {
  const { colors, radius, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      placeholderTextColor={colors.textSubtle}
      keyboardType="decimal-pad"
      inputMode="decimal"
      selectTextOnFocus
      returnKeyType="done"
      accessibilityLabel={accessibilityLabel}
      style={[
        typography.bodyStrong,
        {
          flex,
          textAlign: 'center',
          color: colors.text,
          backgroundColor: focused
            ? colors.surface
            : completed
              ? 'transparent'
              : colors.surfaceAlt,
          borderRadius: radius.sm,
          borderWidth: focused ? 2 : 0,
          borderColor: colors.primary,
          paddingVertical: 9,
          marginHorizontal: 3,
          minHeight: MIN_TOUCH_TARGET - 6,
        },
      ]}
    />
  );
}

interface SetRowProps {
  set: DraftSet;
  previous: PreviousSetRow | null;
  exerciseType: ExerciseType;
  unit: UnitPreference;
  onChange: (patch: Partial<DraftSet>) => void;
  onToggleComplete: () => void;
  onCycleType: () => void;
}

export function SetRow({
  set,
  previous,
  exerciseType,
  unit,
  onChange,
  onToggleComplete,
  onCycleType,
}: SetRowProps) {
  const { colors, radius, typography } = useTheme();

  const tracksLoad = exerciseType === 'strength' || exerciseType === 'bodyweight';
  const tracksDuration = exerciseType === 'duration' || exerciseType === 'cardio';

  /* Local text state keeps typing smooth; it re-syncs whenever the value is
     changed from outside (for example auto-filled when ticking the set). */
  const [weightText, setWeightText] = useState(() => weightInputValue(set.weight, unit));
  const [repsText, setRepsText] = useState(() => (set.reps === null ? '' : String(set.reps)));
  const [durationText, setDurationText] = useState(() =>
    set.durationSeconds === null ? '' : String(set.durationSeconds),
  );

  useEffect(() => {
    setWeightText(weightInputValue(set.weight, unit));
  }, [set.weight, unit]);

  useEffect(() => {
    setRepsText(set.reps === null ? '' : String(set.reps));
  }, [set.reps]);

  useEffect(() => {
    setDurationText(set.durationSeconds === null ? '' : String(set.durationSeconds));
  }, [set.durationSeconds]);

  const marker = setTypeMarker(set.setType);

  const previousLabel = (() => {
    if (!previous) return '—';
    if (tracksDuration && previous.duration_seconds) return `${previous.duration_seconds}s`;
    if (previous.weight !== null && previous.reps !== null) {
      return `${weightInputValue(previous.weight, unit)} × ${previous.reps}`;
    }
    if (previous.reps !== null) return `${previous.reps} reps`;
    return '—';
  })();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: set.completed ? colors.successRow : 'transparent',
          borderRadius: radius.sm,
        },
      ]}
    >
      {/* Set number — tapping cycles warm-up / drop / failure */}
      <Pressable
        onPress={onCycleType}
        accessibilityRole="button"
        accessibilityLabel={`Set ${set.setNumber}, ${set.setType}. Change set type`}
        style={styles.setNumber}
      >
        <Text style={[typography.bodyStrong, { color: marker ? colors.warning : colors.text }]}>
          {marker ?? set.setNumber}
        </Text>
      </Pressable>

      <Text
        numberOfLines={1}
        accessibilityLabel={`Previous ${previousLabel}`}
        style={[typography.caption, styles.previous, { color: colors.textSubtle }]}
      >
        {previousLabel}
      </Text>

      {tracksLoad ? (
        <NumericCell
          flex={1.1}
          value={weightText}
          completed={set.completed}
          placeholder={previous?.weight != null ? weightInputValue(previous.weight, unit) : '0'}
          accessibilityLabel={`Weight for set ${set.setNumber} in ${unit}`}
          onChangeText={(text) => {
            setWeightText(text);
            onChange({ weight: parseWeightInput(text, unit) });
          }}
        />
      ) : null}

      {tracksLoad ? (
        <NumericCell
          flex={0.9}
          value={repsText}
          completed={set.completed}
          placeholder={previous?.reps != null ? String(previous.reps) : '0'}
          accessibilityLabel={`Reps for set ${set.setNumber}`}
          onChangeText={(text) => {
            setRepsText(text);
            const parsed = parseNumericInput(text);
            onChange({ reps: parsed === null ? null : Math.round(parsed) });
          }}
        />
      ) : null}

      {tracksDuration ? (
        <NumericCell
          flex={2}
          value={durationText}
          completed={set.completed}
          placeholder={
            previous?.duration_seconds != null ? String(previous.duration_seconds) : 'seconds'
          }
          accessibilityLabel={`Duration in seconds for set ${set.setNumber}`}
          onChangeText={(text) => {
            setDurationText(text);
            const parsed = parseNumericInput(text);
            onChange({ durationSeconds: parsed === null ? null : Math.round(parsed) });
          }}
        />
      ) : null}

      {/* Completion tick: icon + background change, never colour alone */}
      <Pressable
        onPress={onToggleComplete}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        accessibilityLabel={
          set.completed ? `Mark set ${set.setNumber} as not done` : `Mark set ${set.setNumber} as complete`
        }
        style={({ pressed }) => [
          styles.check,
          {
            backgroundColor: set.completed ? colors.accent : colors.surfaceAlt,
            borderRadius: radius.sm,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name={set.completed ? 'checkmark' : 'ellipse-outline'}
          size={20}
          color={set.completed ? colors.onAccent : colors.textSubtle}
        />
      </Pressable>
    </View>
  );
}

/** Column captions above the set rows. */
export function SetRowHeader({ exerciseType, unit }: { exerciseType: ExerciseType; unit: UnitPreference }) {
  const { colors, typography } = useTheme();
  const tracksLoad = exerciseType === 'strength' || exerciseType === 'bodyweight';
  const label = [typography.micro, { color: colors.textSubtle }];

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[...label, styles.setNumber, { textAlign: 'center' }]}>SET</Text>
      <Text style={[...label, styles.previous]}>PREVIOUS</Text>
      {tracksLoad ? (
        <Text style={[...label, { flex: 1.1, textAlign: 'center' }]}>{unit.toUpperCase()}</Text>
      ) : null}
      {tracksLoad ? <Text style={[...label, { flex: 0.9, textAlign: 'center' }]}>REPS</Text> : null}
      {!tracksLoad ? <Text style={[...label, { flex: 2, textAlign: 'center' }]}>SECONDS</Text> : null}
      <View style={styles.check} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 2,
  },
  setNumber: {
    width: 38,
    minHeight: MIN_TOUCH_TARGET - 6,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  previous: { flex: 1.3, textAlign: 'center' },
  check: {
    width: 44,
    height: MIN_TOUCH_TARGET - 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
});
