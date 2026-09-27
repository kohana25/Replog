/**
 * Unit handling.
 *
 * RULE: the database only ever stores kilograms and centimetres.
 * `unit_preference` is a display setting. Everything entered by the user is
 * converted to kg at the edge (parseWeightInput) and converted back for
 * display (formatWeight / toDisplayWeight). Nothing in between mixes units.
 */

import type { UnitPreference } from '@/types/database';

const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

/** Convert a stored kilogram value into the user's chosen unit. */
export function toDisplayWeight(kg: number | null | undefined, unit: UnitPreference): number | null {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return null;
  return unit === 'lb' ? kgToLb(kg) : kg;
}

/** Convert a number the user typed (in their unit) into kilograms. */
export function toStorageWeight(value: number, unit: UnitPreference): number {
  const kg = unit === 'lb' ? lbToKg(value) : value;
  // two decimals is finer than any plate increment and matches numeric(7,2)
  return Math.round(kg * 100) / 100;
}

/** Trim trailing zeros: 60 -> "60", 62.5 -> "62.5", 62.55 -> "62.6" */
export function trimNumber(value: number, maxDecimals = 1): string {
  const rounded = Number(value.toFixed(maxDecimals));
  return String(rounded);
}

/** "60 kg" / "132.3 lb" */
export function formatWeight(
  kg: number | null | undefined,
  unit: UnitPreference,
  options: { withUnit?: boolean } = {},
): string {
  const { withUnit = true } = options;
  const display = toDisplayWeight(kg, unit);
  if (display === null) return '—';
  const text = trimNumber(display);
  return withUnit ? `${text} ${unit}` : text;
}

/** Large totals: "8,420 kg" */
export function formatVolume(kg: number | null | undefined, unit: UnitPreference): string {
  const display = toDisplayWeight(kg ?? 0, unit) ?? 0;
  const rounded = Math.round(display);
  return `${rounded.toLocaleString()} ${unit}`;
}

/**
 * Parse text from a numeric input. Returns null for empty/invalid input so
 * the caller can distinguish "not entered" from zero.
 */
export function parseNumericInput(text: string): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Parse a weight the user typed and return it in kilograms. */
export function parseWeightInput(text: string, unit: UnitPreference): number | null {
  const value = parseNumericInput(text);
  if (value === null) return null;
  return toStorageWeight(value, unit);
}

/** Text for a weight input field, in the user's unit, without the suffix. */
export function weightInputValue(kg: number | null, unit: UnitPreference): string {
  if (kg === null) return '';
  const display = toDisplayWeight(kg, unit);
  return display === null ? '' : trimNumber(display, 2);
}

export function cmToDisplay(cm: number | null, unit: UnitPreference): string {
  if (cm === null) return '—';
  if (unit === 'kg') return `${trimNumber(cm)} cm`;
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const rem = Math.round(inches - feet * 12);
  return `${feet}'${rem}"`;
}
