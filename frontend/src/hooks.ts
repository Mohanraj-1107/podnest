import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small fetch helper with loading/error state and a manual reload trigger.
 * `deps` works like a useEffect dependency list.
 */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loader()
      .then((data) => {
        if (active) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setState((previous) => ({ ...previous, loading: false, error: errorMessage(error) }));
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { ...state, reload };
}

export function useHashRoute(): string {
  const read = () => window.location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(route: string) {
  window.location.hash = `/${route}`;
}

/** Short-lived success message that clears itself after a few seconds. */
export function useFlash(timeout = 4500) {
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timer = window.setTimeout(() => setFlash(null), timeout);
    return () => window.clearTimeout(timer);
  }, [flash, timeout]);

  return [flash, setFlash] as const;
}
