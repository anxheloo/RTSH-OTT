/**
 * Real-time (STOMP) destinations + payload types. Mirrors docs/REALTIME_SOCKET.md
 * 1:1 — changing a name here without changing that doc breaks the contract.
 */
import { API_BASE_URL } from '@/api/client';
import type { Ad } from '@/types/domain';

/** ws(s)://HOST:PORT/ws — derived from the REST base (http→ws, drop /api/v1, add /ws). */
export const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')}/ws`;

export const STOMP_DEST = {
  /** SEND — "now watching" (open/switch segment). */
  watch: '/app/watch',
  /** SEND — "stopped watching" (close segment). */
  watchEnd: '/app/watch.end',
  /** SUBSCRIBE — mid-roll events + in-channel presence for one channel. */
  channelTopic: (channelId: number) => `/topic/channel.${channelId}`,
  /** SUBSCRIBE — user-scoped geo events (GEO_BLOCK/GEO_LIFT), Geo = Option B. */
  userGeoQueue: '/user/queue/geo',
} as const;

export type WatchKind = 'LIVE' | 'RECORDED';

export interface WatchStartMsg {
  channelId: number;
  programId: number | null;
  kind: WatchKind;
}

export interface WatchEndMsg {
  channelId: number;
}

export type MidrollOp = 'ADD' | 'UPDATE' | 'REMOVE';

/**
 * Server → client mid-roll mutation (one event for all three ops). `creative` is
 * the full `Ad` object (same shape as a `MID_ROLL` element of the merged ads
 * array), so its absolute `startTime` rides along — the client reschedules off it.
 */
export interface MidrollEvent {
  op: MidrollOp;
  adId: number;
  channelId: number;
  creative?: Ad; // present for ADD/UPDATE; carries startTime + validUntil
}

/**
 * Server → client geo event (Option B — backend-fired) on `/user/queue/geo`.
 * Delivered only to affected-country sessions; the client acts only when
 * `channelId` matches the channel it's currently watching.
 *
 * Two granularities, distinguished by `programId`:
 *   - **omitted / null → whole-channel geo.** Blocks the live stream now — the
 *     client shows an instant notice overlay and re-fetches the playback decision.
 *   - **present → per-programme geo.** Sets that one EPG row's `decision`
 *     (`GEO_BLOCKED`/`ALLOWED`) in the cached schedule (no refetch) — the same
 *     field `/epg/{programId}` returns. While the user stays in the channel the
 *     look-ahead is already in place, so when live rolls into that programme the
 *     screen stops the stream at the boundary; a re-entry re-fetches the EPG,
 *     which comes back with `decision` already set.
 */
export interface GeoEvent {
  type: 'GEO_BLOCK' | 'GEO_LIFT';
  channelId: number;
  /** Present → the event targets this one programme; omitted/null → whole channel. */
  programId?: number | null;
  noticeMessage?: string; // localized server-side; shown verbatim on GEO_BLOCK
}
