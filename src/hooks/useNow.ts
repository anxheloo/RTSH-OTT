/**
 * useNow — a ticking "current instant" clock for time-derived UI (e.g. the
 * Guide's elapsed-progress bars). Holds `nowMs` in state and advances it on a
 * fixed interval so anything deriving a value from `Date.now()` re-renders in
 * real time without a network round-trip.
 *
 * Why a hook and not `dataUpdatedAt` / `Date.now()` in render: the Guide bar
 * fills from `(now − start) / (end − start)`, so it needs a *clock* that moves,
 * not a frozen fetch timestamp; and reading `Date.now()` in render is impure and
 * wouldn't re-render on its own.
 *
 * Background-aware: RN throttles timers while backgrounded, so the interval is
 * torn down on background and re-armed on foreground (which also snaps `nowMs`
 * forward immediately, correcting any drift accrued while suspended).
 *
 * Default 15s — a few-px progress bar moves <1px faster than that, so a tighter
 * interval is wasted renders. Pass a smaller `intervalMs` for finer motion.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function useNow(intervalMs = 15_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());

    const start = () => {
      if (intervalRef.current !== null) return;
      tick(); // snap forward immediately on (re)start
      intervalRef.current = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (intervalRef.current === null) return;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs]);

  return nowMs;
}
