import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from './Card';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * Wrapping set of selectable chips. Used for filters and for every
 * single-choice field (fitness goal, experience, units, rest length) so the
 * app never needs a platform picker.
 */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  allowClear = false,
  clearLabel = 'All',
}: {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        {allowClear ? (
          <Chip label={clearLabel} selected={value === null} onPress={() => onChange(null)} />
        ) : null}
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(value === option.value && allowClear ? null : option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
