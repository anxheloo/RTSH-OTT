/**
 * React Native has no browser "window focus", so TanStack Query's
 * `refetchOnWindowFocus` is a no-op until we bridge `AppState` into its
 * `focusManager` — the focus analogue of the `onlineManager` ↔ NetInfo bridge
 * in `useNetworkMonitor`. Wire ONCE at boot (`useBootstrap`); after that, any
 * query with `refetchOnWindowFocus: true` refetches when the app returns to the
 * foreground.
 */
import { AppState, type AppStateStatus } from 'react-native';

import { focusManager } from '@tanstack/react-query';

let wired = false;

export function setupFocusManager(): void {
  if (wired) return;
  wired = true;

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      handleFocus(state === 'active');
    });
    return () => sub.remove();
  });
}