/**
 * Per-channel real-time: subscribes to the channel topic (receives mid-roll
 * events + signals in-channel presence) and the user geo queue, emits watch-
 * segment events, and runs a background-safe mid-roll scheduler.
 *
 * SOURCE OF TRUTH for the ad DATA is the TanStack cache (['ads', channelId]):
 * both the initial array and socket mutations live there (the socket handler calls
 * `setQueryData`). This hook adds only scheduling STATE: a `nowMs` clock and the
 * set of already-shown ad ids. The due ad is *derived* (pure) from the array +
 * clock + fired-set — mirroring `useNowProgram` (clock-in-state + boundary timer),
 * which keeps render pure and avoids a self-referencing timer / setState-in-effect.
 *
 * Mechanism (per `useNowProgram`):
 *   - hold `nowMs` in state; advance it at the next mid-roll's `startTime` via ONE
 *     `setTimeout`, and on app foreground (RN throttles backgrounded timers);
 *   - derive `dueAd` = the earliest MID_ROLL scheduled INSIDE the current watch
 *     window ([sessionStart, now]), not yet shown, not lapsed. A start that already
 *     passed before we began watching is NOT inserted into the past — which also
 *     stops a past mid-roll from replaying when you leave and re-enter the channel.
 *     A null/unparseable `startTime` is "fire-now" (shown as soon as seen, so a
 *     backend quirk surfaces the ad instead of dropping it); `validUntil` only
 *     lapses the ad if valid AND strictly after the start. The pure scheduling
 *     core (`selectDueMidroll` / `nextMidrollBoundaryMs`) lives in `@/realtime`;
 *     this hook only owns the reactive state it reads from;
 *   - `onAdComplete` marks it shown → the derived `dueAd` advances to the next/none.
 *
 * Watch model (docs/REALTIME_SOCKET.md): emit `/app/watch` on enter and on every
 * program switch (backend closes the previous segment — no client stop-on-switch);
 * emit `/app/watch.end` only on unmount. Disconnect/kill closes it server-side.
 *
 * GEO (Option B — backend-fired): a GEO_BLOCK/GEO_LIFT for THIS channel sets/clears
 * the instant `geoNotice` overlay AND invalidates the authoritative playback
 * decision so the two converge (and a lift survives leave/return). Pub/sub geo +
 * mid-roll events have no replay, so a STOMP RECONNECT also re-fetches the decision
 * + ads to recover anything missed while the socket was down.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import type { Ad, AdCreative, EpgItem } from '@/types/domain';
import type { GeoEvent, MidrollEvent, WatchKind } from '@/realtime';
import {
  nextMidrollBoundaryMs,
  publish,
  selectDueMidroll,
  STOMP_DEST,
  subscribe,
} from '@/realtime';

import { useAppState } from './useAppState';

/**
 * Ids of mid-rolls already shown this APP SESSION. `firedIds` (below) is per-mount
 * and resets when you leave a channel — so without this, a mid-roll re-fires every
 * time you re-enter the channel (especially a fire-now ad with no parseable
 * `startTime`, which the session-window guard can't filter). This module-level set
 * survives remounts (resets on app restart); a fresh mount seeds `firedIds` from
 * it, and an ADD/UPDATE op re-arms an ad by removing it (a real reschedule should
 * be able to show again). This is the "don't show the same mid-roll again" guard.
 */
const shownMidrollIds = new Set<number>();

export function useChannelRealtime(
  channelId: number,
  programId: number | null,
  kind: WatchKind,
  midrolls: Ad[],
): { dueAd: AdCreative | null; onAdComplete: () => void; geoNotice: string | null } {
  const queryClient = useQueryClient();
  // Drives (re)subscription: subscribe()/publish() are no-ops until connected, so
  // every subscribe/watch effect below re-runs when this flips true (cold start
  // AND reconnect — RN drops the connection on background, losing subscriptions).
  const realtimeConnected = useAppStore((s) => s.realtimeConnected);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Seed from the module-level shown-set so an ad already shown earlier this app
  // session (on a prior visit to this channel) stays suppressed on re-entry.
  const [firedIds, setFiredIds] = useState<Set<number>>(() => new Set(shownMidrollIds));
  // Geo state is keyed by channel so it self-clears on channel change (the derived
  // `geoNotice` below reads null once `channelId` no longer matches).
  const [geoBlock, setGeoBlock] = useState<{ channelId: number; notice: string } | null>(null);

  // Start of THIS watch session — the wall-clock when we began watching this
  // channel. A mid-roll only fires if its scheduled instant falls inside the
  // session window ([sessionStart, now]); one whose start already passed before
  // we arrived is NOT inserted into the past (and so can't replay on re-entry).
  // The channel screen remounts per `[id]` (stacked route), so the hook's life =
  // one channel visit and the lazy initializer captures the right anchor — no
  // in-render reset (the React Compiler bans calling Date.now() during render).
  const [sessionStart] = useState(() => Date.now());

  const refresh = useCallback(() => setNowMs(Date.now()), []);

  // Re-fetch the authoritative playback decision. Prefix-only: the playback key
  // uses the STRING channelId (the screen's route param) while this hook holds the
  // numeric form; only one channel screen is ever mounted, so this refetches
  // exactly its decision. Used by the geo handler + the reconnect reconciler.
  const reconcilePlayback = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['channel-playback'] }),
    [queryClient],
  );

  // Derived (pure): the mid-roll due to show now — earliest scheduled inside the
  // current watch window, not yet shown, not lapsed. Logic lives in `@/realtime`.
  const dueAd = useMemo<AdCreative | null>(
    () => selectDueMidroll(midrolls, { nowMs, sessionStart, firedIds }),
    [midrolls, nowMs, firedIds, sessionStart],
  );

  // Arm ONE timer to the next upcoming start time, then bump the clock (+250ms so
  // it fires after the edge). Re-runs whenever the array / clock / fired-set change,
  // so each boundary chains to the next. No poll, no network.
  useEffect(() => {
    const boundary = nextMidrollBoundaryMs(midrolls, nowMs, firedIds);
    if (boundary === null) return;
    const id = setTimeout(refresh, boundary - nowMs + 250);
    return () => clearTimeout(id);
  }, [midrolls, nowMs, firedIds, refresh]);

  // Re-evaluate on foreground (timers throttled while backgrounded).
  useAppState({ onForeground: refresh });

  // Socket mid-roll mutation → write the CACHE (single source of truth); on an
  // UPDATE clear the fired flag so the new timing can re-arm. setState lives in the
  // callback (not an effect body). The cache write re-renders with the new array.
  const applyMidroll = useCallback(
    (ev: MidrollEvent) => {
      queryClient.setQueryData<Ad[]>(['ads', channelId], (prev = []) => {
        if (ev.op === 'REMOVE') return prev.filter((a) => a.id !== ev.adId);
        if (!ev.creative) return prev;
        return [...prev.filter((a) => a.id !== ev.adId), ev.creative]; // upsert by id
      });
      // Re-arm: a reschedule (ADD/UPDATE) or removal clears the "already shown"
      // flag in BOTH the per-mount state and the cross-mount module set.
      shownMidrollIds.delete(ev.adId);
      setFiredIds((s) => {
        if (!s.has(ev.adId)) return s;
        const next = new Set(s);
        next.delete(ev.adId);
        return next;
      });
    },
    [queryClient, channelId],
  );

  // Subscribe to the channel topic (mid-roll delivery + in-channel presence).
  useEffect(() => {
    const sub = subscribe(STOMP_DEST.channelTopic(channelId), (msg) => {
      try {
        applyMidroll(JSON.parse(msg.body) as MidrollEvent);
      } catch {
        // Ignore malformed frames.
      }
    });
    return () => sub?.unsubscribe();
  }, [channelId, applyMidroll, realtimeConnected]);

  // Apply one geo event. Two granularities (see `GeoEvent`):
  //
  //   - `programId` present → PER-PROGRAMME geo. Set that one EPG row's `decision`
  //     (`GEO_BLOCKED` on block, `ALLOWED` on lift) across every cached day of this
  //     channel (prefix-matched — we don't know which day holds it, and the id is
  //     unique). `decision` is the SAME field the `/epg/{programId}` endpoint
  //     returns, so the live look-ahead and the recorded-tap gate key off one flag.
  //     While the user stays in the channel the row is already updated, so the
  //     screen blocks the moment live rolls into that programme (no refetch); a
  //     re-entry / date change re-fetches the EPG which comes back already flagged.
  //   - `programId` omitted → WHOLE-CHANNEL geo. Set/clear the instant optimistic
  //     overlay (`geoBlock`) for the live stream.
  //
  // Either way, geo stays an INVALIDATION SIGNAL, not a parallel truth: we also
  // re-fetch the authoritative playback decision so the currently-playing surface
  // (live, or an open recording) converges with the server — the fix for "GEO_LIFT
  // didn't unblock in real time" (clearing local state alone fell back to a stale
  // cached `decision`; the refetch re-evaluates geo server-side).
  const applyGeo = useCallback(
    (ev: GeoEvent) => {
      // Defensive: the backend may serialize channelId as a string on some frames
      // — coerce so a type mismatch can't silently swallow a GEO_LIFT.
      if (Number(ev.channelId) !== channelId) return;
      const block = ev.type === 'GEO_BLOCK';

      if (ev.programId != null) {
        const pid = String(ev.programId);
        queryClient.setQueriesData<EpgItem[]>(
          { queryKey: ['channel-epg', String(channelId)] },
          (prev) =>
            prev?.map((p) =>
              p.id === pid
                ? {
                    ...p,
                    decision: block ? 'GEO_BLOCKED' : 'ALLOWED',
                    noticeMessage: block ? ev.noticeMessage : undefined,
                  }
                : p,
            ),
        );
      } else {
        setGeoBlock(block ? { channelId, notice: ev.noticeMessage ?? '' } : null);
      }

      reconcilePlayback();
    },
    [channelId, queryClient, reconcilePlayback],
  );

  // Subscribe to the user geo queue (Option B). Act only on events for THIS
  // channel; setState / cache writes live in the callback (not an effect body).
  useEffect(() => {
    const sub = subscribe(STOMP_DEST.userGeoQueue, (msg) => {
      try {
        applyGeo(JSON.parse(msg.body) as GeoEvent);
      } catch {
        // Ignore malformed frames.
      }
    });
    return () => sub?.unsubscribe();
  }, [applyGeo, realtimeConnected]);

  // Reconcile after a STOMP RE-connect. /user/queue/geo and /topic/channel.* are
  // plain pub/sub with NO replay, so any GEO_BLOCK/LIFT or mid-roll mutation
  // emitted while the RN socket was down (e.g. backgrounded) is lost forever. On
  // reconnect, refetch the authoritative decision + ads so the screen self-heals.
  // The FIRST connect is skipped — the decision/ads were just fetched on mount.
  const hasConnectedRef = useRef(false);
  useEffect(() => {
    if (!realtimeConnected) return;
    if (hasConnectedRef.current) {
      reconcilePlayback();
      queryClient.invalidateQueries({ queryKey: ['ads', channelId] });
    }
    hasConnectedRef.current = true;
  }, [realtimeConnected, channelId, queryClient, reconcilePlayback]);

  // Watch segment — open on enter + every program switch (backend closes prev).
  // Also re-fires on reconnect so the segment is re-opened after a drop.
  useEffect(() => {
    publish(STOMP_DEST.watch, { channelId, programId, kind });
  }, [channelId, programId, kind, realtimeConnected]);

  // Watch end — only on leaving the channel (unmount). Disconnect ends it too.
  useEffect(() => {
    return () => {
      publish(STOMP_DEST.watchEnd, { channelId });
    };
  }, [channelId]);

  const onAdComplete = useCallback(() => {
    if (!dueAd) return;
    shownMidrollIds.add(dueAd.id); // remember across remounts (don't replay on re-entry)
    setFiredIds((s) => new Set(s).add(dueAd.id));
  }, [dueAd]);

  // Live geo notice for the CURRENT channel (null once the channel changes).
  const geoNotice = geoBlock && geoBlock.channelId === channelId ? geoBlock.notice : null;

  return { dueAd, onAdComplete, geoNotice };
}
