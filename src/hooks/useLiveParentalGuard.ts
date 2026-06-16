/**
 * useLiveParentalGuard — live (channel) parental re-check (plan 22.14c).
 *
 * A live channel that is clean *now* can roll into an 18+ programme later, so a
 * one-time gate at channel open (22.14) isn't enough. This hook watches the
 * channel's EPG for *today* and asks the caller to gate (pause + PIN) the moment
 * an adult-flagged programme becomes the airing one. It:
 *
 *   - evaluates the currently-airing programme on mount, on EPG change, on the
 *     next programme boundary, and on app-foreground;
 *   - schedules ONE timer to the next boundary (not a poll). RN timers are
 *     throttled while backgrounded, so we *also* re-evaluate on foreground
 *     rather than trusting a stale timer;
 *   - prompts at most once per `programId` — a verified programme stays
 *     unlocked, and a dismissed one stays blocked (no modal) until the next
 *     programme or an explicit `requestUnlock()`.
 *
 * Verification is a local compare against the device PIN (`ParentalSlice`)
 * through `ParentalPinModal`, so there's no network round-trip on each
 * boundary. Binary
 * `isAdult` for v1 (age tiers later). Returns a stable shape; the screen pauses
 * playback while `isBlocked` and renders the modal while `showPrompt`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useEpgQuery } from '@/api/queries';

import { useAppState } from './useAppState';

/** Local `YYYY-MM-DD` for today (matches the EPG mock's date keys). */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface LiveParentalGuard {
  /** Current programme is adult-flagged and not yet unlocked → pause/hide the player. */
  isBlocked: boolean;
  /** Show the PIN modal now (blocked AND the user hasn't dismissed this programme). */
  showPrompt: boolean;
  /** PIN verified → unlock the current programme. */
  onVerified: () => void;
  /** User cancelled → stay blocked but hide the modal for this programme. */
  onDismiss: () => void;
  /** Re-open the modal after a dismiss (from the blocked overlay's unlock action). */
  requestUnlock: () => void;
}

export function useLiveParentalGuard(
  channelId: string,
  opts?: { enabled?: boolean },
): LiveParentalGuard {
  const enabled = opts?.enabled ?? true;

  // Always watch TODAY's live schedule, independent of the catch-up day strip.
  const { items } = useEpgQuery(todayKey());

  const programs = useMemo(
    () =>
      items
        .filter((e) => e.channelId === channelId)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [items, channelId],
  );

  // Re-evaluation is driven by a timestamp in state: the boundary timer and
  // app-foreground advance it (async callbacks → allowed), and render derives
  // the airing programme purely from it — no wall-clock read during render.
  // Seeded with the mount time so an adult programme already airing at open
  // gates on the very first frame (no playback leak before the first tick).
  const [nowTs, setNowTs] = useState(() => Date.now());
  const refresh = useCallback(() => setNowTs(Date.now()), []);
  useAppState({ onForeground: refresh });

  // The adult-flagged programme airing at `nowTs`, if any. Scans *all* airing
  // entries (not just the first) so overlapping/adjacent EPG data can't hide an
  // 18+ slot behind a clean one.
  const adultNow = programs.find(
    (p) => p.isAdult && nowTs >= Date.parse(p.startTime) && nowTs < Date.parse(p.endTime),
  );
  const currentId = enabled ? (adultNow?.id ?? null) : null;

  // Arm one timer to the next programme edge (any start/end after now), then
  // refresh → re-derive. +250ms so it fires *after* the edge, never a hair
  // before (which would re-arm onto itself). Overlap-safe: every edge is a
  // candidate. Re-runs whenever `nowTs` advances, so each boundary chains to
  // the next.
  useEffect(() => {
    if (!enabled) return;
    const edges = programs
      .flatMap((p) => [Date.parse(p.startTime), Date.parse(p.endTime)])
      .filter((t) => t > nowTs);
    if (edges.length === 0) return;
    const id = setTimeout(refresh, Math.min(...edges) - nowTs + 250);
    return () => clearTimeout(id);
  }, [enabled, programs, nowTs, refresh]);

  // Resolution state, keyed implicitly by programme id: when `currentId`
  // changes, neither resolution id matches, so it naturally re-locks.
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const unlocked = currentId !== null && verifiedId === currentId;
  const isBlocked = currentId !== null && !unlocked;
  const showPrompt = isBlocked && dismissedId !== currentId;

  const onVerified = useCallback(() => setVerifiedId(currentId), [currentId]);
  const onDismiss = useCallback(() => setDismissedId(currentId), [currentId]);
  const requestUnlock = useCallback(() => setDismissedId(null), []);

  return { isBlocked, showPrompt, onVerified, onDismiss, requestUnlock };
}
