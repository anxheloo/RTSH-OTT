/**
 * useRefreshOnFocus — refetch a query each time its screen regains navigation
 * focus. This is TanStack Query's canonical React Native pattern.
 *
 * Why it's needed on top of `refetchOnWindowFocus`: that trigger is bridged to
 * **app** foreground only (`api/focusManager.ts` ↔ AppState). Expo Router keeps
 * tab screens *mounted* when you switch tabs, so moving between tabs fires no
 * AppState change and no window-focus refetch. `useFocusEffect` covers exactly
 * that gap — returning to the screen via navigation.
 *
 * The first focus (initial mount) is skipped: the query already fetches on
 * mount, so refetching again immediately would be a redundant request.
 */
import { useCallback, useRef } from 'react';

import { useFocusEffect } from 'expo-router';

export function useRefreshOnFocus(refetch: () => unknown): void {
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
