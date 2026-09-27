import React, { createContext, useContext } from 'react';
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

/**
 * Tells a nested <AppBar> that the safe-area top inset has already been
 * applied by the Screen around it, so it does not add a second one.
 */
const TopInsetAppliedContext = createContext(false);

export function useTopInsetApplied(): boolean {
  return useContext(TopInsetAppliedContext);
}

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
  /**
   * Skip the safe-area top padding. Only for a screen that positions its own
   * content against the very top of the display.
   */
  topInset?: boolean;
}

/**
 * Every screen sits inside this.
 *
 * It owns three things so no individual screen has to think about them:
 *  - the safe area (nothing lands under a notch, a status bar or the home
 *    indicator — the top inset comes from the device, so it is right on a
 *    phone, on a tablet, and in either orientation)
 *  - the responsive horizontal gutter
 *  - capping content width on tablets instead of stretching the phone layout
 *
 * A screen that renders its own <AppBar> needs no extra work: the AppBar sees
 * that the inset is already applied here and stops adding its own.
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
  topInset = true,
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

  // Padding rather than a margin, so scrolled content still passes under the
  // status bar instead of being clipped by a gap.
  const paddingTop = (topInset ? insets.top : 0) + spacing.lg;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        {
          paddingTop,
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
    <View style={[styles.flex, { paddingTop }, inner]}>{children}</View>
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
    <TopInsetAppliedContext.Provider value={topInset}>
      <View style={[styles.flex, { backgroundColor: colors.background }, style]}>{content}</View>
    </TopInsetAppliedContext.Provider>
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
