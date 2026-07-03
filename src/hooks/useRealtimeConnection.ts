/**
 * App-level STOMP connection = presence. The held connection (and its STOMP
 * heartbeat) IS the active-user / offline signal — no polling. Mount ONCE in the
 * authenticated layout; connect while authenticated, disconnect on logout.
 */
import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { connectRealtime, disconnectRealtime } from '@/realtime';

export function useRealtimeConnection(): void {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  // The STOMP CONNECT frame needs a real Bearer. On a cold boot `isAuthenticated`
  // is true while `token` is still null (it hydrates via the first 401-refresh),
  // so connecting immediately would send an empty Authorization → server reject →
  // 2s reconnect churn. Gate on token PRESENCE (a boolean, not the value) so a
  // routine mid-session token refresh never tears the socket down — reconnects
  // pick up the fresh token via the client's `beforeConnect`.
  const hasToken = useAppStore((s) => s.token !== null);

  useEffect(() => {
    if (!isAuthenticated || !hasToken) return;
    connectRealtime();
    return () => disconnectRealtime();
  }, [isAuthenticated, hasToken]);
}
