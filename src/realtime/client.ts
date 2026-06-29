/**
 * STOMP-over-WebSocket singleton. One connection for the whole authenticated app
 * (= presence). Auth rides the CONNECT frame (`Authorization: Bearer <token>`),
 * re-read on every (re)connect via `beforeConnect` so a refreshed token is used.
 * Contract: docs/REALTIME_SOCKET.md.
 */
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

import { useAppStore } from '@/store/useAppStore';

import { WS_URL } from './events';

let client: Client | null = null;

export function connectRealtime(): void {
  if (client) return;

  client = new Client({
    brokerURL: WS_URL,
    // --- React Native frame-integrity workarounds (stomp-js RN notes) ---
    // RN's WebSocket strips the trailing NULL byte that terminates every STOMP
    // frame, silently corrupting the protocol (works in dev, flakes in release).
    //  • forceBinaryWSFrames: send OUTGOING frames as binary so the NULL survives.
    //  • appendMissingNULLonIncoming: re-append the NULL the RN socket chops off
    //    INCOMING text frames (Spring's STOMP broker sends text by default).
    // Safe for small, unfragmented messages — ours are tiny JSON. We intentionally
    // do NOT force the broker to binary (that can trigger an Android "blob" error).
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    reconnectDelay: 2000,
    connectionTimeout: 10000, // fail a stalled CONNECT (flaky mobile) → retry after reconnectDelay
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // Re-read the freshest access token before each (re)connect.
    beforeConnect: () => {
      const token = useAppStore.getState().token ?? '';
      client!.connectHeaders = { Authorization: `Bearer ${token}` };
    },
    onConnect: () => useAppStore.getState().updateRealtimeSlice({ realtimeConnected: true }),
    onDisconnect: () => useAppStore.getState().updateRealtimeSlice({ realtimeConnected: false }),
    onWebSocketClose: () => useAppStore.getState().updateRealtimeSlice({ realtimeConnected: false }),
  });

  client.activate();
}

export function disconnectRealtime(): void {
  void client?.deactivate();
  client = null;
  useAppStore.getState().updateRealtimeSlice({ realtimeConnected: false });
}

/** Fire-and-forget SEND. No-op if not yet connected (RN may call mid-reconnect). */
export function publish(destination: string, body: object): void {
  if (!client?.connected) return;
  client.publish({ destination, body: JSON.stringify(body) });
}

/** SUBSCRIBE. Returns null if not connected — caller should re-subscribe on connect. */
export function subscribe(
  destination: string,
  onMessage: (msg: IMessage) => void,
): StompSubscription | null {
  return client?.connected ? client.subscribe(destination, onMessage) : null;
}
