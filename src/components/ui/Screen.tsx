import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap the content in a ScrollView. Turn off for FlatList screens. */
  scroll?: boolean;
  /** Lift content above the keyboard — use on any screen with text inputs. */
  keyboardAware?: boolean;
  /** Extra bottom padding, e.g. to clear a sticky action bar. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  /** Skip the horizontal gutter (full-bleed lists). */
  edgeToEdge?: boolean;
}

/**
 * Every screen sits inside this.
 *
 * It owns three things so no individual screen has to think about them:
 *  - the safe area (nothing lands under a notch or the home indicator)
 *  - the responsive horizontal gutter
 *  - capping content width on tablets instead of stretching the phone layout
 */
export function Screen({
  children,
  scroll = true,
  keyboardAware = false,
  bottomInset = 0,
  contentStyle,
  style,
  refreshControl,
  edgeToEdge = false,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const { gutter, contentMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const inner: StyleProp<ViewStyle> = [
    {
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: edgeToEdge ? 0 : gutter,
    },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        {
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing['3xl'] + bottomInset,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View style={inner}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner]}>{children}</View>
  );

  const content = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }, style]}>{content}</View>
  );
}

/** Page title + optional subtitle, used at the top of most screens. */
export function ScreenHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.heading, { marginBottom: spacing.xl }]}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.body, { color: colors.textMuted, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});
