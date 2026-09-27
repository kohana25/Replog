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
  /** True after a password-recovery deep link is opened. */
  isRecovering: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: authService.SignUpInput) => Promise<authService.SignUpResult>;
  /**
   * Exchange the emailed 6-digit code for a session. Verifying is also what
   * signs the new user in, which is why sign-up never returns to Login.
   */
  verifyEmailCode: (email: string, code: string) => Promise<Session>;
  resendVerificationCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: ProfileRow) => void;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrateFromProfile } = useSettings();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<ProfileRow | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

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
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true);
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
        // account email and the user can retry from Profile.
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

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await authService.signIn(email, password);
    setSession(next);
  }, []);

  const signUp = useCallback(async (input: authService.SignUpInput) => {
    const result = await authService.signUp(input);
    if (result.session) setSession(result.session);
    return result;
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const next = await authService.verifyEmailCode(email, code);
    setSession(next);
    return next;
  }, []);

  const resendVerificationCode = useCallback(async (email: string) => {
    await authService.resendVerificationCode(email);
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

  const clearRecovery = useCallback(() => setIsRecovering(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isBootstrapping,
      isProfileLoading,
      isAuthenticated: Boolean(session),
      isRecovering,
      signIn,
      signUp,
      verifyEmailCode,
      resendVerificationCode,
      signOut,
      refreshProfile,
      setProfile,
      clearRecovery,
    }),
    [
      session,
      profile,
      isBootstrapping,
      isProfileLoading,
      isRecovering,
      signIn,
      signUp,
      verifyEmailCode,
      resendVerificationCode,
      signOut,
      refreshProfile,
      setProfile,
      clearRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
