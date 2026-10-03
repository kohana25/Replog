import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, IconButton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { endOfMonth, formatMonthYear, localDateKey, startOfMonth } from '@/lib/format';
import { getWorkoutDays } from '@/services/workouts';
import { getRestDays } from '@/services/rest-days';
import { useTheme } from '@/theme/ThemeProvider';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_PER_WEEK = 7;

interface Cell {
  key: string;
  /** null for the blank squares before the 1st. */
  day: number | null;
  dateKey: string;
}

/** The month's squares, padded at the front so the 1st lands on its weekday. */
function buildCells(month: Date): Cell[] {
  const first = startOfMonth(month);
  const daysInMonth = endOfMonth(month).getDate();
  const leading = first.getDay();

  const cells: Cell[] = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push({ key: `blank-${i}`, day: null, dateKey: '' });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    cells.push({ key: localDateKey(date), day, dateKey: localDateKey(date) });
  }
  return cells;
}

/**
 * Which days this month the user trained.
 *
 * The marks come from the workouts table — a day is filled in only when a
 * workout is recorded as completed on it, so a planned or abandoned session
 * never counts. Days are keyed in the device's timezone, which also means two
 * workouts on one day produce a single mark.
 *
 * `refreshToken` is bumped by the screen after a refresh (finishing a workout
 * brings the user back to Home, which refreshes), and the month reloads.
 */
export function WorkoutCalendar({ refreshToken = 0 }: { refreshToken?: number }) {
  const { colors, typography, spacing, radius } = useTheme();

  const today = new Date();
  const todayKey = localDateKey(today);
  const currentMonth = startOfMonth(today);

  const [month, setMonth] = useState<Date>(currentMonth);
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const isCurrentMonth = month.getTime() === currentMonth.getTime();

  const { data, error, isLoading } = useAsync(async () => {
    const [workouts, rests] = await Promise.all([
      getWorkoutDays(startOfMonth(month), endOfMonth(month)),
      getRestDays(startOfMonth(month), endOfMonth(month)),
    ]);
    return { workouts, rests };
  }, [monthKey, refreshToken]);

  const workoutDays = data?.workouts;
  const restDays = data?.rests;

  const cells = useMemo(() => buildCells(month), [month]);

  const shiftMonth = (delta: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  const trainedThisMonth = workoutDays?.size ?? 0;
  const restedThisMonth = restDays?.size ?? 0;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          onPress={() => shiftMonth(-1)}
          accessibilityLabel="Previous month"
          color={colors.textMuted}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[typography.bodyStrong, { color: colors.text }]}
          >
            {formatMonthYear(month)}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {isLoading
              ? 'Loading…'
              : // Saying "0 workout days" when the month never loaded would be
                // a claim about the user's training that we cannot make.
                error
                ? 'Could not load this month'
                : `${trainedThisMonth === 1 ? '1 workout day' : `${trainedThisMonth} workout days`}${
                      restedThisMonth > 0
                        ? ` · ${restedThisMonth === 1 ? '1 rest day' : `${restedThisMonth} rest days`}`
                        : ''
                    }`}
          </Text>
        </View>
        <IconButton
          icon="chevron-forward"
          onPress={() => shiftMonth(1)}
          accessibilityLabel="Next month"
          // Nothing can be logged in the future, so there is nowhere to go.
          disabled={isCurrentMonth}
          color={colors.textMuted}
        />
      </View>

      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <View key={`weekday-${index}`} style={styles.cell}>
            <Text
              // The initials repeat (S, T), so they are decoration to a screen
              // reader — each day below carries its own full label.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[typography.caption, { color: colors.textSubtle, fontWeight: '600' }]}
            >
              {initial}
            </Text>
          </View>
        ))}

        {cells.map((cell) => {
          if (cell.day === null) return <View key={cell.key} style={styles.cell} />;

          const trained = workoutDays?.has(cell.dateKey) ?? false;
          // A day can only be one or the other on screen; a workout wins,
          // because it is the thing that actually happened.
          const rested = !trained && (restDays?.has(cell.dateKey) ?? false);
          const isToday = cell.dateKey === todayKey;

          return (
            <View key={cell.key} style={styles.cell}>
              <View
                accessible
                accessibilityLabel={`${cell.day} ${formatMonthYear(month)}${
                  isToday ? ', today' : ''
                }${trained ? ', workout completed' : rested ? ', rest day' : ''}`}
                style={[
                  styles.day,
                  {
                    borderRadius: radius.pill,
                    // A filled circle for a workout, a ring for today: the two
                    // never rely on colour alone to tell each other apart.
                    // Filled for a workout, tinted for recovery, a ring for
                    // today. A rest day reads as something that happened, not
                    // as an empty square.
                    backgroundColor: trained
                      ? colors.accent
                      : rested
                        ? colors.primarySoft
                        : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                    borderColor: isToday ? colors.primary : 'transparent',
                  },
                ]}
              >
                {rested ? (
                  <Ionicons name="bed-outline" size={14} color={colors.primaryText} />
                ) : (
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: trained
                          ? colors.onAccent
                          : isToday
                            ? colors.primary
                            : colors.textMuted,
                        fontWeight: trained || isToday ? '700' : '400',
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: colors.accent, borderRadius: radius.pill },
            ]}
          >
            <Ionicons name="checkmark" size={9} color={colors.onAccent} />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Workout logged</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: colors.primarySoft, borderRadius: radius.pill },
            ]}
          >
            <Ionicons name="bed-outline" size={9} color={colors.primaryText} />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Rest day</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: colors.primary,
              },
            ]}
          />
          <Text style={[typography.caption, { color: colors.textMuted }]}>Today</Text>
        </View>
      </View>

    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  /**
   * A seventh of whatever width the card has, so the grid always lays out
   * seven to a row on a narrow phone and on an iPad alike, with no hard-coded
   * width anywhere. The row height comes from the day marker rather than from
   * that width: a square cell would give an iPad rows as tall as the columns
   * are wide, and a calendar the height of the screen.
   */
  cell: {
    width: `${100 / DAYS_PER_WEEK}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  /**
   * Round, and at least a comfortable tap target, but free to grow if the OS
   * text size is turned up — hence minimums rather than fixed dimensions.
   */
  day: {
    minWidth: 34,
    minHeight: 34,
    aspectRatio: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
});
