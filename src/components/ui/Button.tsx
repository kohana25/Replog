import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  /** Shown beside the spinner while `loading`, e.g. "Creating your account…". */
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Defaults to the label; set this when the label alone is ambiguous. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  loadingLabel,
  fullWidth = true,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors, radius, typography } = useTheme();
  const isDisabled = disabled || loading;

  const height = size === 'sm' ? 38 : size === 'lg' ? 54 : MIN_TOUCH_TARGET + 4;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 17 : typography.button.fontSize;

  const background: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.danger,
    accent: colors.accent,
  };

  const foreground: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    secondary: colors.text,
    ghost: colors.primary,
    danger: colors.onPrimary,
    accent: colors.onAccent,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={(loading ? loadingLabel : null) ?? accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: radius.md,
          backgroundColor: background[variant],
          borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'secondary' ? colors.border : 'transparent',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? 16 : 20,
        },
        style,
      ]}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator color={foreground[variant]} />
          {loadingLabel ? (
            <Text
              numberOfLines={1}
              style={[styles.label, { color: foreground[variant], fontSize }]}
            >
              {loadingLabel}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={fontSize + 3} color={foreground[variant]} />
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.label, { color: foreground[variant], fontSize }]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={fontSize + 3} color={foreground[variant]} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/** Compact icon-only control. Always requires an accessibility label. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  disabled = false,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
