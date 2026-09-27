import { useEffect, useState } from 'react';

/**
 * Re-render on an interval so timestamp-derived values stay fresh.
 *
 * Timers in this app never *store* a countdown in React state — they store
 * the epoch time they end at and recompute the remainder on each tick. That
 * way a re-render, a dropped frame, or the app being backgrounded cannot
 * make the clock drift.
 */
export function useTick(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}

/** Seconds elapsed since `startedAt` (epoch ms), updated once per second. */
export function useElapsedSeconds(startedAt: number | null | undefined): number {
  const now = useTick(1000, startedAt != null);
  if (startedAt == null) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
