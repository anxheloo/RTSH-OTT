import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface AppStateOptions {
  onForeground?: () => void;
  onBackground?: () => void;
  onChange?: (next: AppStateStatus, prev: AppStateStatus) => void;
}

/**
 * Subscribe to app foreground/background transitions. Callbacks fire only on
 * actual transitions (active ↔ background/inactive), not on every status tick.
 *
 * Callers pass stable callbacks (memoized) since the effect re-subscribes if
 * they change.
 */
export function useAppState({ onForeground, onBackground, onChange }: AppStateOptions = {}): void {
  const prevRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = prevRef.current;
      prevRef.current = next;

      onChange?.(next, prev);

      const wasActive = prev === 'active';
      const isActive = next === 'active';

      if (!wasActive && isActive) onForeground?.();
      if (wasActive && !isActive) onBackground?.();
    });

    return () => sub.remove();
  }, [onForeground, onBackground, onChange]);
}
