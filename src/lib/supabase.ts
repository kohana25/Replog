/**
 * The single Supabase client for the whole app.
 *
 * Import this module anywhere; it is created exactly once per JS runtime.
 * Never call createClient() inside a component.
 */

import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';
import { SecureSessionStorage } from './secure-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/**
 * True when both environment variables are present. The root layout shows a
 * setup screen instead of crashing when they are missing, which is a much
 * friendlier first-run experience than a red box.
 */
export const isSupabaseConfigured =
  url.startsWith('http') && publishableKey.length > 20;

export const supabase = createClient<Database>(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? publishableKey : 'placeholder-key',
  {
    auth: {
      // Sessions are written to the device keystore, chunked as needed.
      storage: SecureSessionStorage,
      // Restore the stored session on launch — this is what keeps the user
      // logged in after the app is closed and reopened.
      persistSession: true,
      // Refresh the access token before it expires.
      autoRefreshToken: true,
      // Sign-in is username and password only — no emailed link ever carries
      // a session back into the app, so there is no URL to parse.
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application-name': 'replog' },
    },
  },
);

/**
 * Supabase's auto-refresh uses a timer, which the OS suspends when the app is
 * backgrounded. Tying it to AppState means the token is refreshed as soon as
 * the user comes back rather than failing the first request.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
