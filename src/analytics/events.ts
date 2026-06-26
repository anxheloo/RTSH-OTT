/**
 * Analytics event taxonomy — the six spec-mandated events (MW.14 / Mon.6) plus
 * a periodic `heartbeat` for robust liveness (mobile `session_end` is lossy:
 * an OS-killed app never sends one, so active-user counts would over-count
 * without a heartbeat the backend can age out).
 *
 * `AnalyticsEvent` is a `const`-object enum (dot-access `AnalyticsEvent.APP_OPEN`)
 * rather than a TS `enum` — the project bans `enum` (STYLE_GUIDE: prefer string
 * unions / `as const` tables); this gives the same call-site ergonomics with a
 * plain union type.
 *
 * `AnalyticsEventProps` is the per-event payload map: `track(event, props)` is
 * typed against it, so each event accepts only its valid props. **No PII** —
 * email/token/displayName are absent by type, not by discipline; the backend
 * stamps `userId` (from the auth token) and country (from request IP).
 */
import type { DeviceRegistration } from '@/types/domain';

export const AnalyticsEvent = {
  /** Every cold start (anonymous — fires before auth). Device meta only. */
  APP_OPEN: 'app_open',
  /** Authenticated session begins (boot / return-to-foreground). */
  SESSION_START: 'session_start',
  /** Session ends (app backgrounded). Best-effort — see heartbeat note above. */
  SESSION_END: 'session_end',
  /** A player mounts and begins playback (live / radio / recorded). */
  CHANNEL_WATCH_START: 'channel_watch_start',
  /** That player unmounts — carries the watched duration. */
  CHANNEL_WATCH_END: 'channel_watch_end',
  /** Playback failed (stream/CDN/geo error surfaced by the player). */
  STREAM_ERROR: 'stream_error',
  /** Periodic liveness ping while foregrounded. */
  HEARTBEAT: 'heartbeat',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** What is being watched — distinguishes the three player surfaces. */
export type WatchKind = 'live' | 'radio' | 'recorded';

/**
 * Per-event props contract. `track(event, props)` enforces this map, so a
 * mismatched/extra prop is a compile error. Keep every shape PII-free.
 */
export interface AnalyticsEventProps {
  [AnalyticsEvent.APP_OPEN]: Record<string, never>;
  [AnalyticsEvent.SESSION_START]: { sessionId: string };
  [AnalyticsEvent.SESSION_END]: { sessionId: string; durationMs: number };
  [AnalyticsEvent.CHANNEL_WATCH_START]: { channelId: string; kind: WatchKind };
  [AnalyticsEvent.CHANNEL_WATCH_END]: { channelId: string; kind: WatchKind; watchDurationMs: number };
  [AnalyticsEvent.STREAM_ERROR]: { channelId: string; errorType: string };
  /** `channelId` present only while a player is active (`state: 'watching'`). */
  [AnalyticsEvent.HEARTBEAT]: { state: 'foreground' | 'watching'; channelId?: string };
}

/** Loose shape the reused mutation accepts (the generic `track()` narrows it). */
export interface AnalyticsEventInput {
  event: AnalyticsEventName;
  props: Record<string, unknown>;
}

/**
 * The enriched wire payload sent to `POST /analytics/events`. `device` reuses
 * the registry's `DeviceRegistration` shape (deviceKey + form factor + OS +
 * version) — no PII. `userId` + country are added server-side from the request.
 */
export interface AnalyticsEventPayload extends AnalyticsEventInput {
  /** Client epoch ms — the backend can also trust its own receive time. */
  ts: number;
  /** Current foreground session id (`null` for pre-auth `app_open`). */
  sessionId: string | null;
  device: DeviceRegistration;
}
