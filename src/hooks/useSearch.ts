/**
 * useSearch — controlled search input with a debounced mirror.
 *
 * `query` drives the text field (updates every keystroke); `debouncedQuery`
 * settles `delayMs` after typing stops and is what you filter/fetch on, so the
 * list isn't recomputed on every character. Adapted from SOLITAR's `useSearch`,
 * with a ref-held timer that's cleared on unmount (avoids a late state update
 * after the screen is gone).
 *
 * Today filtering is client-side; when a backend search endpoint lands, feed
 * `debouncedQuery` into the query key — the debounce already rate-limits it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 300;

export function useSearch(initialValue = '', delayMs = DEFAULT_DELAY_MS) {
  const [query, setQueryState] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setDebouncedQuery(query), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, delayMs]);

  const setQuery = useCallback((value: string) => setQueryState(value), []);

  const clearQuery = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
  }, []);

  return { query, debouncedQuery, setQuery, clearQuery };
}

export default useSearch;
