import React from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * The Movara logo, optionally with the wordmark beside it.
 *
 * One component so the mark is never resized or re-labelled ad hoc: the
 * header, the welcome screen and anywhere else it appears all draw it the
 * same way, at one of three sizes.
 *
 * The asset is the logo with its backdrop removed, so it sits on any surface
 * without a black box around it.
 */

const MARK = require('@/assets/images/movara-logo.png');

/** The mark is much wider than it is tall — height drives the layout. */
const ASPECT = 512 / 214;

const SIZES = {
  sm: { height: 22, word: 'h3' },
  md: { height: 30, word: 'h2' },
  lg: { height: 72, word: 'display' },
} as const;

export function BrandMark({
  size = 'md',
  showWordmark = true,
  style,
}: {
  size?: keyof typeof SIZES;
  /** False for places that already say "Movara" in text nearby. */
  showWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, typography, spacing } = useTheme();
  const { height, word } = SIZES[size];

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, style]}
      accessible
      accessibilityRole="header"
      accessibilityLabel="Movara"
    >
      <Image
        source={MARK}
        style={{ height, width: height * ASPECT }}
        resizeMode="contain"
        // The wordmark beside it carries the name for screen readers, so the
        // image itself is decorative and should not be announced twice.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {showWordmark ? (
        <Text style={[typography[word], { color: colors.text, letterSpacing: 0.2 }]}>Movara</Text>
      ) : null}
    </View>
  );
}
