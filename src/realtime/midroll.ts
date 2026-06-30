/**
 * Pure mid-roll scheduling core (no React, no I/O) — extracted from
 * `useChannelRealtime` so the timing rules are unit-testable and the hook stays
 * thin. The hook owns the reactive state (clock, fired-set, session anchor); this
 * module owns the *decisions* derived from it.
 *
 * Model: a mid-roll fires when wall-clock crosses its `startTime` WHILE watching.
 *  - `startTime` in the future → schedule a boundary timer.
 *  - `startTime` already passed before the session began → never inserted into the
 *    past (so it can't fire late, nor replay on channel re-entry).
 *  - missing / unparseable `startTime` → "fire-now" (a backend quirk surfaces the
 *    ad instead of dropping it).
 *  - `validUntil` lapses the ad only when it's a valid instant strictly after the
 *    start (a zero-width `validUntil == startTime` is ignored).
 */
import type { Ad, AdCreative } from '@/types/domain';

/**
 * Scheduled fire instant (ms), or `null` for "fire now". `null` (not `0`/epoch) is
 * the fire-now sentinel so it's distinguishable from a real past instant that the
 * session-window guard must filter.
 */
export function midrollFireMs(ad: Ad): number | null {
  if (!ad.startTime) return null;
  const t = Date.parse(ad.startTime);
  return Number.isNaN(t) ? null : t;
}

/** Has the mid-roll lapsed past a VALID `validUntil` strictly after its start? */
export function midrollLapsed(ad: Ad, nowMs: number): boolean {
  if (!ad.validUntil) return false;
  const until = Date.parse(ad.validUntil);
  if (Number.isNaN(until)) return false;
  const fire = midrollFireMs(ad);
  if (fire !== null && until <= fire) return false; // zero/negative-width window → ignore
  return nowMs > until;
}

export interface MidrollWindow {
  /** Current clock (ms). */
  nowMs: number;
  /** Wall-clock when this watch session began — the earliest a mid-roll may fire. */
  sessionStart: number;
  /** Ad ids already shown (per-mount + cross-mount seed). */
  firedIds: ReadonlySet<number>;
}

/**
 * The mid-roll due to show now: the earliest one scheduled inside `[sessionStart,
 * now]` (or fire-now), not yet shown, not lapsed. Pure — returns `null` for none.
 */
export function selectDueMidroll(midrolls: Ad[], window: MidrollWindow): AdCreative | null {
  const { nowMs, sessionStart, firedIds } = window;
  let best: Ad | null = null;
  let bestFire = Infinity;
  for (const ad of midrolls) {
    if (ad.placement !== 'MID_ROLL') continue;
    if (firedIds.has(ad.id)) continue;
    if (midrollLapsed(ad, nowMs)) continue;
    const fire = midrollFireMs(ad);
    // Fire-now: eligible immediately, ranked by sessionStart so a real scheduled ad
    // wins ties cleanly. Otherwise: must have arrived (≤ now) inside the session
    // window (≥ sessionStart) — a start that passed before we arrived is skipped.
    const rank = fire === null ? sessionStart : fire;
    if (fire !== null && (fire > nowMs || fire < sessionStart)) continue;
    if (rank < bestFire) {
      best = ad;
      bestFire = rank;
    }
  }
  return best;
}

/**
 * The next future fire instant that still needs a boundary timer (ms), or `null`
 * if none — drives the single chained `setTimeout` in the hook.
 */
export function nextMidrollBoundaryMs(
  midrolls: Ad[],
  nowMs: number,
  firedIds: ReadonlySet<number>,
): number | null {
  let next = Infinity;
  for (const ad of midrolls) {
    if (ad.placement !== 'MID_ROLL' || firedIds.has(ad.id)) continue;
    const fire = midrollFireMs(ad);
    if (fire !== null && fire > nowMs && fire < next) next = fire;
  }
  return Number.isFinite(next) ? next : null;
}
