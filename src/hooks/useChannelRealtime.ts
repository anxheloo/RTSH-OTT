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
 *   - derive `dueAd` = the earliest MID_ROLL whose absolute `startTime` has passed,
 *     not yet shown, not past `validUntil`;
 *   - `onAdComplete` marks it shown → the derived `dueAd` advances to the next/none.
 *
 * Watch model (docs/REALTIME_SOCKET.md): emit `/app/watch` on enter and on every
 * program switch (backend closes the previous segment — no client stop-on-switch);
 * emit `/app/watch.end` only on unmount. Disconnect/kill closes it server-side.
 *
 * GEO (Option B — backend-fired): on a GEO_BLOCK for THIS channel `geoNotice` is
 * set (the screen stops playback + shows the notice, reusing the decision-blocked
 * UI); GEO_LIFT / a channel change clears it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import type { Ad, AdCreative } from '@/types/domain';
import type { GeoEvent, MidrollEvent, WatchKind } from '@/realtime';
import { publish, STOMP_DEST, subscribe } from '@/realtime';

import { useAppState } from './useAppState';

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
  const [firedIds, setFiredIds] = useState<Set<number>>(() => new Set());
  // Geo state is keyed by channel so it self-clears on channel change (the derived
  // `geoNotice` below reads null once `channelId` no longer matches).
  const [geoBlock, setGeoBlock] = useState<{ channelId: number; notice: string } | null>(null);

  const refresh = useCallback(() => setNowMs(Date.now()), []);

  // Derived (pure): the mid-roll due to show now — earliest arrived, not yet
  // shown, not lapsed past validUntil.
  const dueAd = useMemo<AdCreative | null>(() => {
    let best: Ad | null = null;
    let bestDue = Infinity;
    for (const ad of midrolls) {
      if (ad.placement !== 'MID_ROLL' || !ad.startTime) continue;
      if (firedIds.has(ad.id)) continue;
      const due = Date.parse(ad.startTime);
      if (due > nowMs) continue; // not yet
      if (ad.validUntil && nowMs > Date.parse(ad.validUntil)) continue; // lapsed → skip
      if (due < bestDue) {
        best = ad;
        bestDue = due;
      }
    }
    return best;
  }, [midrolls, nowMs, firedIds]);

  // Arm ONE timer to the next upcoming start time, then bump the clock (+250ms so
  // it fires after the edge). Re-runs whenever the array / clock / fired-set change,
  // so each boundary chains to the next. No poll, no network.
  useEffect(() => {
    const upcoming = midrolls
      .filter((a) => a.placement === 'MID_ROLL' && a.startTime && !firedIds.has(a.id))
      .map((a) => Date.parse(a.startTime as string))
      .filter((t) => t > nowMs);
    if (upcoming.length === 0) return;
    const id = setTimeout(refresh, Math.min(...upcoming) - nowMs + 250);
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

  // Subscribe to the user geo queue (Option B). Act only on events for THIS
  // channel; setState lives in the callback, and the notice self-clears on a
  // channel change via the derived `geoNotice` below.
  useEffect(() => {
    const sub = subscribe(STOMP_DEST.userGeoQueue, (msg) => {
      try {
        const ev = JSON.parse(msg.body) as GeoEvent;
        if (ev.channelId !== channelId) return;
        setGeoBlock(
          ev.type === 'GEO_BLOCK'
            ? { channelId: ev.channelId, notice: ev.noticeMessage ?? '' }
            : null,
        );
      } catch {
        // Ignore malformed frames.
      }
    });
    return () => sub?.unsubscribe();
  }, [channelId, realtimeConnected]);

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
    setFiredIds((s) => (dueAd ? new Set(s).add(dueAd.id) : s));
  }, [dueAd]);

  // Live geo notice for the CURRENT channel (null once the channel changes).
  const geoNotice = geoBlock && geoBlock.channelId === channelId ? geoBlock.notice : null;

  return { dueAd, onAdComplete, geoNotice };
}
