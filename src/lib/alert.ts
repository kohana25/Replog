/**
 * Confirmation dialogs that work on every platform.
 *
 * WHY THIS FILE EXISTS
 * react-native-web ships an `Alert` whose `alert()` is an empty function, so
 * on web every `Alert.alert(...)` silently does nothing — the dialog never
 * appears and the button callbacks never run. That is not a cosmetic problem:
 * Finish workout, Discard, Log out and every Delete in this app are gated
 * behind one, so in a browser they all became dead controls.
 *
 * These helpers use the browser's own `confirm` / `alert` on web and the
 * native `Alert` elsewhere, and they return a promise so a call site reads
 * the same either way.
 */

import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the button that goes ahead. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red on native. */
  destructive?: boolean;
}

/**
 * Ask the user to confirm something. Resolves true when they go ahead and
 * false when they cancel or dismiss the dialog.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    // The browser dialog has no room for custom button labels, so the labels
    // go into the body text instead of being lost.
    const body = [message, `${confirmLabel}?`].filter(Boolean).join('\n\n');
    return Promise.resolve(webConfirm(`${title}\n\n${body}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** A message the user only has to acknowledge. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    webAlert([title, message].filter(Boolean).join('\n\n'));
    return;
  }
  Alert.alert(title, message);
}

/* ------------------------------------------------------------------------ *
 * The browser primitives, guarded.
 *
 * `window.confirm` is unavailable during server-side rendering (this project
 * builds with static rendering) and can be suppressed by the browser in a
 * sandboxed iframe, where it throws. Neither case should take the app down:
 * an unavailable confirm is treated as "not confirmed", which is the safe
 * answer for a dialog that guards a delete.
 * ------------------------------------------------------------------------ */

function webConfirm(text: string): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
    return window.confirm(text);
  } catch {
    return false;
  }
}

function webAlert(text: string): void {
  try {
    if (typeof window === 'undefined' || typeof window.alert !== 'function') return;
    window.alert(text);
  } catch {
    // Nothing else to do — the message is advisory.
  }
}
