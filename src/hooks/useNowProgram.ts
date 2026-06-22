/**
 * useNowProgram — tracks which programme is airing *now* in a single channel's
 * schedule, used by the channel screen to put the "now" play-icon on the right
 * EPG row and roll it to the next programme at the boundary.
 *
 * The channel screen isn't a tab — the user sits on it while the live stream
 * plays continuously, so a focus-refetch (the Guide pattern) never fires. We
 * recompute on a client-side trigger instead, and it costs **zero** network:
 * the day's EPG is already in memory, so the timer just re-runs the pure
 * `findPlayingProgram` and reschedules.
 *
 * Mechanism (mirrors `useLiveParentalGuard`):
 *   - holds `nowMs` in state (seeded at mount so the first frame is correct);
 *   - derives `playing` purely from `nowMs` (render stays pure);
 *   - arms ONE `setTimeout` to the next programme edge, then advances `nowMs` →
 *     re-derives → reschedules (boundary-chained, not a poll);
 *   - re-evaluates on app foreground (RN throttles timers while backgrounded, so
 *     a stale timer can't be trusted alone).
 *
 * `programs` should be the channel's schedule for the relevant day; only TODAY's
 * list has a meaningful "now". Pass `[]` (or a past/future day) and `playing`
 * is simply null.
 */
import { useCallback, useEffect, useState } from 'react';

import { findPlayingProgram } from '@/utils';
import type { EpgItem } from '@/types/domain';

import { useAppState } from './useAppState';

export interface NowProgram {
  /** Programme airing at the current instant, or null. */
  playing: EpgItem | null;
  /** The instant the selection was last evaluated at (advances at boundaries / on focus). */
  nowMs: number;
}

export function useNowProgram(programs: EpgItem[]): NowProgram {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refresh = useCallback(() => setNowMs(Date.now()), []);

  useAppState({ onForeground: refresh });

  const playing = findPlayingProgram(programs, nowMs);

  // Arm one timer to the next programme edge (any start/end after now), then
  // advance nowMs → re-derive. +250ms so it fires *after* the edge, never a hair
  // before (which would re-arm onto itself). Re-runs whenever nowMs advances, so
  // each boundary chains to the next.
  useEffect(() => {
    const edges = programs
      .flatMap((p) => [Date.parse(p.startTime), Date.parse(p.endTime)])
      .filter((t) => t > nowMs);
    if (edges.length === 0) return;
    const id = setTimeout(refresh, Math.min(...edges) - nowMs + 250);
    return () => clearTimeout(id);
  }, [programs, nowMs, refresh]);

  return { playing, nowMs };
}
