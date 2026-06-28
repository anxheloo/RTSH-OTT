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

  useEffect(() => {
    if (!isAuthenticated) return;
    connectRealtime();
    return () => disconnectRealtime();
  }, [isAuthenticated]);
}
