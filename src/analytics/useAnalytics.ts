/**
 * useAnalytics — the single analytics hook. Mount it **once** in `(app)/_layout`:
 * it owns the whole lifecycle (no boilerplate leaks into the layout) and returns
 * the `track` emitter for discrete events fired from screens.
 *
 * What it owns, encapsulated here:
 *  - **`app_open`** — once per process (module guard survives dev double-mount).
 *  - **session** — `session_start` on mount + on return-to-foreground;
 *    `session_end` (with duration) on background + unmount. A "session" is one
 *    continuous foreground period; `session_end` is best-effort (an OS-killed
 *    app can't send one — the heartbeat is the reliable liveness signal).
 *  - **heartbeat** — a `useQuery` polling at `HEARTBEAT_INTERVAL_MS`. A query,
 *    not a manual timer, because `refetchIntervalInBackground: false` auto-pauses
 *    it while backgrounded via the app's `focusManager` bridge and
 *    `refetchOnWindowFocus` fires an immediate beat on return — background-aware
 *    for free. `enabled: analyticsEnabled` is the opt-out.
 *
 * Discrete screen events (`channel_watch_*`, `stream_error`) call the returned
 * `track` (or import it directly) — `track` is a plain fire-and-forget function,
 * so other screens never re-mount this lifecycle.
 */
import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { SILENT_ERROR } from '@/api/client';
import { useAppState } from '@/hooks/useAppState';

import { analyticsContext } from './context';
import { AnalyticsEvent } from './events';
import { sendEvent, track } from './track';

const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

// Once per process — immune to dev double-mount / JS reload re-firing `app_open`.
let appOpenFired = false;

function openSession(): void {
  const sessionId = analyticsContext.startSession();
  track(AnalyticsEvent.SESSION_START, { sessionId });
}

function closeSession(): void {
  const ended = analyticsContext.endSession();
  if (ended) track(AnalyticsEvent.SESSION_END, ended);
}

async function heartbeatPing(): Promise<null> {
  await sendEvent({
    event: AnalyticsEvent.HEARTBEAT,
    props: {
      state: analyticsContext.watching ? 'watching' : 'foreground',
      channelId: analyticsContext.watchingChannelId ?? undefined,
    },
  }).catch(() => {});
  return null;
}

export function useAnalytics() {
  const analyticsEnabled = useAppStore((s) => s.analyticsEnabled);

  // app_open — fire once per process on first mount.
  useEffect(() => {
    if (appOpenFired) return;
    appOpenFired = true;
    track(AnalyticsEvent.APP_OPEN, {});
  }, []);

  // session — open on mount, close on unmount (logout / teardown). Foreground
  // transitions are handled by useAppState below.
  useEffect(() => {
    openSession();
    return closeSession;
  }, []);

  useAppState({ onForeground: openSession, onBackground: closeSession });

  // heartbeat — periodic liveness ping (paused while backgrounded).
  useQuery({
    queryKey: ['analytics', 'heartbeat'],
    queryFn: heartbeatPing,
    enabled: analyticsEnabled,
    refetchInterval: HEARTBEAT_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    meta: SILENT_ERROR,
  });

  return { track };
}
