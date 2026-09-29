import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from './Sheet';
import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

/**
 * A small "what does this mean?" button that opens an explanation.
 *
 * For metrics whose name is not self-explanatory — Volume being the obvious
 * one. The icon is quiet so it does not compete with the number it sits
 * beside, but its touch target is still a full 44pt.
 */
export function InfoHint({
  title,
  children,
  accessibilityLabel,
}: {
  title: string;
  children: React.ReactNode;
  /** Defaults to "What is <title>?". */
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `What is ${title}?`}
        hitSlop={12}
        style={({ pressed }) => ({
          minWidth: MIN_TOUCH_TARGET / 2,
          minHeight: MIN_TOUCH_TARGET / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="information-circle-outline" size={17} color={colors.textSubtle} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}

/** The body of the Volume explanation — used on Home and on Progress. */
export function VolumeExplainer() {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
        Volume is the total amount of weight you have lifted — every set multiplied by its reps
        and the weight on the bar, added up.
      </Text>

      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: 12,
          padding: spacing.lg,
          gap: spacing.xs,
        }}
      >
        <Text style={[typography.caption, { color: colors.textMuted }]}>For example</Text>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          3 sets × 10 reps × 20 kg = 600 kg
        </Text>
      </View>

      <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
        It is useful for seeing how much total work you are doing over time — a session can be
        harder than the last one without any single lift going up. It is one signal among
        several, not a score to chase.
      </Text>
    </View>
  );
}
