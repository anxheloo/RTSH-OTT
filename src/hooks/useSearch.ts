/**
 * useSearch — controlled search input with a debounced mirror.
 *
 * `search` drives the text field (updates every keystroke); `debouncedSearch`
 * settles 300 ms after typing stops and is what you filter on, so the list
 * isn't recomputed on every character.
 *
 * The timer is held in a ref and cleared on unmount to avoid a late state
 * update after the screen is gone.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

export function useSearch(initialValue = '') {
  const [search, setSearch] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const updateSearch = useCallback((value: string) => setSearch(value), []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
  }, []);

  return { search, updateSearch, clearSearch, debouncedSearch };
}

export default useSearch;