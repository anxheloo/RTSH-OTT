/**
 * useLiveProgramBlock — the channel screen's per-programme access gate for the
 * LIVE stream. The decision sibling of `useParentalGuard`'s live branch: a
 * channel that is allowed *now* can roll into a programme that is geo-restricted
 * (or otherwise non-`ALLOWED`) in the user's country later, so a one-time open
 * check isn't enough.
 *
 * Keys off the now-airing programme's `decision` — the SAME field/enum the
 * `/epg/{programId}` endpoint returns (`ALLOWED` | `GEO_BLOCKED` | …), so the
 * live look-ahead and the recorded-tap gate share one flag. Absent → `ALLOWED`.
 *
 * Mechanism (deliberately mirrors the live parental gate, minus the PIN — a geo
 * block is hard, not user-unlockable):
 *   - watches TODAY's EPG independently of the catch-up day strip, so the gate
 *     holds even while the user browses a *past* day with live still playing
 *     (`selectedDay.isToday` is false there, so the screen's own `useNowProgram`
 *     is empty — this hook must not depend on it);
 *   - reuses `useNowProgram` for the now-airing derivation + boundary timer +
 *     foreground re-eval (no duplicated timer machinery);
 *   - blocks when the airing programme's `decision` is present and not `ALLOWED`.
 *
 * The flag reaches the EPG row two ways, both already wired: the join/refetch
 * (`GET /channels/{id}/epg?date=` returns `decision` per row, country-evaluated
 * server-side) and a per-programme `GEO_BLOCK`/`GEO_LIFT` socket event that sets
 * it on the cached row (`useChannelRealtime`). Because the flag lives on the
 * cached EPG, a lift clears the block reactively and a re-entry / date change
 * re-derives from fresh data.
 *
 * NOTE: this is the client look-ahead for a clean live→blocked transition — the
 * authoritative enforcement stays the CDN / `PlaybackDecision` (a tampered client
 * that ignores the flag still gets a 403 on the restricted segments).
 */
import { useMemo } from 'react';

import { useChannelEpgQuery } from '@/api/queries';

import { useNowProgram } from './useNowProgram';
import { useToday } from './useToday';

export interface LiveProgramBlock {
  /** The now-airing live programme is not `ALLOWED` → stop/hide the player. */
  blocked: boolean;
  /** Server notice for the blocked programme, if any (else null → generic copy). */
  notice: string | null;
}

export function useLiveProgramBlock(
  channelId: string,
  opts: { isLive: boolean; enabled?: boolean },
): LiveProgramBlock {
  const on = (opts.enabled ?? true) && opts.isLive;
  const todayKey = useToday();

  // Today's schedule, independent of the day strip (query is deduped with the
  // screen's + the parental gate's same-key fetch). Disabled when not live.
  const { items } = useChannelEpgQuery(on ? channelId : undefined, todayKey);
  const programs = useMemo(
    () => [...items].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [items],
  );

  // Now-airing derivation + boundary timer + foreground re-eval, all reused.
  const { playing } = useNowProgram(on ? programs : []);

  const blocked = on && !!playing?.decision && playing.decision !== 'ALLOWED';
  const notice = blocked ? (playing?.noticeMessage?.trim() || null) : null;

  return { blocked, notice };
}
