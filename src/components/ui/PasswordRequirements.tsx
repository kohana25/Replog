import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { checkPasswordRequirements } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The live password checklist.
 *
 * It re-renders on every keystroke of the field above it, so a requirement
 * flips the moment it is satisfied rather than waiting for a submit. Met
 * requirements turn green *and* swap the outline circle for a filled check —
 * status is never carried by colour alone.
 *
 * The sign-up screen mounts this only while the password field has focus, so
 * it fades itself in rather than snapping into the form.
 */
export function PasswordRequirements({
  password,
  label = 'Password requirements:',
}: {
  password: string;
  label?: string;
}) {
  const { colors, typography, spacing } = useTheme();
  const requirements = checkPasswordRequirements(password);
  const metCount = requirements.filter((requirement) => requirement.met).length;

  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(appear, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [appear]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${label} ${metCount} of ${requirements.length} met. ${requirements
        .map((requirement) => `${requirement.label}: ${requirement.met ? 'met' : 'not met'}`)
        .join('. ')}`}
      accessibilityLiveRegion="polite"
      style={{ gap: spacing.xs, opacity: appear }}
    >
      <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
        {label}
      </Text>

      {requirements.map((requirement) => (
        <View key={requirement.id} style={styles.row}>
          <Ionicons
            name={requirement.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={requirement.met ? colors.accent : colors.textSubtle}
          />
          <Text
            style={[
              typography.caption,
              {
                color: requirement.met ? colors.accent : colors.textMuted,
                fontWeight: requirement.met ? '600' : '400',
                flex: 1,
              },
            ]}
          >
            {requirement.label}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
