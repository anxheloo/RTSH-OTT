/**
 * Generic countdown hook — the single timer primitive for OTP resend cooldowns,
 * ad skip delays, and any future "wait N seconds" UI.
 *
 * Deadline-based, not tick-based: RN throttles JS timers while the app is
 * backgrounded, so counting interval ticks freezes the timer. Instead the
 * remaining time derives from `deadline - nowTs`; the first tick after
 * foreground self-corrects against the wall clock. `nowTs` is held in state
 * (never read in render) so renders stay pure.
 *
 * `proceedInBackground` controls what backgrounding *means*:
 * - `true` (default): wall-clock. Time keeps elapsing while backgrounded —
 *   right for server cooldowns (OTP resend), where time passed regardless.
 * - `false`: paused. The deadline is pushed forward by however long the app
 *   was backgrounded — right for "must actually view this" timers (ad skip),
 *   where flipping to the home screen must not burn the countdown.
 *
 * Portable: depends only on react + react-native (no store, no theme).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface UseCountdownOptions {
  /**
   * Keep elapsing while the app is backgrounded (wall-clock semantics).
   * Set `false` to pause the countdown for the backgrounded duration.
   * Default `true`.
   */
  proceedInBackground?: boolean;
  /** Re-render cadence in ms. Default 1000; use less for sub-second UI. */
  tickMs?: number;
}

export interface UseCountdownResult {
  /** Whole seconds left, never negative. */
  remaining: number;
  /** `remaining === 0`. */
  isDone: boolean;
  /** Restart the countdown from `seconds` (or an override) anchored at now. */
  restart: (overrideSeconds?: number) => void;
}

export function useCountdown(
  seconds: number,
  options: UseCountdownOptions = {},
): UseCountdownResult {
  const { proceedInBackground = true, tickMs = 1000 } = options;

  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const backgroundedAtRef = useRef<number | null>(null);

  const remaining = Math.max(0, Math.ceil((deadline - nowTs) / 1000));
  const isDone = remaining === 0;

  // Drive re-renders while running; tear down once done (restart re-arms via deadline).
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setNowTs(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [deadline, isDone, tickMs]);

  // Foreground re-sync (both modes) + pause accounting (proceedInBackground: false).
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'active') {
        if (!proceedInBackground && backgroundedAtRef.current !== null) {
          const pausedMs = Date.now() - backgroundedAtRef.current;
          setDeadline((d) => d + pausedMs);
        }
        backgroundedAtRef.current = null;
        setNowTs(Date.now()); // immediate correction instead of waiting one tick
      } else if (backgroundedAtRef.current === null) {
        // iOS fires 'inactive' before 'background' — anchor on the first leave.
        backgroundedAtRef.current = Date.now();
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [proceedInBackground]);

  const restart = useCallback(
    (overrideSeconds?: number) => {
      const now = Date.now();
      backgroundedAtRef.current = null;
      setDeadline(now + (overrideSeconds ?? seconds) * 1000);
      setNowTs(now);
    },
    [seconds],
  );

  return { remaining, isDone, restart };
}
