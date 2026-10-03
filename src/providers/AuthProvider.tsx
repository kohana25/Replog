import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import * as authService from '@/services/auth';
import { getProfile } from '@/services/profile';
import type { ProfileRow } from '@/types/database';
import { useSettings } from './SettingsProvider';

/**
 * Authentication bootstrap.
 *
 * `isBootstrapping` stays true until the stored session has been read from
 * the device keystore. The root layout renders nothing but a splash while
 * that is happening, which is what stops the Login screen flashing for a
 * user who is in fact already signed in.
 */

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  /** True only during the initial session restore. */
  isBootstrapping: boolean;
  isProfileLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: authService.SignUpInput) => Promise<authService.SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileRow) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrateFromProfile } = useSettings();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<ProfileRow | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadedProfileFor = useRef<string | null>(null);

  /* ---------------- 1. restore the stored session on launch -------------- */
  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured) {
      setIsBootstrapping(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const restored = await authService.getSession();
        if (!cancelled) setSession(restored);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    /* -------------- 2. keep following auth state after that -------------- */
    const subscription = authService.listenToAuthChanges((next, event) => {
      if (cancelled) return;
      setSession(next);
      if (event === 'SIGNED_OUT') {
        setProfileState(null);
        loadedProfileFor.current = null;
      }
      // A token refresh or sign-in arriving late must also end bootstrapping.
      setIsBootstrapping(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /* ------------------ 3. load the profile for the user ------------------ */
  const userId = session?.user?.id ?? null;

  const loadProfile = useCallback(
    async (id: string) => {
      setIsProfileLoading(true);
      try {
        const next = await getProfile(id);
        setProfileState(next);
        hydrateFromProfile(next);
        loadedProfileFor.current = id;
      } catch {
        // Leaving profile null is survivable: screens fall back to the
        // username and the user can retry from Profile.
        setProfileState(null);
      } finally {
        setIsProfileLoading(false);
      }
    },
    [hydrateFromProfile],
  );

  useEffect(() => {
    if (!userId) return;
    if (loadedProfileFor.current === userId) return;
    void loadProfile(userId);
  }, [userId, loadProfile]);

  /* ----------------------------- actions ------------------------------- */

  const signIn = useCallback(async (username: string, password: string) => {
    const next = await authService.signIn(username, password);
    setSession(next);
  }, []);

  const signUp = useCallback(async (input: authService.SignUpInput) => {
    const result = await authService.signUp(input);
    if (result.session) setSession(result.session);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setProfileState(null);
    loadedProfileFor.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId);
  }, [userId, loadProfile]);

  const setProfile = useCallback(
    (next: ProfileRow) => {
      setProfileState(next);
      hydrateFromProfile(next);
    },
    [hydrateFromProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isBootstrapping,
      isProfileLoading,
      isAuthenticated: Boolean(session),
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setProfile,
    }),
    [
      session,
      profile,
      isBootstrapping,
      isProfileLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
