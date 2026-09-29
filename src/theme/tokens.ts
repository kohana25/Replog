/**
 * Design tokens. Screens never hardcode a hex value — they read from
 * `useTheme()`, which returns one of these palettes.
 *
 * MOVARA PALETTE
 * The brand colours are sampled from the Movara logo rather than guessed:
 * the mark runs a gradient from cyan at the top to electric blue at the
 * bottom, on a near-black field.
 *
 *   #05070B  the logo's own background      -> app background
 *   #0060FC  the blue at the foot of the mark -> primary
 *   #3FE6FD  the cyan at its head             -> accent / highlight
 *
 * Surfaces are a charcoal-navy ramp built from that background so cards
 * lift off it without going grey, and text is an off-white tuned to clear
 * WCAG AA on every surface below.
 */

export const palette = {
  /** Sampled from the logo: the blue at the bottom of the gradient. */
  blue500: '#0060FC',
  blue600: '#0052DC',
  blue700: '#0041B0',
  blue300: '#4DA3FF',
  blue100: '#CFE3FF',
  blue950: '#08203F',

  /** Sampled from the logo: the cyan at the top of the gradient. */
  cyan400: '#3FE6FD',
  cyan500: '#12CDEA',
  cyan100: '#CBF6FF',
  cyan950: '#062731',

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

  slate50: '#F5F8FC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  /** Charcoal-navy ramp for dark surfaces, keyed to the logo background. */
  ink700: '#223047',
  ink800: '#18212F',
  ink900: '#111823',
  ink950: '#0B1017',
  /** The logo's own backdrop — the darkest surface in the app. */
  ink1000: '#05070B',

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
  /**
   * The brand blue as *text or an icon* on a surface.
   *
   * `primary` is the fill behind white button text, so it has to stay dark
   * enough for that (white on it is 5.15:1). That same blue only reaches
   * 2.6:1 as small text on a raised card, which fails. This is the lighter
   * tone to use whenever the brand colour is the foreground rather than the
   * background.
   */
  primaryText: string;

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

  text: palette.ink900,
  textMuted: palette.slate500,
  textSubtle: palette.slate400,
  textInverse: palette.white,

  primary: palette.blue600,
  primaryDark: palette.blue700,
  primarySoft: palette.blue100,
  onPrimary: palette.white,
  primaryText: palette.blue700,

  accent: palette.cyan500,
  accentSoft: palette.cyan100,
  onAccent: palette.ink1000,

  danger: palette.red600,
  dangerSoft: palette.red100,
  warning: palette.amber500,
  warningSoft: palette.amber100,

  successRow: '#ECFDF5',
  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: palette.slate200,
};

export const darkColors: ThemeColors = {
  background: palette.ink1000,
  surface: palette.ink900,
  surfaceAlt: palette.ink800,
  surfaceRaised: palette.ink700,
  border: '#1C2836',
  borderStrong: '#2C3E55',

  text: palette.slate50,
  textMuted: '#9BA9BC',
  textSubtle: '#6B7A8F',
  textInverse: palette.ink1000,

  primary: palette.blue500,
  primaryDark: palette.blue600,
  primarySoft: palette.blue950,
  onPrimary: palette.white,
  primaryText: palette.blue300,

  accent: palette.cyan400,
  accentSoft: palette.cyan950,
  onAccent: palette.ink1000,

  danger: palette.red500,
  dangerSoft: palette.red950,
  warning: palette.amber500,
  warningSoft: palette.amber950,

  successRow: '#0A2335',
  overlay: 'rgba(5, 7, 11, 0.72)',
  skeleton: '#1B2532',
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
    shadowColor: '#05070B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#05070B',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
