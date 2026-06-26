/**
 * Analytics ingestion. Fire-and-forget telemetry — callers must never block UI
 * on it and the mutation that wraps it carries `meta: SILENT_ERROR`, so a failed
 * flush is dropped silently (lossy-tolerant by design). The wire shape is a
 * batch (`{ events: [...] }`) even though the client posts one event per call,
 * so batching can be added later without a contract change.
 */
import type { AnalyticsEventPayload } from '@/analytics/events';

import { apiClient } from '../client';
import { ANALYTICS_ROUTES } from '../endpoints';

export async function sendAnalyticsEvents(events: AnalyticsEventPayload[]): Promise<void> {
  await apiClient.post(ANALYTICS_ROUTES.EVENTS, { events });
}
