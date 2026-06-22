/**
 * EPG time helpers — pure, no React, no I/O. Two jobs:
 *
 *  - `findPlayingProgram` — given a channel's programme list and an instant,
 *    return the programme airing at that instant (the one whose [start, end)
 *    wraps `nowMs`). Drives the channel screen's "now" play-icon row.
 *  - `programProgress` — elapsed fraction (0–1) of a programme at an instant.
 *    Drives the Guide row's live progress bar.
 *
 * Both take an explicit `nowMs` so callers control the clock (a hook ticks it at
 * boundaries / on focus; render stays pure). `programProgress` returns
 * `undefined` for a non-positive duration so the caller hides the bar rather
 * than dividing by zero.
 */
import type { EpgItem } from '@/types/domain';

/** The programme airing at `nowMs` (`start ≤ now < end`), or null if none. */
export function findPlayingProgram(programs: EpgItem[], nowMs: number): EpgItem | null {
  return (
    programs.find((p) => nowMs >= Date.parse(p.startTime) && nowMs < Date.parse(p.endTime)) ?? null
  );
}

/** Elapsed fraction (0–1) of `[startIso, endIso)` at `nowMs`; undefined if duration ≤ 0. */
export function programProgress(
  startIso: string,
  endIso: string,
  nowMs: number,
): number | undefined {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!(end > start)) return undefined;
  return Math.min(Math.max((nowMs - start) / (end - start), 0), 1);
}