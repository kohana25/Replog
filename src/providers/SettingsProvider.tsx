import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ProfileRow, ThemePreference, UnitPreference } from '@/types/database';

/**
 * App settings live in two places on purpose:
 *
 *  - AsyncStorage, so the app can render with the right theme and units on
 *    the very first frame, before any network call resolves.
 *  - The `profiles` row, so the preference follows the user to another device.
 *
 * AsyncStorage (not SecureStore) is correct here: none of this is sensitive.
 */

const STORAGE_KEY = 'replog.settings.v1';

export interface AppSettings {
  theme: ThemePreference;
  unit: UnitPreference;
  defaultRestSeconds: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Movara is a dark-first product: its palette is sampled from a logo on a
  // near-black field, and that is the design the app is built around. Light
  // and System remain available in Settings for anyone who prefers them.
  theme: 'dark',
  unit: 'kg',
  defaultRestSeconds: 90,
};

interface SettingsContextValue {
  settings: AppSettings;
  /** False until the stored settings have been read. */
  isReady: boolean;
  /** Update locally + persist. Returns the merged settings. */
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  /** Adopt the server-side preferences after the profile loads. */
  hydrateFromProfile: (profile: ProfileRow | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function sanitize(raw: unknown): AppSettings {
  const value = (raw ?? {}) as Partial<AppSettings>;
  const theme: ThemePreference =
    value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
      ? value.theme
      : DEFAULT_SETTINGS.theme;
  const unit: UnitPreference = value.unit === 'lb' ? 'lb' : 'kg';
  const rest =
    typeof value.defaultRestSeconds === 'number' &&
    Number.isFinite(value.defaultRestSeconds) &&
    value.defaultRestSeconds >= 0 &&
    value.defaultRestSeconds <= 3600
      ? Math.round(value.defaultRestSeconds)
      : DEFAULT_SETTINGS.defaultRestSeconds;

  return { theme, unit, defaultRestSeconds: rest };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          setSettings(sanitize(JSON.parse(stored)));
        }
      } catch {
        // corrupt or unreadable settings just fall back to defaults
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: AppSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // non-fatal: the in-memory value is still correct for this session
    }
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = sanitize({ ...settings, ...patch });
      setSettings(next);
      await persist(next);
      return next;
    },
    [persist, settings],
  );

  const hydrateFromProfile = useCallback(
    (profile: ProfileRow | null) => {
      if (!profile) return;
      const next = sanitize({
        theme: profile.theme_preference,
        unit: profile.unit_preference,
        defaultRestSeconds: profile.default_rest_seconds,
      });
      setSettings((current) => {
        const changed =
          current.theme !== next.theme ||
          current.unit !== next.unit ||
          current.defaultRestSeconds !== next.defaultRestSeconds;
        if (!changed) return current;
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isReady, updateSettings, hydrateFromProfile }),
    [settings, isReady, updateSettings, hydrateFromProfile],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}

/** Convenience hook — the unit preference is needed on almost every screen. */
export function useUnit(): UnitPreference {
  return useSettings().settings.unit;
}
