import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';

export default function WelcomeScreen() {
  const { colors, typography, spacing } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={[styles.container, { paddingTop: insets.top + spacing['4xl'] }]}>
        <View style={{ alignItems: 'center', gap: spacing.lg }}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={{ width: isWide ? 120 : 96, height: isWide ? 120 : 96 }}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="RepLog logo"
          />
          <Text
            accessibilityRole="header"
            style={[typography.display, { color: colors.text, textAlign: 'center' }]}
          >
            RepLog
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, textAlign: 'center', maxWidth: 320, lineHeight: 23 },
            ]}
          >
            Plan your routines, log every set in seconds, and watch the numbers go up. Your
            training notebook, without the notebook.
          </Text>
        </View>

        <View style={{ gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
          <Button label="Get started" onPress={() => router.push('/(auth)/signup')} size="lg" />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', gap: 32 },
});
