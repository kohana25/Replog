import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './Button';
import { useTopInsetApplied } from './Screen';

/**
 * App-wide top bar. We render our own rather than using the native stack
 * header so the colours follow the theme exactly on both platforms.
 *
 * Inside a <Screen> the safe-area top inset is already applied around it, so
 * the bar only adds its own breathing room. Used on its own (a FlatList
 * screen, say) it clears the status bar itself.
 */
export function AppBar({
  title,
  subtitle,
  right,
  onBack,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const topInsetApplied = useTopInsetApplied();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: (topInsetApplied ? 0 : insets.top) + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {showBack ? (
        <IconButton
          icon="chevron-back"
          onPress={handleBack}
          accessibilityLabel="Go back"
          color={colors.text}
          size={26}
        />
      ) : (
        <View style={{ width: spacing.sm }} />
      )}

      <View style={styles.titles}>
        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={[typography.h3, { color: colors.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: { flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
