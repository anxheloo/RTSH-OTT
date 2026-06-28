# Real-time STOMP layer + merged ads — client implementation plan

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax. There is **no
> test runner** in this repo — the verification gate for every task is `npm run lint && npx tsc --noEmit`
> (clean), plus the manual smoke check noted in the task.

**Goal:** Add a STOMP-over-WebSocket real-time layer covering four concerns — presence (active users),
in-channel presence, per-program watch time, and mid-roll ad add/update/remove — **and** collapse the
ad fetch into one merged array call per context (`placement` tagged), so channel open is a single request.
Playback `/refresh` and geo are untouched.

**Architecture:** One app-level STOMP connection (= presence), opened on authenticated entry. A per-
channel hook subscribes to the channel's topic (receives mid-roll events + signals in-channel presence),
emits watch-segment events (open on enter/switch, end on leave), and runs a background-safe single-timer
mid-roll scheduler. **Ad data is single-sourced in the TanStack cache (`['ads', channelId]`)** — the
initial array and socket add/update/remove both live there (socket handler calls `setQueryData`, keyed by
ad id); the hook holds only ephemeral scheduling mechanics (armed timer, fired-ids, the due ad).

**Tech Stack:** `@stomp/stompjs` over RN's native WebSocket · Zustand runtime slice · existing `useAppState`
foreground hook · existing `AdOverlay`.

## Global Constraints

- Backend contract is **`docs/REALTIME_SOCKET.md`** (STOMP + merged ads) — destinations/payloads/ad shape
  must match it verbatim.
- **Merged ads:** one `GET /ads?channelId={id}` returns an `Ad[]` containing the `CHANNEL_CHANGE` preroll
  **and** all `MID_ROLL`s for that channel; `GET /ads` (no channelId) returns the `APP_OPEN` ad. Each
  object carries a `placement`; mid-rolls additionally carry an absolute `startTime` (+ optional `validUntil`).
- **No `any`** · **No `console.log`** in commits · `@/` aliases only.
- Runtime slice fields are **NOT** added to the store `partialize` (live state, like `NetworkSlice`).
- WS URL derived from `API_BASE_URL`: `http→ws`, strip `/api/v1`, append `/ws` → `ws://46.183.121.56:8089/ws`.
  Prod needs `wss://` (iOS ATS).
- Imperative store access outside React via `useAppStore.getState()`.
- Verification gate per task: `npm run lint && npx tsc --noEmit` clean.

---

### Task 1: Dependency + RN polyfill

**Files:**
- Modify: `package.json` (add dep)
- Possibly modify: app entry (`package.json` `main`) for a `TextEncoder` polyfill import.

**Interfaces:**
- Produces: `@stomp/stompjs` available; `TextEncoder`/`TextDecoder` present in the RN runtime.

- [ ] **Step 1: Install** — `npx expo install @stomp/stompjs`
- [ ] **Step 2: Verify TextEncoder/TextDecoder.** `@stomp/stompjs` v7 needs them. Hermes on RN 0.85 ships
  them — confirm `typeof TextEncoder === 'function'` (TEMP log, then remove). If missing:
  `npx expo install text-encoding` and `import 'text-encoding';` as **line 1** of the app entry.
- [ ] **Step 3: Verify** — `npm run lint && npx tsc --noEmit` clean; app boots.

---

### Task 2: Realtime events + socket types (`src/realtime/events.ts`)

**Files:**
- Create: `src/realtime/events.ts`

**Interfaces:**
- Produces: `WS_URL`, `STOMP_DEST`, `WatchKind`, `WatchStartMsg`, `WatchEndMsg`, `MidrollOp`, `MidrollEvent`.

- [ ] **Step 1: Write the file**

```ts
/**
 * Real-time (STOMP) destinations + payload types. Mirrors docs/REALTIME_SOCKET.md
 * 1:1 — changing a name here without changing that doc breaks the contract.
 */
import { API_BASE_URL } from '@/api/client';
import type { Ad } from '@/types/domain';

/** ws(s)://HOST:PORT/ws — derived from the REST base (http→ws, drop /api/v1, add /ws). */
export const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')}/ws`;

export const STOMP_DEST = {
  /** SEND — "now watching" (open/switch segment). */
  watch: '/app/watch',
  /** SEND — "stopped watching" (close segment). */
  watchEnd: '/app/watch.end',
  /** SUBSCRIBE — mid-roll events + in-channel presence for one channel. */
  channelTopic: (channelId: number) => `/topic/channel.${channelId}`,
} as const;

export type WatchKind = 'LIVE' | 'RECORDED';

export interface WatchStartMsg {
  channelId: number;
  programId: number | null;
  kind: WatchKind;
}

export interface WatchEndMsg {
  channelId: number;
}

export type MidrollOp = 'ADD' | 'UPDATE' | 'REMOVE';

/**
 * Server → client mid-roll mutation (one event for all three ops). `creative` is
 * the full `Ad` object (same shape as a `MID_ROLL` element of the merged ads
 * array), so its absolute `startTime` rides along — the client reschedules off it.
 */
export interface MidrollEvent {
  op: MidrollOp;
  adId: number;
  channelId: number;
  creative?: Ad; // present for ADD/UPDATE; carries startTime + validUntil
}
```

- [ ] **Step 2: Verify** — `npm run lint && npx tsc --noEmit` clean.

---

### Task 3: Runtime store slice (`src/store/createRealtimeSlice.ts`)

**Files:**
- Create: `src/store/createRealtimeSlice.ts`
- Modify: `src/store/useAppStore.ts` (compose; NOT in `partialize`)

**Interfaces:**
- Produces: `RealtimeSlice { realtimeConnected: boolean; updateRealtimeSlice(...) }`.

- [ ] **Step 1: Write the slice** (mirrors `createNetworkSlice` — runtime, not persisted)

```ts
import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

/**
 * Runtime real-time connection state, written by the STOMP client singleton
 * (`src/realtime/client.ts`). Not persisted — live connection state.
 */
export interface RealtimeSlice {
  realtimeConnected: boolean;
  updateRealtimeSlice: (data: Partial<RealtimeSlice>) => void;
}

export const createRealtimeSlice: StateCreator<AppStore, [], [], RealtimeSlice> = (set) => ({
  realtimeConnected: false,
  updateRealtimeSlice: (data) => set(data as Partial<AppStore>),
});
```

- [ ] **Step 2: Compose** into `useAppStore.ts` — import, add `RealtimeSlice` to the `AppStore` union,
  spread `createRealtimeSlice(...a)`. Do **not** add `realtimeConnected` to `partialize`.
- [ ] **Step 3: Verify** — `npm run lint && npx tsc --noEmit` clean.

---

### Task 4: STOMP client singleton (`src/realtime/client.ts` + barrel)

**Files:**
- Create: `src/realtime/client.ts`
- Create: `src/realtime/index.ts`

**Interfaces:**
- Consumes: `WS_URL`, `STOMP_DEST` (Task 2); `useAppStore` (Task 3).
- Produces: `connectRealtime()`, `disconnectRealtime()`, `publish(dest, body)`,
  `subscribe(dest, cb): StompSubscription | null`.

- [ ] **Step 1: Write the client**

```ts
/**
 * STOMP-over-WebSocket singleton. One connection for the whole authenticated app
 * (= presence). Auth rides the CONNECT frame (`Authorization: Bearer <token>`),
 * re-read on every (re)connect via `beforeConnect`. Contract: docs/REALTIME_SOCKET.md.
 */
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

import { useAppStore } from '@/store/useAppStore';

import { WS_URL } from './events';

let client: Client | null = null;

export function connectRealtime(): void {
  if (client) return;

  client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
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

/** Fire-and-forget SEND. No-op if not yet connected. */
export function publish(destination: string, body: object): void {
  if (!client?.connected) return;
  client.publish({ destination, body: JSON.stringify(body) });
}

/** SUBSCRIBE. Returns null if not connected — caller re-subscribes on connect. */
export function subscribe(
  destination: string,
  onMessage: (msg: IMessage) => void,
): StompSubscription | null {
  return client?.connected ? client.subscribe(destination, onMessage) : null;
}
```

- [ ] **Step 2: Barrel** — `src/realtime/index.ts`

```ts
/** Real-time (STOMP) layer barrel. Import from '@/realtime'. */
export { connectRealtime, disconnectRealtime, publish, subscribe } from './client';
export { STOMP_DEST, WS_URL } from './events';
export type { MidrollEvent, MidrollOp, WatchEndMsg, WatchKind, WatchStartMsg } from './events';
```

- [ ] **Step 3: Verify** — `npm run lint && npx tsc --noEmit` clean.

---

### Task 5: App-level connection hook = presence (`src/hooks/useRealtimeConnection.ts`)

**Files:**
- Create: `src/hooks/useRealtimeConnection.ts`
- Modify: `src/hooks/index.ts` (export)
- Modify: `src/app/(app)/_layout.tsx` (mount once)

**Interfaces:**
- Consumes: `connectRealtime`/`disconnectRealtime` (Task 4); `useAppStore.isAuthenticated`.
- Produces: `useRealtimeConnection(): void`.

- [ ] **Step 1: Write the hook**

```ts
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
```

- [ ] **Step 2: Export** from `src/hooks/index.ts`: `export { useRealtimeConnection } from './useRealtimeConnection';`
- [ ] **Step 3: Mount** in `(app)/_layout.tsx` after `useDeviceIdentity()`:
  `import { useDeviceIdentity, useRealtimeConnection } from '@/hooks';` then `useRealtimeConnection();`
- [ ] **Step 4: Verify** — lint+tsc clean. Smoke: login → backend CONNECT + presence; kill → disconnect.

---

### Task 6: Merged ads type + service + query

**Files:**
- Modify: `src/types/domain.ts` (add `Ad`)
- Create: `src/api/services/ads.ts` (or extend the existing ads service if present)
- Create: `src/api/queries/useAdsQuery.ts`
- Modify: `src/api/queries/index.ts` (export)
- Modify: `src/api/endpoints.ts` (confirm/add `ADS_ROUTES`)

**Interfaces:**
- Produces: `Ad` (extends `AdCreative` + `placement` + mid-roll timing); `getAds(channelId?)`;
  `useAdsQuery(channelId?, options?) → { ads: Ad[] }`.

- [ ] **Step 1: Add the `Ad` domain type** — `src/types/domain.ts`, right after `AdCreative`:

```ts
/**
 * Merged ad element from `GET /ads` / `GET /ads?channelId={id}`. The backend
 * returns one array per context, each object tagged with its `placement`:
 *  - channel open  → one `CHANNEL_CHANGE` (preroll) + N `MID_ROLL`
 *  - app open      → one `APP_OPEN`
 * `startTime` / `validUntil` are populated for `MID_ROLL` only (when to fire /
 * when to drop); preroll + app-open fire immediately and omit them.
 */
export interface Ad extends AdCreative {
  placement: AdPlacement;
  /** MID_ROLL only — absolute ISO-8601 instant to fire (admin's chosen time). */
  startTime?: string;
  /** MID_ROLL only — ISO; drop if missed after a long background. */
  validUntil?: string;
}
```

- [ ] **Step 2: Service** — `src/api/services/ads.ts`:

```ts
import { apiClient } from '../client';
import { ADS_ROUTES } from '../endpoints';
import type { Ad } from '@/types/domain';

/**
 * One merged ads call per context. With `channelId` → the channel's CHANNEL_CHANGE
 * preroll + all MID_ROLLs. Without → the APP_OPEN ad. Always an array (`[]` = none).
 */
export const getAds = async (channelId?: number): Promise<Ad[]> => {
  const res = await apiClient.get(ADS_ROUTES, {
    params: channelId != null ? { channelId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};
```

(If `endpoints.ts` lacks `ADS_ROUTES`, add `export const ADS_ROUTES = 'ads';`.)

- [ ] **Step 3: Query hook** — `src/api/queries/useAdsQuery.ts`:

```ts
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { getAds } from '../services/ads';
import type { Ad } from '@/types/domain';

/**
 * Merged ads for a context. `staleTime: 0` / `gcTime: 0` — ads are decided fresh
 * per open (matches the prior `useAdQuery`). Caller splits by `placement`.
 */
export const useAdsQuery = (
  channelId?: number,
  options?: Partial<UseQueryOptions<Ad[]>>,
) => {
  const { data } = useQuery<Ad[]>({
    queryKey: ['ads', channelId ?? 'app'],
    queryFn: () => getAds(channelId),
    staleTime: 0,
    gcTime: 0,
    ...options,
  });
  return { ads: data ?? [] };
};
```

- [ ] **Step 4: Export** from `src/api/queries/index.ts`.
- [ ] **Step 5: Verify** — lint+tsc clean.

---

### Task 7: Per-channel hook — subscribe + watch + seeded mid-roll scheduler (`src/hooks/useChannelRealtime.ts`)

**Files:**
- Create: `src/hooks/useChannelRealtime.ts`
- Modify: `src/hooks/index.ts` (export)

**Interfaces:**
- Consumes: `subscribe`, `publish`, `STOMP_DEST`, `MidrollEvent`, `WatchKind` (Tasks 2/4); `useAppState`;
  `useQueryClient` (writes `['ads', channelId]`); `Ad`, `AdCreative` (`types/domain`).
- Produces: `useChannelRealtime(channelId, programId, kind, midrolls: Ad[]) →
  { dueAd: AdCreative | null; onAdComplete: () => void }`.

- [ ] **Step 1: Write the hook**

```ts
/**
 * Per-channel real-time: subscribes to the channel topic (receives mid-roll
 * events + signals in-channel presence), emits watch-segment events, and runs a
 * background-safe single-timer mid-roll scheduler.
 *
 * SOURCE OF TRUTH for the ad DATA is the TanStack cache (['ads', channelId]):
 * both the initial array and socket mutations live there (socket handler calls
 * `setQueryData`). This hook holds only the scheduling MECHANICS:
 *   - firedRef    : ids already shown (don't replay on re-render / foreground)
 *   - timerRef    : the one armed setTimeout (so we can cancel / re-arm it)
 *   - dueAd       : state — the ad to show NOW (drives the <AdOverlay> render)
 *   - midrollsRef : a live mirror of the array so the timer / foreground
 *                   callbacks read the freshest list without rebuilding the timer.
 *
 * Watch model (docs/REALTIME_SOCKET.md): emit `/app/watch` on enter and on every
 * program switch (backend closes the previous segment automatically — no client
 * stop-on-switch); emit `/app/watch.end` only on unmount. Disconnect/kill closes
 * the segment server-side.
 *
 * Mid-roll fires at the ad's ABSOLUTE `startTime` (one setTimeout to the soonest
 * unfired); re-evaluated on foreground. Each ad fires once; an ad past its
 * `validUntil` after a background is skipped, not fired late.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useAppState } from '@/hooks/useAppState';
import { publish, STOMP_DEST, subscribe } from '@/realtime';
import type { MidrollEvent, WatchKind } from '@/realtime';
import type { Ad, AdCreative } from '@/types/domain';

export function useChannelRealtime(
  channelId: number,
  programId: number | null,
  kind: WatchKind,
  midrolls: Ad[],
): { dueAd: AdCreative | null; onAdComplete: () => void } {
  const queryClient = useQueryClient();
  const [dueAd, setDueAd] = useState<AdCreative | null>(null);
  const firedRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const midrollsRef = useRef<Ad[]>(midrolls);

  // Evaluate off the latest array: fire anything due, arm one timer to the next.
  // Stable (reads refs only) so the timer / foreground callbacks can call it.
  const evaluate = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const now = Date.now();
    let soonest: number | null = null;

    for (const ad of midrollsRef.current) {
      if (ad.placement !== 'MID_ROLL' || !ad.startTime) continue;
      if (firedRef.current.has(ad.id)) continue;
      if (ad.validUntil && now > Date.parse(ad.validUntil)) continue; // lapsed → skip
      const dueAt = Date.parse(ad.startTime);
      if (dueAt <= now) {
        firedRef.current.add(ad.id);
        setDueAd((cur) => cur ?? ad); // don't preempt a showing ad
        continue;
      }
      soonest = soonest == null ? dueAt : Math.min(soonest, dueAt);
    }

    if (soonest != null) {
      timerRef.current = setTimeout(evaluate, Math.max(0, soonest - Date.now()));
    }
  }, []);

  // Mirror the latest array + re-evaluate whenever it changes (initial load OR a
  // socket mutation that wrote the cache → screen re-renders → new array down).
  useEffect(() => {
    midrollsRef.current = midrolls;
    evaluate();
  }, [midrolls, evaluate]);

  // Socket mutation → write the CACHE (single source of truth), then clear the
  // fired flag so an UPDATE can re-arm. The cache write re-renders the screen,
  // which passes the new array down → the effect above re-evaluates.
  const applyMidroll = useCallback(
    (ev: MidrollEvent) => {
      queryClient.setQueryData<Ad[]>(['ads', channelId], (prev = []) => {
        if (ev.op === 'REMOVE') return prev.filter((a) => a.id !== ev.adId);
        if (!ev.creative) return prev;
        return [...prev.filter((a) => a.id !== ev.adId), ev.creative]; // upsert by id
      });
      firedRef.current.delete(ev.adId);
    },
    [queryClient, channelId],
  );

  // Subscribe to the channel topic (mid-roll delivery + in-channel presence).
  useEffect(() => {
    const sub = subscribe(STOMP_DEST.channelTopic(channelId), (msg) => {
      try {
        applyMidroll(JSON.parse(msg.body) as MidrollEvent);
      } catch {
        // Ignore malformed frames.
      }
    });
    return () => {
      sub?.unsubscribe();
      firedRef.current.clear();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [channelId, applyMidroll]);

  // Watch segment — open on enter + every program switch (backend closes prev).
  useEffect(() => {
    publish(STOMP_DEST.watch, { channelId, programId, kind });
  }, [channelId, programId, kind]);

  // Watch end — only on leaving the channel (unmount). Disconnect ends it too.
  useEffect(() => {
    return () => {
      publish(STOMP_DEST.watchEnd, { channelId });
    };
  }, [channelId]);

  // Re-evaluate on foreground (timers throttled while backgrounded).
  useAppState({ onForeground: evaluate });

  const onAdComplete = useCallback(() => setDueAd(null), []);

  return { dueAd, onAdComplete };
}
```

- [ ] **Step 2: Export** from `src/hooks/index.ts`.
- [ ] **Step 3: Verify** — lint+tsc clean. (React-Compiler immutability: all `*Ref` mutation stays in
  callbacks, never in render.)

---

### Task 8: Wire the channel screen to merged ads + mid-roll (`src/app/(app)/channel/[id].tsx`)

**Files:**
- Modify: `src/app/(app)/channel/[id].tsx`

**Interfaces:**
- Consumes: `useAdsQuery` (Task 6), `useChannelRealtime` (Task 7). Existing: `numericChannelId`,
  `selectedProgramId`, `isLive`, `adPending`, `mediaPending`, `blockPlayer`, `decisionBlocked`, `AdOverlay`.

- [ ] **Step 1: Replace the channel-change `useAdQuery` with the merged query** (~lines 148-154):

```ts
import { useMemo } from 'react';
import { useAdsQuery } from '@/api/queries';
import { useChannelRealtime } from '@/hooks';
// ...
const { ads } = useAdsQuery(numericChannelId, { enabled: !Number.isNaN(numericChannelId) });
const channelAd = ads.find((a) => a.placement === 'CHANNEL_CHANGE') ?? null; // preroll (Ad ⊂ AdCreative)
const seedMidrolls = useMemo(() => ads.filter((a) => a.placement === 'MID_ROLL'), [ads]);

const { dueAd: midrollAd, onAdComplete: onMidrollComplete } = useChannelRealtime(
  numericChannelId,
  selectedProgramId ? Number(selectedProgramId) : null,
  isLive ? 'LIVE' : 'RECORDED',
  seedMidrolls,
);
```

`adPending` is unchanged: `const adPending = !!channelAd && !adDone;` (preroll gates the player exactly as
before — `channelAd` is now sourced from the merged array). The existing preroll `<AdOverlay creative={channelAd} … >`
JSX stays — `Ad` is assignable to `AdCreative`.

- [ ] **Step 2: Render the mid-roll overlay** next to the preroll overlay (~line 489). Gate so it never
  shows over a skeleton, the preroll, or a blocked player:

```tsx
{midrollAd && !adPending && !mediaPending && !blockPlayer && !decisionBlocked ? (
  <AdOverlay creative={midrollAd} onComplete={onMidrollComplete} testID="channel-midroll" />
) : null}
```

- [ ] **Step 3: Update the pull-to-refresh invalidation** — the old key was
  `['ad', 'CHANNEL_CHANGE', numericChannelId]`; change to `['ads', numericChannelId]`.
- [ ] **Step 4: Verify** — lint+tsc clean. Smoke:
  - enter channel → ONE `GET /ads?channelId=` → preroll shows, midrolls seeded; `/app/watch` + topic subscribe;
  - midroll due (seed `startTime` reached) → overlay fires; socket `UPDATE` (same id) re-times; `REMOVE` cancels;
  - switch programme → another `/app/watch`; leave → `/app/watch.end`.

---

### Task 9: App-open ad via the merged query (`src/app/(app)/_layout.tsx`)

**Files:**
- Modify: `src/app/(app)/_layout.tsx`

- [ ] **Step 1: Swap the launch-ad fetch** to the merged query (no channelId → APP_OPEN array):

```ts
import { useAdsQuery, useChannelsQuery, useMeQuery } from '@/api/queries';
// ...
const { isLoading: homeLoading } = useChannelsQuery('tv');
const { ads: appOpenAds } = useAdsQuery(undefined, { enabled: !homeLoading });
const launchAd = appOpenAds.find((a) => a.placement === 'APP_OPEN') ?? null;
```

Keep the existing `{launchAd && !launchAdDismissed && <AdOverlay creative={launchAd} … />}` JSX.

- [ ] **Step 2: Verify** — lint+tsc clean. Smoke: launch → ONE `GET /ads` → APP_OPEN ad shows.

---

### Task 10: Remove the old per-placement ad query + doc sync

**Files:**
- Modify: `src/api/queries/index.ts` (drop `useAdQuery` export if now unused)
- Possibly delete: `src/api/queries/useAdQuery.ts` (**only with user approval** — confirm no other caller)
- Modify: `.claude/rules/ARCHITECTURE.md`, `CLAUDE.md`, `docs/API.md`

- [ ] **Step 1: Confirm `useAdQuery` has no remaining callers** (`grep -r useAdQuery src`). If clean and the
  user approves, delete it; otherwise leave it.
- [ ] **Step 2: Doc sync** — add a "Real-time (STOMP)" section to `ARCHITECTURE.md` (presence / watch /
  mid-roll + four-concern scope + `/refresh`-decoupled note), update the ads description (merged array +
  `placement`), update `docs/API.md → Ads` to the merged `GET /ads` contract, and a one-line stack mention
  in `CLAUDE.md`. Point all at `docs/REALTIME_SOCKET.md`.
- [ ] **Step 3: Verify** — lint+tsc clean.

---

## Self-review notes

- **Spec coverage:** presence (Task 5) · in-channel (Task 7 subscribe) · watch time (Task 7 watch events) ·
  mid-roll add/update/remove (Task 7 seed + socket + Task 8 overlay) · merged ads array (Tasks 6/8/9).
- **`/refresh` + geo:** untouched (out of scope).
- **Type consistency:** `realtimeConnected` (slice↔client), `MidrollEvent`/`WatchKind` (events↔hook),
  `Ad`/`placement`/`startTime` (domain↔service↔hook↔screen), `dueAd`/`onAdComplete` (hook↔screen) match.
- **Fewer calls:** channel open = ONE `GET /ads?channelId=` (preroll + midroll seed) instead of two;
  app open = ONE `GET /ads`.
- **Preroll vs mid-roll:** preroll fires immediately and gates the player (`adPending`); mid-rolls arm
  timers and overlay during playback. Both render through the same `AdOverlay`.
- **iOS/TLS risk:** prod needs `wss://` (ATS). Dev on Android works over `ws://`.
