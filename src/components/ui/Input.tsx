import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  helper?: string;
  /** Adds a show/hide toggle and hides the text by default. */
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  secure = false,
  suffix,
  containerStyle,
  // Pulled out of `rest` so a caller can watch focus without replacing the
  // handlers that drive the focused border below.
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors, radius, typography, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: focused || error ? 2 : 1,
            // keep the height identical whether or not the border is thick
            paddingHorizontal: focused || error ? 13 : 14,
          },
        ]}
      >
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          style={[
            styles.input,
            { color: colors.text, fontSize: typography.body.fontSize },
          ]}
        />

        {suffix ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{suffix}</Text>
        ) : null}

        {secure ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          {/* An icon as well as colour: status is never conveyed by colour alone. */}
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH_TARGET + 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
