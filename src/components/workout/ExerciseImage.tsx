import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { exerciseImage } from '@/lib/exercise-images';
import { useTheme } from '@/theme/ThemeProvider';
import type { MuscleGroup } from '@/types/database';

/**
 * The picture for an exercise, at one of three sizes.
 *
 * Every exercise renders something: a bundled photograph where one exists,
 * and otherwise a muscle-group icon on a tinted tile. Custom exercises the
 * user created have no photograph by definition, so the fallback is the
 * normal case rather than an error state.
 *
 * The photographs are light-background studio shots, so they sit on a plain
 * surface tile with the same rounding as the rest of the app rather than
 * bleeding into the dark theme.
 */

const MUSCLE_ICONS: Record<MuscleGroup, keyof typeof Ionicons.glyphMap> = {
  chest: 'body-outline',
  back: 'body-outline',
  shoulders: 'barbell-outline',
  biceps: 'barbell-outline',
  triceps: 'barbell-outline',
  legs: 'walk-outline',
  glutes: 'walk-outline',
  core: 'ellipse-outline',
  cardio: 'heart-outline',
  full_body: 'accessibility-outline',
};

const SIZES = {
  sm: { box: 44, icon: 20 },
  md: { box: 64, icon: 26 },
  /** Wide banner for the top of a detail screen or the Home card. */
  lg: { box: 0, icon: 40 },
} as const;

export function ExerciseImage({
  name,
  muscle,
  size = 'sm',
  style,
}: {
  name: string | null | undefined;
  muscle?: MuscleGroup | null;
  size?: keyof typeof SIZES;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius } = useTheme();
  const [failed, setFailed] = useState(false);

  const source = exerciseImage(name);
  const { box, icon } = SIZES[size];
  const isBanner = size === 'lg';

  const frame: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surfaceAlt,
      borderRadius: isBanner ? radius.lg : radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    isBanner ? { width: '100%', aspectRatio: 16 / 9 } : { width: box, height: box },
    style,
  ];

  if (!source || failed) {
    return (
      <View style={frame} accessibilityElementsHidden importantForAccessibility="no">
        <Ionicons
          name={muscle ? MUSCLE_ICONS[muscle] : 'barbell-outline'}
          size={icon}
          color={colors.textSubtle}
        />
      </View>
    );
  }

  return (
    <View style={frame} accessibilityElementsHidden importantForAccessibility="no">
      <Image
        source={source}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        // A bundled asset should never fail, but a corrupt or missing one
        // must not leave a blank hole where the picture should be.
        onError={() => setFailed(true)}
      />
    </View>
  );
}
