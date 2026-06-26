/**
 * useWatchTracking — emits `channel_watch_start` on a player screen mount and
 * `channel_watch_end` (with watched duration) on unmount, and keeps
 * `analyticsContext` in sync so the heartbeat can report what's being watched.
 *
 * A separate hook from `useAnalytics` on purpose: `useAnalytics` owns the
 * once-per-app lifecycle (session + heartbeat) and must mount exactly once;
 * watch tracking is per-screen and per-`channelId`, so it lives here and can be
 * dropped onto any player screen with one line — `useWatchTracking(id, 'live')`.
 *
 * Keying the effect on `channelId` makes prev/next station swaps (radio) emit a
 * clean end-for-old / start-for-new pair without remounting the screen.
 */
import { useEffect } from 'react';

import { analyticsContext } from './context';
import { AnalyticsEvent, type WatchKind } from './events';
import { track } from './track';

export function useWatchTracking(channelId: string, kind: WatchKind): void {
  useEffect(() => {
    if (!channelId) return;

    const startedAt = Date.now();
    analyticsContext.setWatching(channelId);
    track(AnalyticsEvent.CHANNEL_WATCH_START, { channelId, kind });

    return () => {
      track(AnalyticsEvent.CHANNEL_WATCH_END, {
        channelId,
        kind,
        watchDurationMs: Date.now() - startedAt,
      });
      analyticsContext.setWatching(null);
    };
  }, [channelId, kind]);
}
