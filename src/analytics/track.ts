/**
 * track — the single fire-and-forget analytics emitter. Builds the enriched
 * payload and posts it; failures are swallowed (telemetry is lossy-tolerant, a
 * dropped event must never affect the app).
 *
 * Why a plain function, not `useMutation`/`useQuery`:
 *  - Discrete events are imperative writes with per-call params — a query can't
 *    fire on demand, and a mutation's retry/cache machinery is dead weight for
 *    fire-and-forget telemetry.
 *  - A raw service `apiClient.post` **bypasses the `QueryCache`/`MutationCache`**,
 *    so it never triggers the global error modal — swallowing here is the only
 *    silencing needed.
 *  - Hook-free, so it's callable from anywhere, including non-React code.
 *
 * `track` returns `void` (not a promise) by design: the async send runs
 * detached, so call sites stay clean — `track(AnalyticsEvent.X, {...})`, no
 * `await`, no `void`. Opt-out (spec MW.14 / Mon.6) is enforced here.
 *
 * `sendEvent` is the awaitable core, exported only for the heartbeat query whose
 * `queryFn` must return a promise so polling knows when a beat completes.
 */
import { useAppStore } from '@/store/useAppStore';
import { sendAnalyticsEvents } from '@/api/services/analytics';

import type { AnalyticsEventInput, AnalyticsEventName, AnalyticsEventProps } from './events';
import { buildAnalyticsPayload } from './payload';

export async function sendEvent(input: AnalyticsEventInput): Promise<void> {
  const payload = await buildAnalyticsPayload(input);
  await sendAnalyticsEvents([payload]);
}

export function track<E extends AnalyticsEventName>(event: E, props: AnalyticsEventProps[E]): void {
  if (!useAppStore.getState().analyticsEnabled) return;
  sendEvent({ event, props }).catch(() => {});
}
