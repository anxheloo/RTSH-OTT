/**
 * App-level STOMP connection = presence. The held connection (and its STOMP
 * heartbeat) IS the active-user / offline signal — no polling. Mount ONCE in the
 * app layout; connect while a session exists, disconnect on logout.
 *
 * Gated on `hasSession`, NOT `isAuthenticated`, so GUESTS get a socket too. This
 * enables rather than restricts: mid-roll ad delivery and live `GEO_BLOCK` /
 * `GEO_LIFT` both ride this connection. Without it a guest could start a match
 * legally and never be cut off when an Albania-only right is enforced mid-stream.
 * (The REST halves — `GET /ads`, and geo via `PlaybackDecision` — already work on
 * a guest token; only the real-time halves depend on this.)
 */
import { useEffect } from 'react';

import { selectHasSession } from '@/store/createUserSlice';
import { useAppStore } from '@/store/useAppStore';
import { connectRealtime, disconnectRealtime } from '@/realtime';

export function useRealtimeConnection(): void {
  const hasSession = useAppStore(selectHasSession);
  // The STOMP CONNECT frame needs a real Bearer. On a cold boot the session flag
  // is true while `token` is still null (it hydrates via the first 401-refresh),
  // so connecting immediately would send an empty Authorization → server reject →
  // 2s reconnect churn. Gate on token PRESENCE (a boolean, not the value) so a
  // routine mid-session token refresh never tears the socket down — reconnects
  // pick up the fresh token via the client's `beforeConnect`.
  const hasToken = useAppStore((s) => s.token !== null);

  useEffect(() => {
    if (!hasSession || !hasToken) return;
    connectRealtime();
    return () => disconnectRealtime();
  }, [hasSession, hasToken]);
}
