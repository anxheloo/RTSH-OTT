/**
 * useParentalGuard — the channel screen's single parental gate (plan 22.14c +
 * recorded-path gate). One PIN, one modal, one verified set; two triggers:
 *
 *   - LIVE (continuous): a live channel that is clean *now* can roll into an
 *     18+ programme later, so a one-time open check isn't enough. While `isLive`,
 *     this watches TODAY's EPG and gates the moment the airing programme is
 *     adult-flagged — re-checking on the next programme boundary and on
 *     app-foreground. Time-matching is required here because the airing
 *     programme changes underneath a fixed live stream.
 *
 *   - RECORDED (on-demand): tapping a past programme plays a *known* item, so
 *     there is nothing to time-match — `guardPlay(program, onAllowed)` gates on
 *     that item's own `isAdult` and only runs `onAllowed` once the PIN is
 *     verified, so the signed stream URL is never even fetched before unlock.
 *
 * Gating always keys off the EPG row's `isAdult` (the `PlaybackDecision`
 * response carries no adult flag). Verification is a local compare against the
 * device PIN (`ParentalSlice`) through `ParentalPinModal` — no network per
 * boundary or per tap. Binary `isAdult` for v1 (age tiers later). A programme
 * stays unlocked once verified (kept in a per-id set), so re-tapping a recorded
 * item — or a live programme that briefly re-derives — never re-prompts.
 *
 * GUESTS take the same block with a different key. A guest cannot hold a PIN (the
 * setting is hidden for them, since it would gate content they can't reach), so
 * for them 18+ content is unlocked by SIGNING IN, not by entering digits: the PIN
 * modal never opens and `signInRequired` is raised instead. The caller must
 * therefore pass `enabled: parentalEnabled || isGuest` — gating on
 * `parentalEnabled` alone would leave a guest watching 18+ live content
 * completely ungated, because their `parentalEnabled` is always false.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { useChannelEpgQuery } from '@/api/queries';
import type { EpgItem } from '@/types/domain';
import { promptSignIn } from '@/features/auth/signInPrompt';

import { useAppState } from './useAppState';

/** Local `YYYY-MM-DD` for today (matches the EPG mock's date keys). */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface ParentalGuard {
  /** Live programme is adult-flagged and not yet unlocked → pause/hide the player. */
  isBlocked: boolean;
  /** Live blocked AND the user dismissed the modal → show the "unlock" overlay. */
  blockedDismissed: boolean;
  /** Re-open the modal after a dismiss (from the blocked overlay's unlock action). */
  requestUnlock: () => void;
  /**
   * Gate an explicit recorded-programme selection. Runs `onAllowed` immediately
   * when the item is clean (or parental is off / already verified); otherwise
   * opens the PIN modal and runs `onAllowed` only on successful verify.
   */
  guardPlay: (program: EpgItem, onAllowed: () => void) => void;
  /** The shared PIN modal should be visible (live prompt OR a pending recorded gate). */
  promptVisible: boolean;
  /** PIN verified → unlock the active target (recorded pending wins over live). */
  onVerified: () => void;
  /** User cancelled → drop the pending recorded gate, or block-and-hide the live one. */
  onDismiss: () => void;
}

export function useParentalGuard(
  channelId: string,
  opts: { isLive: boolean; enabled?: boolean },
): ParentalGuard {
  const enabled = opts.enabled ?? true;
  const { isLive } = opts;
  const isGuest = useAppStore((s) => s.isGuest);

  // Programmes unlocked this session, keyed by id. A verified programme stays
  // open; a *different* airing programme (new id) is absent → naturally re-locks.
  const [verifiedIds, setVerifiedIds] = useState<ReadonlySet<string>>(() => new Set());
  const markVerified = useCallback((id: string) => {
    setVerifiedIds((prev) => new Set(prev).add(id));
  }, []);

  // ---- LIVE branch — continuous, only while watching live ----
  const liveEnabled = enabled && isLive;

  // Watch TODAY's live schedule, independent of the catch-up day strip.
  const { items } = useChannelEpgQuery(liveEnabled ? channelId : undefined, todayKey());
  const programs = useMemo(
    () => [...items].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [items],
  );

  // Re-evaluation is driven by a timestamp in state: the boundary timer and
  // app-foreground advance it (async callbacks → allowed), and render derives
  // the airing programme purely from it. Seeded with mount time so an adult
  // programme already airing gates on the first frame (no playback leak).
  const [nowTs, setNowTs] = useState(() => Date.now());
  const refresh = useCallback(() => setNowTs(Date.now()), []);
  useAppState({ onForeground: refresh });

  // The adult-flagged programme airing at `nowTs`, if any. Scans *all* airing
  // entries so overlapping EPG data can't hide an 18+ slot behind a clean one.
  const adultNow = programs.find(
    (p) => p.isAdult && nowTs >= Date.parse(p.startTime) && nowTs < Date.parse(p.endTime),
  );
  const liveCurrentId = liveEnabled ? (adultNow?.id ?? null) : null;

  // Arm one timer to the next programme edge (any start/end after now), then
  // refresh → re-derive. +250ms so it fires *after* the edge. Re-runs whenever
  // `nowTs` advances, so each boundary chains to the next.
  useEffect(() => {
    if (!liveEnabled) return;
    const edges = programs
      .flatMap((p) => [Date.parse(p.startTime), Date.parse(p.endTime)])
      .filter((t) => t > nowTs);
    if (edges.length === 0) return;
    const id = setTimeout(refresh, Math.min(...edges) - nowTs + 250);
    return () => clearTimeout(id);
  }, [liveEnabled, programs, nowTs, refresh]);

  const [liveDismissedId, setLiveDismissedId] = useState<string | null>(null);
  const liveUnlocked = liveCurrentId !== null && verifiedIds.has(liveCurrentId);
  const isBlocked = liveCurrentId !== null && !liveUnlocked;
  // A guest never sees the PIN modal — there is no PIN for them to enter.
  const liveShowPrompt = isBlocked && !isGuest && liveDismissedId !== liveCurrentId;
  const blockedDismissed = isBlocked && !liveShowPrompt;

  // NOTE: there is deliberately NO effect here raising the sign-in modal for a
  // blocked guest. `isBlocked` already unmounts the player (no A/V leak) and the
  // screen renders a blocked overlay with its own visible "Hyr" button, so a
  // modal on top was redundant — and actively harmful: this branch is driven by
  // a programme-boundary TIMER, so it could fire while a `(modals)` sheet was
  // presented. A global RN `<Modal>` raised over a native sheet is the race
  // `STYLE_GUIDE` warns about, and it reproduced: the modal mounted INVISIBLY
  // and swallowed every touch, leaving the app unusable (device, 2026-08-20).
  // Rule: raise a global modal only from a user gesture, never from an effect.
  // The overlay's CTA navigates to the auth stack directly instead.

  // Plain functions (not useCallback): React Compiler memoizes them, and they're
  // only passed as JSX props — no effect/hook needs a stable identity.
  const requestUnlock = () => setLiveDismissedId(null);

  // ---- RECORDED branch — imperative, gates before the stream fetch ----
  const [pending, setPending] = useState<{ id: string; onAllowed: () => void } | null>(null);
  const guardPlay = useCallback(
    (program: EpgItem, onAllowed: () => void) => {
      if (enabled && program.isAdult && !verifiedIds.has(program.id)) {
        // Defensive: the channel screen already blocks every recorded tap for a
        // guest (catch-up needs an account), so this should be unreachable — but
        // a guest must never be shown a PIN modal they cannot satisfy.
        if (isGuest) {
          promptSignIn();
          return;
        }
        setPending({ id: program.id, onAllowed });
        return;
      }
      onAllowed();
    },
    [enabled, verifiedIds, isGuest],
  );

  // ---- shared modal — a pending recorded gate takes precedence over live ----
  const promptVisible = pending !== null || liveShowPrompt;

  const onVerified = () => {
    if (pending) {
      markVerified(pending.id);
      pending.onAllowed();
      setPending(null);
      return;
    }
    if (liveCurrentId) markVerified(liveCurrentId);
  };

  const onDismiss = () => {
    if (pending) {
      setPending(null);
      return;
    }
    if (liveCurrentId) setLiveDismissedId(liveCurrentId);
  };

  return {
    isBlocked,
    blockedDismissed,
    requestUnlock,
    guardPlay,
    promptVisible,
    onVerified,
    onDismiss,
  };
}
