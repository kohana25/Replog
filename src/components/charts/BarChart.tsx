import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional longer description used for the accessibility summary. */
  description?: string;
}

/**
 * Bar chart built from plain Views — no chart dependency, nothing to break in
 * Expo Go, and it inherits the theme automatically.
 *
 * Every chart in the app carries a text summary as well, because a picture on
 * its own is not accessible to a screen reader.
 */
export function BarChart({
  data,
  height = 140,
  unitSuffix = '',
  highlightLast = true,
  emptyMessage = 'No data yet.',
}: {
  data: BarDatum[];
  height?: number;
  unitSuffix?: string;
  highlightLast?: boolean;
  emptyMessage?: string;
}) {
  const { colors, typography, radius, spacing } = useTheme();

  const max = Math.max(...data.map((item) => item.value), 0);

  if (data.length === 0 || max <= 0) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted }]}>{emptyMessage}</Text>
    );
  }

  const summary = data
    .map((item) => `${item.label}: ${Math.round(item.value)}${unitSuffix}`)
    .join(', ');

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessible
        accessibilityLabel={summary}
        style={[styles.plot, { height }]}
      >
        {data.map((item, index) => {
          const isLast = index === data.length - 1;
          const ratio = max > 0 ? item.value / max : 0;
          return (
            <View key={`${item.label}-${index}`} style={styles.column}>
              <View style={styles.barArea}>
                <View
                  style={{
                    width: '70%',
                    height: `${Math.max(ratio * 100, item.value > 0 ? 4 : 1)}%`,
                    backgroundColor:
                      highlightLast && isLast ? colors.primary : colors.primarySoft,
                    borderRadius: radius.sm,
                  }}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[typography.micro, { color: colors.textSubtle, marginTop: 6 }]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  column: { flex: 1, alignItems: 'center', height: '100%' },
  barArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
});
