---
paths:
  - "src/analytics/**"
  - "src/api/services/analytics.ts"
---

# Analytics & telemetry

> **Status: DISABLED.** The module is fully built as described below, but every mount is commented out — `useAnalytics()` in `(app)/_layout.tsx`, `useWatchTracking` + the `stream_error` `onError` in `channel/[id].tsx`. Nothing emits today. Re-enable (or formally defer) is tracked in `.claude/docs/plan.md → Phase 14`.

## How it works today (built 2026-06-26)

First-party telemetry (spec MW.14 / Mon.6) — the app emits standardized events to its own backend (`POST /analytics/events`), which aggregates them for the RTSH admin dashboards. No third-party SDK (Firebase/GA): RTSH owns the dashboard data, and the swappable `src/analytics/` module keeps it that way over the contract's lifetime.

Self-contained module `src/analytics/` (import from `@/analytics`):

- **`events.ts`** — `AnalyticsEvent` (a `const`-object enum, not a TS `enum` — STYLE_GUIDE bans `enum`; dot-access `AnalyticsEvent.APP_OPEN` with a plain union type) + `AnalyticsEventProps` (per-event payload map). `track(event, props)` is typed against the map, so each event accepts only its valid props — **no PII by type** (no email/token/displayName); the backend stamps `userId` (from the auth token) + country (from request IP, no client geo permission).
- **`track.ts`** — the single emitter. `track(event, props): void` is **fire-and-forget** (not `useMutation`/`useQuery`): discrete events are imperative writes with per-call params — a query can't fire on demand and a mutation's retry/cache machinery is dead weight for lossy telemetry. A raw service `apiClient.post` (via `sendAnalyticsEvents`) **bypasses the `QueryCache`/`MutationCache`**, so it never triggers the global error modal — the `.catch` is the only silencing needed (no `SILENT_ERROR` meta). Returns `void` (async send runs detached) so call sites stay clean. Opt-out (`settings.analyticsEnabled`) is enforced here. Hook-free → callable outside React. Exports `sendEvent` (awaitable core) for the heartbeat.
- **`payload.ts`** — `buildAnalyticsPayload` enriches `{ event, props }` → `{ event, props, ts, sessionId, device }` (device meta reuses `DeviceRegistration`; deviceKey is the cached keychain UUID). One enrichment site for both `track` and the heartbeat.
- **`context.ts`** — module-level (not the store — analytics-internal, never rendered) session (id + start time → `durationMs`) + "view" (watching + channelId) the heartbeat snapshots.
- **`useAnalytics.ts`** — the single hook. Mount **once** in `(app)/_layout`; it owns the whole lifecycle (no boilerplate in the layout) and returns `{ track }`:
  - **`app_open`** — once per process (module guard survives dev double-mount / JS reload).
  - **session** — `session_start` on mount + return-to-foreground; `session_end` (with `durationMs`) on background + unmount (via `useAppState`). `session_end` is best-effort (an OS-killed app can't send one — the heartbeat is the reliable liveness signal).
  - **heartbeat** — a **`useQuery` + `refetchInterval: 5min`**, NOT a manual timer. A query because `refetchIntervalInBackground: false` auto-pauses it while backgrounded **via the existing `setupFocusManager` (AppState→`focusManager`) bridge**, and `refetchOnWindowFocus` fires an immediate beat on return — background-aware for free, consistent with `useMeQuery`/`useChannelPlaybackQuery`. `enabled: analyticsEnabled` is the opt-out. The `queryFn` reuses `sendEvent`, so there's one emitter under the hood. Each beat carries `{ state: 'watching' | 'foreground', channelId? }`.
- **`useWatchTracking.ts`** — per-screen `channel_watch_start`/`_end` (+ duration), keyed on `channelId`. A **separate** hook from `useAnalytics` on purpose: `useAnalytics` must mount once (session/heartbeat), watch tracking is per-screen — calling `useAnalytics` on a screen would duplicate sessions. One line per player: `useWatchTracking(id, kind)`.

Event wiring:

| Event                                      | Site                                                                                                                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_open`, `session_start`, `session_end` | `useAnalytics()` in `(app)/_layout`                                                                                                                                                                                                      |
| `channel_watch_start` / `_end`             | `useWatchTracking` — channel screen (`'live'`/`'recorded'`, re-pairs on live↔recorded flip) + **`RadioAudioHost`** (`'radio'`, keyed on `radioChannelId` so it tracks the engine's lifetime, not the screen — radio survives navigation) |
| `stream_error`                             | `LivePlayer`'s new `onError` prop → channel screen `track(STREAM_ERROR, { channelId, errorType })`                                                                                                                                       |
| `heartbeat`                                | `useAnalytics()` query tick                                                                                                                                                                                                              |

## Why these choices

- **Two primitives, not one.** Discrete events (`track`, fire-and-forget) and the periodic heartbeat (`useQuery` poll) are genuinely different interaction models — forcing the events through a query (no imperative per-call params; shared key dedupes) is the anti-pattern. They share one enrichment helper + one service, so it's not duplication.
- **Heartbeat as a query, not `setInterval`.** Reuses TanStack's interval + the app's `focusManager` bridge for background-pause + foreground-beat with zero manual `AppState` code.
- **First-party, fire-and-forget.** Telemetry must never affect the app (lossy-tolerant) and RTSH owns the data — so a plain `apiClient.post` that bypasses the global error machinery, behind a typed no-PII payload.

## Known gaps

- **`app_open` fires post-auth.** `useAnalytics` mounts in `(app)/_layout`, so a logged-out cold start (sitting on login) doesn't emit `app_open` until after auth. Acceptable for v1 (open funnel ≈ authenticated open); move the hook to the root layout with auth-gated session/heartbeat if pre-auth opens are needed.
- **`stream_error` errorType is coarse** — expo-video exposes no stable error code at the `statusChange` boundary, so it's a constant `'playback'`. Refine if the player surfaces a code.
- **Backend contract assumed** — `POST /analytics/events { events: [...] }` shape + the event names/props are the client's proposal; confirm with the middleware team (they own ingestion). No fallback provider (PostHog/Amplitude) wired.
- **Recorded vs live watch granularity** — the channel screen emits a fresh `watch_start`/`_end` pair when flipping live↔recorded (kind changes); fine-grained but means one screen visit can yield multiple watch sessions. Intentional.

---
