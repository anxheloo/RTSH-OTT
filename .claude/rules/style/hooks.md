---
paths:
  - "src/hooks/**"
  - "src/**/use*.ts"
  - "src/**/use*.tsx"
---

# Hooks — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## Hooks

### Template

```ts
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Fires `onResume` when app returns from background after `thresholdMs`.
 * Uses a timestamp ref because RN timers are throttled when suspended —
 * setTimeout-based approaches fire late on iOS.
 */
export function useAppResumeGuard(onResume: () => void, thresholdMs = 30_000) {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  const handleChange = useCallback(
    (next: AppStateStatus) => {
      if (appStateRef.current === 'active' && next.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
      }
      if (next === 'active' && backgroundedAtRef.current !== null) {
        if (Date.now() - backgroundedAtRef.current >= thresholdMs) onResume();
        backgroundedAtRef.current = null;
      }
      appStateRef.current = next;
    },
    [onResume, thresholdMs],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [handleChange]);
}
```

### Key points

- `useCallback` wraps async functions used in `useEffect` deps — keeps deps stable, avoids stale closures.
- `useEffect(() => { fn(); }, [fn])` — the callback is the dep.
- `useRef` for instance state that must not trigger re-renders (timestamps, handles, previous values).
- Return a stable object shape — never conditionally omit keys.
- JSDoc at the top explaining the **why**, not the what.
- Cleanup functions only `.remove()` / `.unsubscribe()` — never throw inside cleanup.
- Module-level singletons (cached state, subscriber Sets) are appropriate for hooks that must only initialize once across all mounts (e.g. `useNetworkReconnect`).

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| Ad-hoc `setInterval` countdown in a component | `useCountdown` (`hooks/useCountdown.ts`) — deadline-based, background-aware (`proceedInBackground: false` to pause while backgrounded) |
