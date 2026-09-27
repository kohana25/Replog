import { useWindowDimensions } from 'react-native';

import { spacing } from './tokens';

export type Breakpoint = 'small' | 'phone' | 'tablet' | 'large';

export interface Responsive {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  /** Narrow phones (< 360dp) — tighten padding, shrink optional columns. */
  isSmall: boolean;
  isTablet: boolean;
  isLarge: boolean;
  /** Landscape phones and tablets can afford side-by-side content. */
  isWide: boolean;
  /** Horizontal screen padding for the current width. */
  gutter: number;
  /** Cap line length on tablets instead of stretching the phone UI. */
  contentMaxWidth: number;
  /** Sensible column count for card grids. */
  columns: number;
}

/**
 * Breakpoints follow the ranges in the project brief:
 *   small  < 360
 *   phone  360–767
 *   tablet 768–1023
 *   large  1024+
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  let breakpoint: Breakpoint = 'phone';
  if (width < 360) breakpoint = 'small';
  else if (width >= 1024) breakpoint = 'large';
  else if (width >= 768) breakpoint = 'tablet';

  const isSmall = breakpoint === 'small';
  const isTablet = breakpoint === 'tablet';
  const isLarge = breakpoint === 'large';
  const isWide = isTablet || isLarge;

  const gutter = isSmall ? spacing.md : isWide ? spacing['3xl'] : spacing.lg;
  const contentMaxWidth = isLarge ? 900 : isTablet ? 760 : width;
  const columns = isLarge ? 3 : isTablet ? 2 : 1;

  return {
    width,
    height,
    breakpoint,
    isSmall,
    isTablet,
    isLarge,
    isWide,
    gutter,
    contentMaxWidth,
    columns,
  };
}
