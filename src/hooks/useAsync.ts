import { useCallback, useEffect, useRef, useState } from 'react';

import { dataErrorMessage } from '@/lib/validation';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  /** True on the first load only — drives skeletons rather than spinners. */
  isLoading: boolean;
  /** True while a pull-to-refresh or retry is running. */
  isRefreshing: boolean;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: (value: T | null) => void;
}

/**
 * Loads data and tracks loading / error state so every screen can follow the
 * same "loading -> loaded" pattern instead of flashing an empty state first.
 *
 * `deps` behaves like a useEffect dependency array: change them and the
 * request re-runs.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // Ignore the result of a request that has been superseded or unmounted.
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++requestId.current;
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const result = await loaderRef.current();
      if (!mounted.current || id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (!mounted.current || id !== requestId.current) return;
      setError(dataErrorMessage(caught, 'Unable to load this right now.'));
    } finally {
      if (mounted.current && id === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const refetch = useCallback(() => run('initial'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, error, isLoading, isRefreshing, refetch, refresh, setData };
}
