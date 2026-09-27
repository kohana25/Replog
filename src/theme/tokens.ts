/**
 * Design tokens. Screens never hardcode a hex value — they read from
 * `useTheme()`, which returns one of these palettes.
 *
 * The palette is original to RepLog: a blue/green athletic scheme on a
 * slate neutral ramp, tuned so that text hits WCAG AA contrast on both
 * the light and dark surfaces.
 */

export const palette = {
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue500: '#3B82F6',
  blue100: '#DBEAFE',
  blue950: '#172554',

  green500: '#22C55E',
  green600: '#16A34A',
  green100: '#DCFCE7',
  green950: '#052E16',

  amber500: '#F59E0B',
  amber100: '#FEF3C7',
  amber950: '#451A03',

  red500: '#EF4444',
  red600: '#DC2626',
  red100: '#FEE2E2',
  red950: '#450A0A',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;

  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;

  accent: string;
  accentSoft: string;
  onAccent: string;

  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;

  /** Row highlight for a completed set. */
  successRow: string;
  overlay: string;
  skeleton: string;
}

export const lightColors: ThemeColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceAlt: palette.slate100,
  surfaceRaised: palette.white,
  border: palette.slate200,
  borderStrong: palette.slate300,

  text: palette.slate900,
  textMuted: palette.slate500,
  textSubtle: palette.slate400,
  textInverse: palette.white,

  primary: palette.blue600,
  primaryDark: palette.blue700,
  primarySoft: palette.blue100,
  onPrimary: palette.white,

  accent: palette.green600,
  accentSoft: palette.green100,
  onAccent: palette.white,

  danger: palette.red600,
  dangerSoft: palette.red100,
  warning: palette.amber500,
  warningSoft: palette.amber100,

  successRow: '#ECFDF5',
  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: palette.slate200,
};

export const darkColors: ThemeColors = {
  background: palette.slate900,
  surface: palette.slate800,
  surfaceAlt: '#18253C',
  surfaceRaised: '#243349',
  border: '#2F3F57',
  borderStrong: '#3E5070',

  text: palette.slate50,
  textMuted: palette.slate400,
  textSubtle: palette.slate500,
  textInverse: palette.slate900,

  primary: palette.blue500,
  primaryDark: palette.blue600,
  primarySoft: palette.blue950,
  onPrimary: palette.white,

  accent: palette.green500,
  accentSoft: palette.green950,
  onAccent: palette.slate900,

  danger: palette.red500,
  dangerSoft: palette.red950,
  warning: palette.amber500,
  warningSoft: palette.amber950,

  successRow: '#10291E',
  overlay: 'rgba(2, 6, 23, 0.65)',
  skeleton: '#2A3A52',
};

/** 4-point spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Type scale. Sizes are in points and respect the OS text-size setting
 * because React Native scales fontSize by default (we never disable it).
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '400' as const },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
  /** Workout numbers: big, tabular, instantly scannable. */
  metric: { fontSize: 28, lineHeight: 33, fontWeight: '700' as const },
  metricSm: { fontSize: 20, lineHeight: 24, fontWeight: '700' as const },
} as const;

/** Minimum touch target, per platform accessibility guidance. */
export const MIN_TOUCH_TARGET = 44;

export const elevation = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
