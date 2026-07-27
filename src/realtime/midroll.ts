/**
 * Pure mid-roll scheduling core (no React, no I/O) — extracted from
 * `useChannelRealtime` so the timing rules are unit-testable and the hook stays
 * thin. The hook owns the reactive state (clock, fired-set, session anchor); this
 * module owns the *decisions* derived from it.
 *
 * Model: a mid-roll is due once wall-clock is inside its viewing window WHILE
 * watching — the backend contract (fe-midroll-ads-flow.md §3) is "`startTime`
 * null or ≤ now → play now", with `validUntil` closing the window.
 *  - `startTime` in the future → schedule a boundary timer.
 *  - `startTime` already passed but the window is still open → due NOW. This
 *    includes a start that predates the channel visit (join mid-window) — the
 *    server clamps an active band's `startTime` to "now" on the REST seed, and
 *    gating on the visit's own start instant made that clamp race-y under clock
 *    skew (a pushed ad could be eaten forever). Replay protection is the
 *    fired-ids set (cross-mount), NOT a time guard.
 *  - missing / unparseable `startTime` → "fire-now" (a backend quirk surfaces the
 *    ad instead of dropping it).
 *  - `validUntil` (when a valid instant strictly after the start) is the
 *    authoritative viewing window — the ad lapses once `now` passes it.
 *  - no usable `validUntil` (absent / unparseable / zero-width) → the ad lapses via
 *    a fixed staleness fallback (`MIDROLL_MAX_STALENESS_MS` after `startTime`) so a
 *    break the user was away for isn't shown arbitrarily late; fire-now ads exempt.
 */
import type { Ad, AdCreative } from '@/types/domain';
import { MIDROLL_MAX_STALENESS_MS } from '@/constants/ads';

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

/**
 * Has the mid-roll lapsed — its viewing window closed, so it should be skipped
 * rather than shown late (e.g. after a long background)?
 *
 *  - A **valid** `validUntil` (a real instant strictly after `startTime`) is the
 *    authoritative window → lapsed once `nowMs` passes it.
 *  - Otherwise (absent / unparseable / zero-width `validUntil == startTime`) →
 *    fall back to `MIDROLL_MAX_STALENESS_MS` measured from `startTime`. A fire-now
 *    ad (no `startTime`) has no reference instant and never lapses this way.
 */
export function midrollLapsed(ad: Ad, nowMs: number): boolean {
  const fire = midrollFireMs(ad);
  const until = ad.validUntil ? Date.parse(ad.validUntil) : NaN;
  // A validUntil is authoritative only when it's a real instant strictly after
  // the start (a zero/negative-width window is a backend quirk → treat as absent).
  const hasWindow = !Number.isNaN(until) && (fire === null || until > fire);

  if (hasWindow) return nowMs > until;

  // No usable window → staleness fallback off startTime (scheduled ads only).
  if (fire === null) return false; // fire-now: no reference instant, never stale
  return nowMs > fire + MIDROLL_MAX_STALENESS_MS;
}

export interface MidrollWindow {
  /** Current clock (ms). */
  nowMs: number;
  /**
   * Wall-clock when this watch session began. Rank anchor only (orders a
   * fire-now ad against scheduled ones) — NOT an eligibility guard: an ad whose
   * `startTime` predates the visit is still due while its window is open.
   */
  sessionStart: number;
  /** Ad ids already shown (per-mount + cross-mount seed). */
  firedIds: ReadonlySet<number>;
}

/**
 * The mid-roll due to show now: the earliest one whose `startTime` has passed
 * (or fire-now), not yet shown, whose viewing window is still open (not lapsed).
 * Pure — returns `null` for none.
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
    if (fire !== null && fire > nowMs) continue; // not yet due — boundary timer's job
    // Fire-now ranks at sessionStart; scheduled ads rank at their own instant.
    const rank = fire === null ? sessionStart : fire;
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
