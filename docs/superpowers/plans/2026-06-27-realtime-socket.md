# Real-time Socket Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Socket.IO real-time layer so the admin panel can geoblock a channel and schedule/update/delete midroll ads live for viewers currently inside that channel.

**Architecture:** A typed module-singleton socket service (`src/realtime/`) connects on authenticated app entry with handshake-based JWT auth. The server scopes pushes to per-channel rooms; the client joins/leaves a room when the channel screen mounts/unmounts. Geo events invalidate the existing playback decision query (reusing the existing `decision !== 'ALLOWED'` gate). Midroll events flow into a runtime Zustand slice that a per-channel hook drains into a background-safe single-timer scheduler, rendering the existing `AdOverlay`.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19, TypeScript strict, `socket.io-client` (new), Zustand, TanStack Query v5.

## Global Constraints

- **TypeScript strict, no `any`.** Socket is typed via `Socket<ServerToClientEvents, ClientToServerEvents>`.
- **No test runner exists.** Per-task verification = `npm run lint` (`expo lint`) + `npx tsc --noEmit`, plus the manual smoke check each task names. Both must be clean before commit (project gate).
- **No deep relative imports** — use `@/` aliases.
- **Imperative store/query access outside React** via `useAppStore.getState()` / the exported `queryClient` (established pattern).
- **Runtime-only state is never added to `partialize`** in `useAppStore.ts`.
- **Doc-sync is mandatory** — cross-cutting flow changes update `rules/ARCHITECTURE.md` + `CLAUDE.md` in the same change (final task).
- **Commit style:** Conventional Commits, scope `realtime`. **No `Co-Authored-By` / AI-attribution footer** (user rule).
- **Socket base URL** = `API_BASE_URL` with the trailing `/api/v1` stripped. **Auth** = handshake `auth` *function* form (freshest token per reconnect). **Connection scope** = authenticated app only.

---

### Task 1: Event contract + socket base URL + dependency

**Files:**
- Modify: `package.json` (add `socket.io-client`)
- Create: `src/realtime/events.ts`
- Modify: `src/api/client.ts` (export `WS_BASE_URL`)

**Interfaces:**
- Produces: `WS_BASE_URL: string`; `SOCKET_EVENTS` const; types `ScheduledMidroll`, `GeoEventPayload`, `ChannelRoomPayload`, `AdDeletedPayload`, `ServerToClientEvents`, `ClientToServerEvents`.

- [ ] **Step 1: Install the client**

Run: `npx expo install socket.io-client`
Expected: `socket.io-client` added to `dependencies` in `package.json`. (`expo install` picks an SDK-56-compatible version.)

- [ ] **Step 2: Export the socket base URL from the API client**

In `src/api/client.ts`, immediately after the `API_BASE_URL` declaration (line 55), add:

```ts
/**
 * Socket.IO origin — the API base with the REST version prefix stripped.
 * REST lives at `${API_BASE_URL}` (…/api/v1); the socket server listens at the
 * bare origin (path defaults to `/socket.io`).
 */
export const WS_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
```

- [ ] **Step 3: Write the event contract**

Create `src/realtime/events.ts`:

```ts
/**
 * Real-time socket event contract (Socket.IO).
 *
 * Single source of truth for event names + payload shapes, shared by the
 * socket service and (1:1) the backend doc `docs/REALTIME_SOCKET.md`.
 *
 * Targeting: the server scopes every S→C event to a per-channel room
 * (`channel:{id}`); geo events are additionally filtered by the socket's
 * country (resolved from the handshake IP). The client receives an event only
 * while it is inside the relevant channel.
 */

import type { AdCreative } from '@/types/domain';

export const SOCKET_EVENTS = {
  // Client → Server
  CHANNEL_ENTER: 'channel:enter',
  CHANNEL_LEAVE: 'channel:leave',
  // Server → Client
  GEO_BLOCKED: 'geo:blocked',
  GEO_UNBLOCKED: 'geo:unblocked',
  AD_SCHEDULED: 'ad:scheduled',
  AD_UPDATED: 'ad:updated',
  AD_DELETED: 'ad:deleted',
} as const;

/** A midroll ad plus its scheduling, from REST seed and socket pushes alike. */
export interface ScheduledMidroll {
  adId: number;
  channelId: number;
  creative: AdCreative;
  /** Delay from receipt in seconds; 0 = play now. */
  playInSeconds: number;
  /** ISO; if the deadline passes while backgrounded beyond this, drop the ad. */
  validUntil?: string;
}

export interface ChannelRoomPayload {
  channelId: number;
}

export interface GeoEventPayload {
  channelId: number;
  /** Optional server copy; the client still re-fetches the decision for truth. */
  message?: string;
}

export interface AdDeletedPayload {
  adId: number;
  channelId: number;
}

/** Server → Client event map (typed `socket.on`). */
export interface ServerToClientEvents {
  [SOCKET_EVENTS.GEO_BLOCKED]: (payload: GeoEventPayload) => void;
  [SOCKET_EVENTS.GEO_UNBLOCKED]: (payload: GeoEventPayload) => void;
  [SOCKET_EVENTS.AD_SCHEDULED]: (payload: { ad: ScheduledMidroll }) => void;
  [SOCKET_EVENTS.AD_UPDATED]: (payload: { ad: ScheduledMidroll }) => void;
  [SOCKET_EVENTS.AD_DELETED]: (payload: AdDeletedPayload) => void;
}

/** Client → Server event map (typed `socket.emit`). */
export interface ClientToServerEvents {
  [SOCKET_EVENTS.CHANNEL_ENTER]: (payload: ChannelRoomPayload) => void;
  [SOCKET_EVENTS.CHANNEL_LEAVE]: (payload: ChannelRoomPayload) => void;
}
```

- [ ] **Step 4: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean (no errors). The new file has no consumers yet — this proves the contract compiles.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/realtime/events.ts src/api/client.ts
git commit -m "feat(realtime): add socket.io-client dep, WS base URL, typed event contract"
```

---

### Task 2: Realtime store slice

**Files:**
- Create: `src/store/createRealtimeSlice.ts`
- Modify: `src/store/useAppStore.ts` (compose; NOT persisted)

**Interfaces:**
- Consumes: `ScheduledMidroll` (Task 1).
- Produces: `RealtimeSlice` with `socketConnected: boolean`, `scheduledMidrolls: Record<number, StoredMidroll>`, and actions `setSocketConnected`, `upsertMidroll`, `removeMidroll`, `clearMidrolls`. Exports `StoredMidroll = ScheduledMidroll & { dueAt: number }`.

- [ ] **Step 1: Write the slice**

Create `src/store/createRealtimeSlice.ts`:

```ts
import { StateCreator } from 'zustand';

import type { ScheduledMidroll } from '@/realtime/events';

import type { AppStore } from './useAppStore';

/** A scheduled midroll with its absolute fire time resolved on receipt. */
export type StoredMidroll = ScheduledMidroll & { dueAt: number };

export interface RealtimeSlice {
  socketConnected: boolean;
  /** Pending midrolls for the active channel, keyed by adId. Runtime only. */
  scheduledMidrolls: Record<number, StoredMidroll>;

  setSocketConnected: (connected: boolean) => void;
  /** Insert or replace a scheduled midroll; resolves dueAt from playInSeconds. */
  upsertMidroll: (ad: ScheduledMidroll) => void;
  removeMidroll: (adId: number) => void;
  clearMidrolls: () => void;
}

export const createRealtimeSlice: StateCreator<AppStore, [], [], RealtimeSlice> = (set) => ({
  socketConnected: false,
  scheduledMidrolls: {},

  setSocketConnected: (connected) => set({ socketConnected: connected }),

  upsertMidroll: (ad) =>
    set((s) => ({
      scheduledMidrolls: {
        ...s.scheduledMidrolls,
        [ad.adId]: { ...ad, dueAt: Date.now() + ad.playInSeconds * 1000 },
      },
    })),

  removeMidroll: (adId) =>
    set((s) => {
      if (!(adId in s.scheduledMidrolls)) return s;
      const next = { ...s.scheduledMidrolls };
      delete next[adId];
      return { scheduledMidrolls: next };
    }),

  clearMidrolls: () => set({ scheduledMidrolls: {} }),
});
```

- [ ] **Step 2: Compose into the store (not persisted)**

In `src/store/useAppStore.ts`:

1. Add to the `AppStore` type union: `& RealtimeSlice`.
2. Import: `import { createRealtimeSlice, type RealtimeSlice } from './createRealtimeSlice';`
3. Add `...createRealtimeSlice(...a),` to the slice spread (next to `createNetworkSlice`).
4. **Do NOT** add any realtime field to `partialize` — these are runtime-only.

- [ ] **Step 3: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. `useAppStore` now exposes the realtime fields/actions.

- [ ] **Step 4: Commit**

```bash
git add src/store/createRealtimeSlice.ts src/store/useAppStore.ts
git commit -m "feat(realtime): add runtime RealtimeSlice (connection + midroll inbox)"
```

---

### Task 3: Midroll schedule service (REST seed)

**Files:**
- Modify: `src/api/endpoints.ts` (no new route — `ADS_ROUTES.AD` already exists; confirm `MID_ROLL` is in `AdPlacement`)
- Modify: `src/api/services/ads.ts` (add `getMidrollSchedule`)
- Create: `src/api/queries/useMidrollScheduleQuery.ts`
- Modify: `src/api/queries/index.ts` (export the hook) *(only if a queries barrel exists; otherwise skip)*

**Interfaces:**
- Consumes: `ScheduledMidroll` (Task 1), `ADS_ROUTES` (existing).
- Produces: `getMidrollSchedule(channelId: number): Promise<ScheduledMidroll[]>`; `useMidrollScheduleQuery(channelId: number, opts?: { enabled?: boolean }): { schedule: ScheduledMidroll[] }`.

- [ ] **Step 1: Add the service call**

In `src/api/services/ads.ts`, add:

```ts
import type { ScheduledMidroll } from '@/realtime/events';

/**
 * Midroll ads scheduled for a channel right now (initial state on channel open).
 * Live changes thereafter arrive via the socket. Returns [] when none apply.
 */
export async function getMidrollSchedule(channelId: number): Promise<ScheduledMidroll[]> {
  const { data } = await apiClient.get<ScheduledMidroll[]>(ADS_ROUTES.AD, {
    params: { placement: 'MID_ROLL', channelId },
  });
  return data ?? [];
}
```

(Confirm `apiClient` + `ADS_ROUTES` are already imported in the file; reuse them.)

- [ ] **Step 2: Add the query hook**

Create `src/api/queries/useMidrollScheduleQuery.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { ScheduledMidroll } from '@/realtime/events';

import { getMidrollSchedule } from '../services/ads';

/**
 * Seeds the midroll scheduler on channel open. No caching — the schedule is
 * fetched fresh on each entry; live updates after that come over the socket.
 */
export const useMidrollScheduleQuery = (
  channelId: number,
  opts?: { enabled?: boolean },
): { schedule: ScheduledMidroll[] } => {
  const { data } = useQuery({
    queryKey: ['midroll-schedule', channelId],
    queryFn: () => getMidrollSchedule(channelId),
    enabled: (opts?.enabled ?? true) && !Number.isNaN(channelId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  });
  return { schedule: data ?? [] };
};
```

If `src/api/queries/index.ts` exists, add `export * from './useMidrollScheduleQuery';`.

- [ ] **Step 3: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/api/services/ads.ts src/api/queries/useMidrollScheduleQuery.ts src/api/queries/index.ts
git commit -m "feat(realtime): add midroll schedule REST seed (service + query)"
```

---

### Task 4: Typed socket service (singleton)

**Files:**
- Create: `src/realtime/socket.ts`
- Create: `src/realtime/index.ts`

**Interfaces:**
- Consumes: `WS_BASE_URL`, `queryClient` (`api/client.ts`); `SOCKET_EVENTS` + event maps (Task 1); store actions `setSocketConnected`/`upsertMidroll`/`removeMidroll` (Task 2).
- Produces: `connectRealtime(): void`, `disconnectRealtime(): void`, `enterChannel(channelId: number): void`, `leaveChannel(channelId: number): void`.

- [ ] **Step 1: Write the service**

Create `src/realtime/socket.ts`:

```ts
/**
 * Real-time socket service (Socket.IO, module singleton).
 *
 * - Connects on authenticated app entry; handshake auth sends the FRESHEST
 *   access token on every (re)connect via the `auth` function form.
 * - Server→client events are wired here to the store + queryClient (the
 *   "imperative access outside React" pattern). No React in this file.
 * - Geo events re-fetch the playback decision (single source of truth) rather
 *   than carrying their own UI state.
 */

import { io, type Socket } from 'socket.io-client';

import { WS_BASE_URL, queryClient } from '@/api/client';
import { useAppStore } from '@/store/useAppStore';

import {
  SOCKET_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './events';

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RealtimeSocket | null = null;

function wireHandlers(s: RealtimeSocket): void {
  const store = useAppStore.getState();

  s.on('connect', () => useAppStore.getState().setSocketConnected(true));
  s.on('disconnect', () => useAppStore.getState().setSocketConnected(false));

  // Geo — re-fetch the decision; the existing `decision !== 'ALLOWED'` gate in
  // the channel screen halts/resumes playback. Invalidate every variant
  // (live + recorded) for the channel.
  s.on(SOCKET_EVENTS.GEO_BLOCKED, ({ channelId }) => {
    void queryClient.invalidateQueries({ queryKey: ['channel-playback', String(channelId)] });
  });
  s.on(SOCKET_EVENTS.GEO_UNBLOCKED, ({ channelId }) => {
    void queryClient.invalidateQueries({ queryKey: ['channel-playback', String(channelId)] });
  });

  // Midroll — drain into the slice; the per-channel hook owns the timing.
  s.on(SOCKET_EVENTS.AD_SCHEDULED, ({ ad }) => useAppStore.getState().upsertMidroll(ad));
  s.on(SOCKET_EVENTS.AD_UPDATED, ({ ad }) => useAppStore.getState().upsertMidroll(ad));
  s.on(SOCKET_EVENTS.AD_DELETED, ({ adId }) => useAppStore.getState().removeMidroll(adId));

  void store; // (no-op: getState() is re-read per handler to avoid stale closures)
}

/** Connect if not already connected. Safe to call repeatedly. */
export function connectRealtime(): void {
  if (socket) return;

  socket = io(WS_BASE_URL, {
    transports: ['websocket'],
    // Function form → freshest token on every (re)connect, survives refresh.
    auth: (cb) => cb({ token: useAppStore.getState().token ?? '' }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  wireHandlers(socket);
}

/** Tear down on logout / app exit. */
export function disconnectRealtime(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  useAppStore.getState().setSocketConnected(false);
}

export function enterChannel(channelId: number): void {
  socket?.emit(SOCKET_EVENTS.CHANNEL_ENTER, { channelId });
}

export function leaveChannel(channelId: number): void {
  socket?.emit(SOCKET_EVENTS.CHANNEL_LEAVE, { channelId });
}
```

> Note on the geo query key: the channel screen uses `['channel-playback', channelId, programId]` where `channelId` is the **string** route param. `invalidateQueries` matches by key prefix, so `['channel-playback', String(channelId)]` invalidates both the live (`programId: null`) and any recorded variant for that channel.

- [ ] **Step 2: Write the barrel**

Create `src/realtime/index.ts`:

```ts
/**
 * Real-time socket layer. Import from '@/realtime'.
 */
export {
  connectRealtime,
  disconnectRealtime,
  enterChannel,
  leaveChannel,
} from './socket';
export { SOCKET_EVENTS } from './events';
export type { ScheduledMidroll } from './events';
```

- [ ] **Step 3: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. (If `queryClient` is not yet exported — it is, at `client.ts:149` — this would fail; it should pass.)

- [ ] **Step 4: Commit**

```bash
git add src/realtime/socket.ts src/realtime/index.ts
git commit -m "feat(realtime): typed socket singleton (connect, rooms, event wiring)"
```

---

### Task 5: Connection lifecycle hook

**Files:**
- Create: `src/hooks/useRealtimeConnection.ts`
- Modify: `src/hooks/index.ts` (export)
- Modify: `src/app/(app)/_layout.tsx` (mount once)

**Interfaces:**
- Consumes: `connectRealtime`/`disconnectRealtime` (Task 4); `useAppStore` token.
- Produces: `useRealtimeConnection(): void`.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useRealtimeConnection.ts`:

```ts
/**
 * Owns the real-time socket connection lifecycle for the authenticated app.
 * Connects when a token is present, disconnects on logout/unmount. Mount once
 * in (app)/_layout — the socket is authenticated-app scoped (no background
 * connection; geo/ads only matter while actively viewing).
 */

import { useEffect } from 'react';

import { connectRealtime, disconnectRealtime } from '@/realtime';
import { useAppStore } from '@/store/useAppStore';

export function useRealtimeConnection(): void {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    connectRealtime();
    return () => disconnectRealtime();
  }, [isAuthenticated]);
}
```

> Gate on `isAuthenticated` (not `token`) — the access token is null on cold boot until the first 401-refresh, but `(app)` only mounts when authenticated; the `auth` function reads the freshest token at connect/reconnect time, so a null-then-hydrated token is handled by socket.io's reconnect.

- [ ] **Step 2: Export from the hooks barrel**

In `src/hooks/index.ts`, add (alphabetical, near `useRefreshOnFocus`):

```ts
export * from './useRealtimeConnection';
```

- [ ] **Step 3: Mount in the authenticated layout**

In `src/app/(app)/_layout.tsx`, import and call the hook in the component body alongside the existing `useMeQuery()` / `useDeviceIdentity()` calls:

```ts
import { useRealtimeConnection } from '@/hooks';
// …inside the layout component body:
useRealtimeConnection();
```

- [ ] **Step 4: Verify lint + types + manual smoke**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.
Manual: `npm run start:dev`, log in, watch Metro logs — `socketConnected` flips true (add a temporary `console.log` in the `connect` handler if needed, then remove it; no `console.log` in committed code). Confirm it tears down on logout.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRealtimeConnection.ts src/hooks/index.ts "src/app/(app)/_layout.tsx"
git commit -m "feat(realtime): connect socket on authenticated entry"
```

---

### Task 6: Midroll scheduler hook (background-safe)

**Files:**
- Create: `src/hooks/useMidrollAds.ts`
- Modify: `src/hooks/index.ts` (export)

**Interfaces:**
- Consumes: `enterChannel`/`leaveChannel` (Task 4); `useMidrollScheduleQuery` (Task 3); slice `scheduledMidrolls`/`upsertMidroll`/`clearMidrolls` (Task 2); `useAppState` (existing); `AdCreative` type.
- Produces: `useMidrollAds(channelId: number): { dueAd: AdCreative | null; onAdComplete: () => void }`.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useMidrollAds.ts`:

```ts
/**
 * Per-channel midroll scheduler. Mounted by the channel screen.
 *
 * - On mount: join the channel room + seed the slice from the REST schedule.
 *   On unmount: leave the room + clear the slice.
 * - Arms ONE setTimeout to the soonest un-fired midroll's absolute `dueAt`
 *   (same single-timer discipline as useToday / useNowProgram).
 * - Re-evaluates on app foreground (useAppState): a deadline that passed while
 *   backgrounded fires immediately if still within `validUntil`, else is dropped.
 * - One-shot per adId (firedRef) so a later foreground can't replay it.
 * - Returns the due creative; the screen renders AdOverlay and calls
 *   onAdComplete when it finishes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { enterChannel, leaveChannel } from '@/realtime';
import { useMidrollScheduleQuery } from '@/api/queries/useMidrollScheduleQuery';
import { useAppStore } from '@/store/useAppStore';
import type { StoredMidroll } from '@/store/createRealtimeSlice';
import type { AdCreative } from '@/types/domain';

import { useAppState } from './useAppState';

export function useMidrollAds(channelId: number): {
  dueAd: AdCreative | null;
  onAdComplete: () => void;
} {
  const valid = !Number.isNaN(channelId);

  const upsertMidroll = useAppStore((s) => s.upsertMidroll);
  const clearMidrolls = useAppStore((s) => s.clearMidrolls);
  const scheduledMidrolls = useAppStore((s) => s.scheduledMidrolls);
  const removeMidroll = useAppStore((s) => s.removeMidroll);

  const { schedule } = useMidrollScheduleQuery(channelId, { enabled: valid });

  const firedRef = useRef<Set<number>>(new Set());
  const [dueAd, setDueAd] = useState<AdCreative | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const refresh = useCallback(() => setNowTs(Date.now()), []);

  // Room join/leave + reset per channel. Clears the inbox + fired set on exit.
  useEffect(() => {
    if (!valid) return;
    enterChannel(channelId);
    return () => {
      leaveChannel(channelId);
      clearMidrolls();
      firedRef.current = new Set();
      setDueAd(null);
    };
  }, [channelId, valid, clearMidrolls]);

  // Seed the slice from the REST schedule.
  useEffect(() => {
    schedule.forEach((ad) => upsertMidroll(ad));
  }, [schedule, upsertMidroll]);

  // Re-evaluate on foreground (RN throttles backgrounded timers).
  useAppState({ onForeground: refresh });

  // Midrolls for this channel that haven't fired yet, soonest first.
  const pending = useMemo(
    () =>
      Object.values(scheduledMidrolls)
        .filter((m) => m.channelId === channelId && !firedRef.current.has(m.adId))
        .sort((a, b) => a.dueAt - b.dueAt),
    // nowTs gates re-derivation on each foreground/timer tick.
    [scheduledMidrolls, channelId, nowTs],
  );

  // Fire the due one (or arm a timer to the next), dropping expired ones.
  useEffect(() => {
    if (dueAd) return; // an ad is already showing; wait for onAdComplete

    const fire = (m: StoredMidroll) => {
      firedRef.current.add(m.adId);
      setDueAd(m.creative);
    };

    for (const m of pending) {
      const expired = m.validUntil ? Date.parse(m.validUntil) <= nowTs : false;
      if (m.dueAt <= nowTs) {
        if (expired) {
          firedRef.current.add(m.adId);
          removeMidroll(m.adId);
          continue;
        }
        fire(m);
        return;
      }
      // First future, non-expired midroll → arm one timer to it.
      const id = setTimeout(refresh, m.dueAt - nowTs);
      return () => clearTimeout(id);
    }
  }, [pending, nowTs, dueAd, refresh, removeMidroll]);

  const onAdComplete = useCallback(() => setDueAd(null), []);

  return { dueAd, onAdComplete };
}
```

- [ ] **Step 2: Export from the hooks barrel**

In `src/hooks/index.ts`, add:

```ts
export * from './useMidrollAds';
```

- [ ] **Step 3: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. (Watch the `react-hooks/exhaustive-deps` lint — `nowTs` is intentionally in the `pending` memo deps to re-derive on tick; if the React Compiler/lint flags the `firedRef` read, keep it — the ref is stable.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMidrollAds.ts src/hooks/index.ts
git commit -m "feat(realtime): background-safe per-channel midroll scheduler hook"
```

---

### Task 7: Wire midroll ads into the channel screen

**Files:**
- Modify: `src/app/(app)/channel/[id].tsx`

**Interfaces:**
- Consumes: `useMidrollAds` (Task 6); existing `AdOverlay`, `numericChannelId`, `adPending`.

- [ ] **Step 1: Call the hook**

In `src/app/(app)/channel/[id].tsx`, after the channel-change ad block (around line 159, after `adPending`), add:

```ts
// Midroll ads — seeded from REST on entry, updated live over the socket.
// Suppressed while a channel-change ad is showing (one ad surface at a time).
const { dueAd: midrollAd, onAdComplete: onMidrollComplete } = useMidrollAds(numericChannelId);
```

Add the import to the existing `@/hooks` import group:

```ts
import { useMidrollAds } from '@/hooks';
```

- [ ] **Step 2: Render the midroll overlay**

Near the existing channel-change `AdOverlay` (around line 489), add a sibling overlay. The midroll only shows when no channel-change ad is pending and the player is actually up (not blocked/decision-gated):

```tsx
{midrollAd && !adPending && !blockPlayer && !decisionBlocked ? (
  <AdOverlay creative={midrollAd} onComplete={onMidrollComplete} testID="channel-midroll-ad" />
) : null}
```

> `decisionBlocked` is the existing `currentPlayback && currentPlayback.decision !== 'ALLOWED'` boolean already computed in this file (see the geo gate). Reuse it; do not recompute.

- [ ] **Step 3: Verify lint + types + manual smoke**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.
Manual (after Task 8's dev injector, or against a real backend): enter a channel; a midroll with `playInSeconds: 5` shows `AdOverlay` after 5s; background the app before 5s and return after — it fires on foreground; `ad:deleted` before it fires cancels it; leaving the channel clears it.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/channel/[id].tsx"
git commit -m "feat(realtime): render socket-driven midroll ads in the channel screen"
```

---

### Task 8: Dev event injector + mock + doc sync

**Files:**
- Create: `src/realtime/devInject.ts` (dev-only helper to simulate server events without the backend)
- Modify: `src/api/mocks/handlers.ts` (add `GET /ads?placement=MID_ROLL` mock) *(only if `EXPO_PUBLIC_API_MODE=mock` is used in dev)*
- Modify: `.claude/rules/ARCHITECTURE.md` (new section)
- Modify: `.claude/CLAUDE.md` (networking + feature notes)

**Interfaces:**
- Consumes: store actions (Task 2), `queryClient` (geo). Dev-only; never imported by production code paths.

- [ ] **Step 1: Dev injector (test without the backend)**

Create `src/realtime/devInject.ts`:

```ts
/**
 * DEV-ONLY helpers to simulate server→client socket events without a backend,
 * by writing the same store/query effects the real handlers do. Call from a
 * dev console / temporary button. Never import from production code.
 *
 * Example:
 *   import { devScheduleMidroll, devDeleteMidroll, devGeoBlock } from '@/realtime/devInject';
 *   devScheduleMidroll(42, 5); // ad 42 on channel 42 in 5s
 */

import { queryClient } from '@/api/client';
import { useAppStore } from '@/store/useAppStore';
import type { AdCreative } from '@/types/domain';

const sampleCreative = (adId: number): AdCreative => ({
  id: adId,
  type: 'IMAGE',
  mediaUrl: 'https://picsum.photos/600/800',
  durationSeconds: 10,
  skippable: true,
  skipAfterSeconds: 3,
});

export function devScheduleMidroll(channelId: number, playInSeconds = 5, adId = 999): void {
  useAppStore.getState().upsertMidroll({ adId, channelId, creative: sampleCreative(adId), playInSeconds });
}

export function devDeleteMidroll(adId = 999): void {
  useAppStore.getState().removeMidroll(adId);
}

export function devGeoBlock(channelId: number): void {
  void queryClient.invalidateQueries({ queryKey: ['channel-playback', String(channelId)] });
}
```

- [ ] **Step 2: Mock the REST midroll seed (mock mode only)**

If the project's mock adapter is used (`EXPO_PUBLIC_API_MODE=mock`), in `src/api/mocks/handlers.ts` add a handler so `GET /ads?placement=MID_ROLL&channelId=…` returns `[]` (or a sample) instead of falling through. Follow the existing `{ method, test(url), respond(config) }` shape used by the other `/ads` handler. Return `[]` by default so the scheduler seeds empty and the socket/dev-injector drives it.

- [ ] **Step 3: Doc sync — ARCHITECTURE.md**

Add a new section `## Real-time socket (geoblock + midroll)` to `.claude/rules/ARCHITECTURE.md` covering: handshake auth (freshest-token function form), authenticated-app-only scope, per-channel rooms, the event contract table, geo = invalidate+refetch (reuses the decision gate), midroll = slice inbox + background-safe single-timer hook (reuses `useAppState`), presence (backend Redis on connect/disconnect), and known gaps (no background socket, no app-level heartbeat, backend must update geo state before emitting). Add a dated entry to the **Update log**.

- [ ] **Step 4: Doc sync — CLAUDE.md**

In `.claude/CLAUDE.md`: add `socket.io-client` to the stack list; under Networking, note the `src/realtime/` layer and `WS_BASE_URL`; add a "Real-time" bullet to the mandatory features list referencing `docs/REALTIME_SOCKET.md`.

- [ ] **Step 5: Verify lint + types**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/realtime/devInject.ts src/api/mocks/handlers.ts .claude/rules/ARCHITECTURE.md .claude/CLAUDE.md
git commit -m "feat(realtime): dev event injector, midroll mock, doc sync"
```

---

## Self-Review

**Spec coverage:**
- Handshake auth + presence → Task 4 (`auth` fn) + backend doc; presence is backend-side (documented Task 8).
- Per-channel rooms → Task 4 (`enterChannel`/`leaveChannel`) + Task 6 (mount/unmount).
- `geo:blocked`/`geo:unblocked` → Task 4 handlers (invalidate+refetch).
- `ad:scheduled`/`ad:updated`/`ad:deleted` → Task 4 handlers + Task 2 slice.
- Midroll timing (background-safe, drop-on-expiry, one-shot) → Task 6.
- REST seed on channel open → Task 3 + Task 6.
- Render via existing `AdOverlay` → Task 7.
- Connection scope (authenticated app only) → Task 5.
- Doc sync + backend contract → Task 8 + `docs/REALTIME_SOCKET.md` (separate deliverable).

**Placeholder scan:** No TBD/TODO; every code step is complete. Task 8 step 2/3/4 describe doc/mock edits in prose (acceptable — they're documentation/config, not algorithmic code).

**Type consistency:** `ScheduledMidroll` (events.ts) → `StoredMidroll = ScheduledMidroll & { dueAt }` (slice) used consistently in Task 6. `connectRealtime/disconnectRealtime/enterChannel/leaveChannel` names match across Tasks 4/5/6. Geo invalidation key `['channel-playback', String(channelId)]` matches the screen's `['channel-playback', channelId, programId]` prefix. `useMidrollAds` return `{ dueAd, onAdComplete }` matches Task 7 usage.

## Backend contract

A separate deliverable, `docs/REALTIME_SOCKET.md`, mirrors this contract 1:1 for the backend agent (handshake auth, country-from-IP, Redis presence, rooms, payloads, the "update geo state before emitting" invariant). Written alongside this plan.
