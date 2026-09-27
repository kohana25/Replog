import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: padded ? spacing.lg : 0,
    },
    elevation.card,
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, { opacity: pressed ? 0.75 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'warning' | 'danger';

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, radius, typography } = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };

  const { bg, fg } = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.sm }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[typography.micro, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Selectable filter pill. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors, radius, typography } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          typography.caption,
          { color: selected ? colors.onPrimary : colors.textMuted, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.sectionHeader, { marginBottom: spacing.md }]}>
      <Text
        accessibilityRole="header"
        style={[typography.h3, { color: colors.text, flex: 1 }]}
      >
        {title}
      </Text>
      {action && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="button"
          hitSlop={8}
          style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius, typography, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      style={[
        {
          flex: 1,
          minWidth: 140,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: 2,
        },
        style,
      ]}
    >
      <View style={styles.statLabelRow}>
        {icon ? <Ionicons name={icon} size={13} color={colors.textMuted} /> : null}
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[typography.metricSm, { color: colors.text }]}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={[typography.caption, { color: colors.textSubtle }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  tone = 'primary',
}: {
  value: number;
  max: number;
  label?: string;
  tone?: 'primary' | 'accent';
}) {
  const { colors, radius } = useTheme();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? `${value} of ${max}`}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{
        height: 10,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: tone === 'accent' ? colors.accent : colors.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
