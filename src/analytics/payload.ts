/**
 * Shared event enrichment — turns a bare `{ event, props }` into the full wire
 * payload (device meta + current session id + client timestamp). Used by the
 * `track()` emitter (and therefore the heartbeat, which goes through `track()`),
 * so the enriched shape is defined in exactly one place.
 *
 * `buildDeviceRegistration` is cheap after first call (the deviceKey is cached in
 * `utils/device.ts`; the rest is sync `expo-device`/`expo-application`).
 */
import { buildDeviceRegistration } from '@/utils/device';

import { analyticsContext } from './context';
import type { AnalyticsEventInput, AnalyticsEventPayload } from './events';

export async function buildAnalyticsPayload({
  event,
  props,
}: AnalyticsEventInput): Promise<AnalyticsEventPayload> {
  const device = await buildDeviceRegistration();
  return { event, props, ts: Date.now(), sessionId: analyticsContext.sessionId, device };
}
