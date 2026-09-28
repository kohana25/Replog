import { Ionicons } from '@expo/vector-icons';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isSupabaseConfigured } from '@/lib/supabase';
import { ActiveWorkoutProvider } from '@/providers/ActiveWorkoutProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { SettingsProvider, useSettings } from '@/providers/SettingsProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { darkColors } from '@/theme/tokens';

// Keep the native splash up until we know whether the user is signed in.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <AuthProvider>
              <ActiveWorkoutProvider>
                <RootNavigator />
              </ActiveWorkoutProvider>
            </AuthProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { isReady: settingsReady } = useSettings();
  const { isBootstrapping, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const booting = isBootstrapping || !settingsReady;

  /* Hide the splash only once the stored session has been read. */
  useEffect(() => {
    if (!booting) void SplashScreen.hideAsync();
  }, [booting]);

  /**
   * Auth routing. This runs only after bootstrapping, which is what prevents
   * the Login screen flashing for a user whose session is still being read
   * from the keystore.
   */
  useEffect(() => {
    if (booting || !isSupabaseConfigured) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [booting, isAuthenticated, segments, router]);

  if (!isSupabaseConfigured) return <SetupNotice />;

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="workout/active"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="workout/complete"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

/**
 * Shown when EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY are missing.
 * Far friendlier than throwing at import time.
 */
function SetupNotice() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: darkColors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        gap: 14,
      }}
    >
      <Ionicons name="construct-outline" size={40} color={darkColors.primary} />
      <Text style={{ color: darkColors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
        Finish the Supabase setup
      </Text>
      <Text style={{ color: darkColors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
        Copy <Text style={{ color: darkColors.text }}>.env.example</Text> to{' '}
        <Text style={{ color: darkColors.text }}>.env</Text>, add your project URL and publishable
        key, then restart the dev server with{' '}
        <Text style={{ color: darkColors.text }}>npx expo start -c</Text>.
      </Text>
      <Text style={{ color: darkColors.textSubtle, fontSize: 13, textAlign: 'center' }}>
        The full walkthrough is in README.md.
      </Text>
    </View>
  );
}
