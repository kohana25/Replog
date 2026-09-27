import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

/**
 * The three states every data screen needs.
 *
 * Screens show LoadingState first and only fall through to EmptyState once
 * loading has finished — never "empty, then suddenly populated".
 */

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      style={[styles.center, { paddingVertical: spacing['4xl'], gap: spacing.md }]}
    >
      <ActivityIndicator color={colors.primary} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.center, { paddingVertical: spacing['3xl'], gap: spacing.sm }]}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <Ionicons name={icon} size={26} color={colors.textMuted} />
      </View>
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, minWidth: 200 }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  hint = 'Check your connection and try again.',
  onRetry,
}: {
  message?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.center, { paddingVertical: spacing['3xl'], gap: spacing.sm }]}>
      <Ionicons name="cloud-offline-outline" size={30} color={colors.textMuted} />
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>{message}</Text>
      <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
        {hint}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md, minWidth: 160 }}>
          <Button label="Retry" variant="secondary" onPress={onRetry} icon="refresh" />
        </View>
      ) : null}
    </View>
  );
}

/** Inline, non-blocking error message (e.g. above a form's submit button). */
export function InlineError({ message }: { message: string | null }) {
  const { colors, typography, radius, spacing } = useTheme();
  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.dangerSoft,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
