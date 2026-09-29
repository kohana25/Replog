import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { daysOfWeek, localDateKey, shortWeekdayLabel } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The seven days of this week, and what happened on each.
 *
 * WHY THIS REPLACED "1 / 4 WORKOUTS"
 * That read as a quota the user was failing, and the 4 was invented by the
 * app rather than chosen by the user. This shows what actually happened —
 * trained, rested, or nothing yet — and a target appears only when the user
 * has set one, phrased as a goal rather than a requirement.
 *
 * A rest day is a state of its own, never an empty day: resting is a choice
 * the user made, not a workout they missed.
 */

export type DayState = 'workout' | 'rest' | 'none' | 'future';

export interface WeekStripProps {
  /** Local date keys (YYYY-MM-DD) on which a workout was completed. */
  workoutDays: Set<string>;
  /** Local date keys the user marked as a rest day. */
  restDays?: Set<string>;
  onSelectDay?: (date: Date) => void;
}

export function WeekStrip({ workoutDays, restDays, onSelectDay }: WeekStripProps) {
  const { colors, typography, radius, spacing } = useTheme();

  const today = new Date();
  const todayKey = localDateKey(today);
  const days = daysOfWeek(today);

  const stateFor = (date: Date): DayState => {
    const key = localDateKey(date);
    if (workoutDays.has(key)) return 'workout';
    if (restDays?.has(key)) return 'rest';
    return key > todayKey ? 'future' : 'none';
  };

  return (
    <View style={styles.row} accessibilityRole="list">
      {days.map((date) => {
        const key = localDateKey(date);
        const state = stateFor(date);
        const isToday = key === todayKey;

        const fill =
          state === 'workout'
            ? colors.primary
            : state === 'rest'
              ? colors.accentSoft
              : colors.surfaceAlt;
        const mark =
          state === 'workout' ? colors.onPrimary : state === 'rest' ? colors.accent : colors.textSubtle;

        const description =
          state === 'workout'
            ? 'workout completed'
            : state === 'rest'
              ? 'rest day'
              : state === 'future'
                ? 'upcoming'
                : 'no activity';

        return (
          <View
            key={key}
            style={styles.day}
            accessible
            accessibilityRole={onSelectDay ? 'button' : 'text'}
            accessibilityLabel={`${date.toLocaleDateString(undefined, { weekday: 'long' })}, ${description}`}
          >
            <Text style={[typography.micro, { color: isToday ? colors.text : colors.textSubtle }]}>
              {shortWeekdayLabel(date)}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: fill,
                  borderRadius: radius.md,
                  // Today is outlined rather than filled, so "where am I" and
                  // "what did I do" stay two separate signals.
                  borderWidth: isToday ? 2 : StyleSheet.hairlineWidth,
                  borderColor: isToday ? colors.accent : colors.border,
                  opacity: state === 'future' ? 0.45 : 1,
                },
              ]}
            >
              {state === 'workout' ? (
                <Ionicons name="checkmark" size={16} color={mark} />
              ) : state === 'rest' ? (
                <Ionicons name="bed-outline" size={15} color={mark} />
              ) : (
                <Text style={[typography.micro, { color: mark }]}>{date.getDate()}</Text>
              )}
            </View>
          </View>
        );
      })}
      <View style={{ width: spacing.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: '100%', aspectRatio: 1, maxWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
