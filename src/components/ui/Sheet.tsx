import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';
import { IconButton } from './Button';

/**
 * Bottom sheet built on the platform Modal — no extra native dependency, so
 * it works in Expo Go everywhere.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { height, isWide } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        {/* Tapping the dimmed area closes the sheet. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: height * (isWide ? 0.8 : 0.88),
            paddingBottom: insets.bottom,
            width: '100%',
            maxWidth: isWide ? 620 : undefined,
            alignSelf: 'center',
          }}
        >
          <View
            style={[
              styles.header,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderColor: colors.border },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[typography.h3, { color: colors.text, flex: 1 }]}
            >
              {title}
            </Text>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
          </View>

          <View style={{ flexShrink: 1 }}>{children}</View>

          {footer ? (
            <View
              style={{
                padding: spacing.lg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
