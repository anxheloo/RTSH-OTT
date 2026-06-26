/**
 * Analytics module barrel — first-party telemetry (spec MW.14 / Mon.6).
 * Import from '@/analytics' instead of individual files.
 *
 * - `useAnalytics()` — the single hook: returns `track`, runs the heartbeat.
 * - `track` — the fire-and-forget emitter (also callable outside React).
 * - `analyticsContext` — session + watching state the wiring updates.
 * - `AnalyticsEvent` — the event-name enum.
 */
export { analyticsContext } from './context';
export type { AnalyticsEventName, AnalyticsEventProps, WatchKind } from './events';
export { AnalyticsEvent } from './events';
export { track } from './track';
export { useAnalytics } from './useAnalytics';
export { useWatchTracking } from './useWatchTracking';
