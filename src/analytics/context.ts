/**
 * Analytics ambient context — cross-cutting state the payloads need but that
 * doesn't belong to any one screen: the current foreground session (id + start
 * time, to compute `durationMs`) and the current "view" (whether a player is
 * active and which channel), which the heartbeat snapshots each tick.
 *
 * Module-level (not the Zustand store) on purpose: it's analytics-internal, read
 * by the enrichment + heartbeat, never rendered — putting it in the store would
 * add re-render churn and coupling. Mirrors the self-contained-module rule the
 * rest of `src/analytics/` follows.
 */
import * as Crypto from 'expo-crypto';

let currentSessionId: string | null = null;
let startedAt: number | null = null;
let watching = false;
let watchingChannelId: string | null = null;

/** Opens a new session; returns its id (also used as the `session_start` prop). */
function startSession(): string {
  currentSessionId = Crypto.randomUUID();
  startedAt = Date.now();
  return currentSessionId;
}

/**
 * Closes the current session. Returns the ended session id + its duration for
 * the `session_end` payload, or `null` if none was open (idempotent).
 */
function endSession(): { sessionId: string; durationMs: number } | null {
  if (!currentSessionId || startedAt === null) return null;
  const ended = { sessionId: currentSessionId, durationMs: Date.now() - startedAt };
  currentSessionId = null;
  startedAt = null;
  return ended;
}

/** Set by the player screens on mount/unmount so the heartbeat knows what's on. */
function setWatching(channelId: string | null): void {
  watching = channelId !== null;
  watchingChannelId = channelId;
}

export const analyticsContext = {
  get sessionId(): string | null {
    return currentSessionId;
  },
  get watching(): boolean {
    return watching;
  },
  get watchingChannelId(): string | null {
    return watchingChannelId;
  },
  startSession,
  endSession,
  setWatching,
};
