/**
 * useToday — the current local calendar day as a `YYYY-MM-DD` key, kept correct
 * across midnight.
 *
 * Time-derived day UI (the channel screen's catch-up day strip + its selected-day
 * anchor) is otherwise built once at mount from `new Date()`, so it pins to the
 * launch day: cross midnight and the strip, the EPG query key, and the
 * now-playing match all stay on yesterday until the screen remounts.
 *
 * Two rollover triggers, both required:
 *   - a single `setTimeout` to the next local midnight — rolls over while the app
 *     stays foregrounded (e.g. late-night live viewing); re-armed on each flip
 *     because the effect re-runs when `key` changes;
 *   - app foreground — RN throttles timers while backgrounded, so the timer alone
 *     can't be trusted; the common case is returning to a screen left open
 *     overnight.
 *
 * State, not a ref: the day key must re-render its consumers when it flips.
 * Mirrors the clock-in-state approach of `useNow` / `useNowProgram`. Setting the
 * same key is a no-op (React bails on `Object.is`-equal state), so a foreground
 * before midnight costs nothing.
 */
import { useCallback, useEffect, useState } from 'react';

import { toDateKey } from '@/utils/datetime';

import { useAppState } from './useAppState';

/** ms from now until the next local midnight (+50ms so the timer fires *after* it). */
function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  return next.getTime() - now.getTime();
}

export function useToday(): string {
  const [key, setKey] = useState(() => toDateKey(new Date()));
  const refresh = useCallback(() => setKey(toDateKey(new Date())), []);

  useAppState({ onForeground: refresh });

  useEffect(() => {
    const id = setTimeout(refresh, msUntilNextMidnight(new Date()));
    return () => clearTimeout(id);
  }, [key, refresh]);

  return key;
}
