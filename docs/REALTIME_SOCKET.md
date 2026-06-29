# REALTIME_SOCKET.md — backend contract (STOMP over WebSocket)

**Audience:** the Java/Spring backend engineer building the real-time server for RTSH-OTT.
**Status:** proposed contract, aligned 1:1 with the mobile client (`src/realtime/`).
**Transport:** **STOMP over native WebSocket** (Spring `spring-websocket` + `spring-messaging`).
**Date:** 2026-06-29. **Supersedes** the earlier Socket.IO draft of this file.

**FE decision (2026-06-29), re: `REALTIME_GEO_ADS_OPTIONS.md`:**
- **Ads → Option A** (client-scheduled; client arms timers off `startTime`, **FE reports impressions**).
- **Geo → Option B** (backend-fired; server pushes `GEO_BLOCK`/`GEO_LIFT` at the boundary, FE just displays).

This document is the **source of truth** the mobile client is built against. Implement exactly these
destinations, payloads, and the connect/presence behavior. If you must change anything, change it
**here first** and tell the client engineer — both sides share this file verbatim.

---

## 0. Why STOMP (not Socket.IO)

Socket.IO has no official Java server; the only options are third-party Netty ports that run as a
**separate server on a second port** and don't reuse Spring Security / your interceptors. You already
run **STOMP over WebSocket** for admins (`StompAuthChannelInterceptor`, `StompLiveEventPublisher`).
Adding end-user events to that same machinery is incremental, in-process, and Spring-native. The client
uses [`@stomp/stompjs`](https://www.npmjs.com/package/@stomp/stompjs) over React Native's built-in
WebSocket. This contract reuses your existing CONNECT-frame JWT auth.

---

## 1. Scope — five concerns

The playback-session `/refresh` (signed-URL re-sign) remains **out of scope** here (handled separately).

| # | Concern | Mechanism (summary) |
|---|---|---|
| 1 | **Active users** (platform-wide presence) | connection lifecycle → Redis (no client message) |
| 2 | **Active users in `channel/{id}`** | STOMP subscription to `/topic/channel.{id}` → subscriber count |
| 3 | **Per-program watch time** | client `SEND /app/watch` (open/switch) + `/app/watch.end` (leave); backend timestamps + closes segments |
| 4 | **Mid-roll add / update / remove** (Ads = Option A) | merged `GET /ads` seed + `convertAndSend("/topic/channel.{id}", MidrollEvent)`; **FE reports impressions** (§6.1) |
| 5 | **Geo-block while watching** (Geo = Option B) | backend pushes `GEO_BLOCK`/`GEO_LIFT` to the **affected user's** session at the boundary (§6A) |

**Key principle — the socket carries live changes + watch events only.** Initial channel state still
comes from REST on channel open: the playback decision (`GET /channels/{id}`) and a **single merged ads
call** (`GET /ads?channelId={id}` → `Ad[]`, see §7) that returns the channel-change preroll **and** all
scheduled mid-rolls in one array. The socket only updates a viewer who is **already inside** the channel
(adds/updates/removes a mid-roll by `id`).

---

## 2. Connection & handshake

- **Endpoint:** register a STOMP endpoint at **`/ws`** (raw WebSocket, **no SockJS** — the RN client
  uses the native `WebSocket`, SockJS is browser-fallback only). Same host/port as REST, **without** the
  `/api/v1` prefix:
  - REST  = `http://46.183.121.56:8089/api/v1`
  - STOMP = `ws://46.183.121.56:8089/ws`  (prod must be **`wss://`** — see §10).
- **Broker:** in-memory simple broker is fine for v1 (`enableSimpleBroker("/topic")`,
  `setApplicationDestinationPrefixes("/app")`). Swap to a Redis/RabbitMQ relay only when you scale past
  one node (your `WebSocketConfig` javadoc already notes this).

  ```java
  @Override public void registerStompEndpoints(StompEndpointRegistry r) {
    r.addEndpoint("/ws").setAllowedOriginPatterns("*"); // no .withSockJS()
  }
  @Override public void configureMessageBroker(MessageBrokerRegistry r) {
    r.enableSimpleBroker("/topic");
    r.setApplicationDestinationPrefixes("/app");
  }
  ```

- **Auth — JWT in the CONNECT frame.** The client sends `Authorization: Bearer <accessToken>` as a STOMP
  **connect header** on every (re)connect. **Reuse `StompAuthChannelInterceptor`** — validate the same
  way as admin, set the authenticated principal (`userId`) on the STOMP session. Reject the CONNECT if
  the token is missing/invalid.
  - The client refreshes its access token via the REST 401 flow and sends the **freshest** token on each
    reconnect (its `beforeConnect` reads the current token from the store). You do **not** need a
    token-refresh message.
  - If you choose to enforce access-token expiry on the live socket, close the session; the client will
    refresh and `@stomp/stompjs` auto-reconnects. Otherwise treat the session as valid until disconnect.
- **Heartbeats:** STOMP heartbeats are negotiated in the CONNECT/CONNECTED frames (client requests
  10s/10s). These detect a dead connection at the transport level — **this is your presence liveness
  signal; do not require an application-level heartbeat message.**

---

## 3. Concern 1 — Presence (active users)

A connected, authenticated STOMP session = one active user. Drive this off Spring's session events
(`@EventListener`), not any client message:

- **`SessionConnectedEvent`** → mark active:
  ```
  SADD presence:online {userId}
  SADD presence:sessions:{userId} {stompSessionId}     # multi-device
  ```
- **`SessionDisconnectEvent`** → remove + **close any open watch segment for that session** (§5):
  ```
  SREM presence:sessions:{userId} {stompSessionId}
  # if presence:sessions:{userId} now empty → SREM presence:online {userId}
  ```
- A user on phone + TV = two sessions, one `userId`. Key presence by `userId`; track session ids in the
  set for per-device granularity and correct offline-when-empty.
- Platform active-user count = `SCARD presence:online`. (Backend/admin metric — **not** pushed to the client.)

---

## 4. Concern 2 — Active users in a channel

The client **subscribes** to `/topic/channel.{channelId}` on channel enter and **unsubscribes** on
leave. This subscription serves **two** purposes: it's how mid-roll pushes reach the viewer (§6) **and**
it's the in-channel presence signal. Track it off subscribe/unsubscribe events:

- **`SessionSubscribeEvent`** where destination matches `^/topic/channel\.(\d+)$` →
  `SADD channel:viewers:{channelId} {stompSessionId}`
- **`SessionUnsubscribeEvent`** / **`SessionDisconnectEvent`** → `SREM channel:viewers:{channelId} {stompSessionId}`
- Viewers in a channel = `SCARD channel:viewers:{channelId}`.

(You may instead derive in-channel counts from the open watch segments in §5 — either works. Subscriber-
based is recommended since the subscription must exist anyway for delivery.)

---

## 5. Concern 3 — Per-program watch time

The client emits a **"now watching"** event whenever what it's watching changes, and an **end** event
when it leaves. The backend owns all timestamps and closes segments.

### Client → Server (SEND)

| Destination | Payload | Meaning |
|---|---|---|
| `/app/watch` | `{ "channelId": number, "programId": number \| null, "kind": "LIVE" \| "RECORDED" }` | "I am now watching this." Open a new segment. **If a segment is already open for this session, close it first** (this is the program-switch case). `programId` is `null` for live with no current programme. |
| `/app/watch.end` | `{ "channelId": number }` | "I stopped watching." Close the open segment. |

```java
@MessageMapping("/watch")
public void watch(@Payload WatchMsg m, Principal p) {
  watchService.openOrSwitch(p.getName(), m.channelId(), m.programId(), m.kind(), Instant.now());
}
@MessageMapping("/watch.end")
public void watchEnd(@Payload WatchEndMsg m, Principal p) {
  watchService.close(p.getName(), Instant.now());
}
```

### Segment model (server-side)

- Keep **one open segment per STOMP session**: `{ userId, channelId, programId, kind, openedAt }`
  (in-memory map or Redis hash keyed by session id).
- `/app/watch` → if an open segment exists, **close it** (`durationSec = now − openedAt`, persist/aggregate),
  then open a new one. This makes program-switch a single round-trip — the client does **not** send an
  explicit stop on switch.
- `/app/watch.end` and `SessionDisconnectEvent` → close the open segment, open nothing.
- **Never trust the client clock** — stamp `openedAt`/`closedAt` with server `Instant.now()`.
- **Per-program watch time = Σ closed-segment durations grouped by `programId`** (and/or `channelId`,
  `kind`). Aggregate however your analytics store prefers (row-per-segment, or incremented counters).

> The client previously had a REST analytics watch pair (`channel_watch_start/_end`) — it is **disabled**
> and is being **replaced** by these socket segments (connection-tied, so an app-kill still closes the
> segment via disconnect; a REST `end` can't fire on a kill).

---

## 6. Concern 4 — Mid-roll ads (server → client)

Admin schedules/changes/cancels a mid-roll on a channel → push **one event** to that channel's room.
A single op-tagged event covers all three mutations (per product decision).

### Shared payload

```ts
MidrollEvent = {
  op: 'ADD' | 'UPDATE' | 'REMOVE';
  adId: number;            // stable id; the key for UPDATE / REMOVE (matches Ad.id)
  channelId: number;
  creative?: Ad;           // REQUIRED for ADD/UPDATE; the full ad object (same shape
                           //   as a MID_ROLL element of the §7 array). Omit for REMOVE.
}
```

The `creative` is the **same `Ad` object** the merged array returns (§7) — including its `startTime`. The
client replaces/inserts the array entry by `id` and reschedules off `creative.startTime`.

### Emit (Spring)

```java
simpMessagingTemplate.convertAndSend("/topic/channel." + channelId,
    new MidrollEvent("ADD", ad.id(), channelId, ad));   // ad carries startTime
// UPDATE: same id, new ad (e.g. new mediaUrl or startTime).   REMOVE: { op:"REMOVE", adId, channelId }.
```

**Timing semantics:** the ad's **`startTime` is an absolute ISO-8601 instant** (see §7). The client fires
when wall-clock reaches `startTime` (so every viewer in the channel shows it at the same moment, regardless
of when they joined). `UPDATE` with a new `startTime` reschedules. Use `validUntil` for "pointless after T"
so a long background doesn't fire a stale ad.

| `op` | Required fields | Client action |
|---|---|---|
| `ADD` | `adId, channelId, creative` (with `startTime`) | insert into the array; arm a timer; show at `startTime` **if still in this channel** |
| `UPDATE` | `adId, channelId, creative` (new `startTime`/`mediaUrl`/…) | replace same `id` + reschedule |
| `REMOVE` | `adId, channelId` | drop from the array; clear that ad's pending timer |

### 6.1 Ad impressions — **FE reports** (Ads = Option A)

Because the client owns the timeline (it decides the moment an ad is actually shown), the **client reports
the impression** — preroll, app-open, and mid-roll alike. It fires **at completion** (skip / timer / video
end), not at mount, so it can carry the seconds actually watched:

```
POST /api/v1/ads/{id}/impression
  body (optional): { "watchedSeconds": 18, "durationSeconds": 20, "channelId": 7, "placement": "MID_ROLL" }
  → 204 No Content
```

- **Fire-and-forget** — the client never blocks on it and never shows an error if it fails (lossy-tolerant).
- Backend increments an aggregated Redis counter (flushed to a daily table); **no per-impression row**.
- Fired **once per ad shown** (the client de-dupes by ad `id` via an internal once-guard).
- **`watchedSeconds`** (wall-clock since the ad first painted, clamped to `durationSeconds`) + **`durationSeconds`**
  power the admin avg-view-rate tile (Σwatched / Σduration). Without them the impression still counts but
  avg-view-rate reads 0. `clientEventId` is **not** sent — the once-guard already de-dupes per ad.
- **Trade-off:** firing at completion (not mount) means an app force-killed mid-ad won't report. Rare, and
  acceptable; the alternative (fire at mount) loses watched-time entirely.

---

## 6A. Geo-block while watching — backend-fired (Geo = Option B)

Real-time geo for a viewer **already inside** a channel. (Join-time geo is unchanged: `GET /channels/{id}`
still returns `decision = GEO_BLOCKED` + `noticeMessage` if a block is already active when they open it —
both this section and that gate coexist.)

The backend owns the clock: at the block's start/end boundary it pushes a "now" event to the **affected
viewer's session** and the client just displays it. **No client geo timers, no look-ahead endpoint.**

### Targeting — user-scoped, NOT the channel topic

Geo affects only sessions whose resolved country is in the rule — a subset of the channel's viewers — so a
shared `/topic/channel.{id}` **cannot** target them. Send geo per-session with **`convertAndSendToUser`**:

```java
// affected sessions only (country resolved server-side from the connection IP)
simpMessagingTemplate.convertAndSendToUser(userId, "/queue/geo",
    new GeoEvent("GEO_BLOCK", channelId, noticeMessage));
```

The client subscribes once to its user queue: **`/user/queue/geo`**.

### Events (server → client, on `/user/queue/geo`)

```json
{ "type": "GEO_BLOCK", "channelId": 7, "noticeMessage": "Ky kanal nuk është i disponueshëm në rajonin tuaj." }
{ "type": "GEO_LIFT",  "channelId": 7 }
```

| Event | When | Client action |
|---|---|---|
| `GEO_BLOCK` | block becomes active for this viewer's country | if `channelId` == the channel being watched → **stop playback**, show `noticeMessage` (reuses the existing `decision`-blocked UI) |
| `GEO_LIFT` | block ends for this viewer's country | clear the block → resume/allow |

- `noticeMessage` is **already localized server-side** (the client displays it verbatim).
- The client ignores a `GEO_BLOCK`/`GEO_LIFT` whose `channelId` ≠ the channel it's currently on.
- Pair the `GEO_BLOCK` push with an origin/CDN session action if you want hard enforcement (server-side; the
  client prompt is just the UX half).

---

## 7. Merged ads endpoint (REST — CHANGE REQUIRED)

**Replace the two per-placement ad calls with ONE merged call per context** that returns an array of ad
objects, each tagged with its `placement`. This is the client's requested change — fewer round-trips
(one call on channel open instead of channel-change + mid-roll).

| Endpoint | Returns |
|---|---|
| `GET /ads?channelId={id}` | the channel's **one** `CHANNEL_CHANGE` preroll **+ all** `MID_ROLL`s, as `Ad[]` (`[]` when none) |
| `GET /ads` *(no channelId)* | the **one** `APP_OPEN` ad, as `Ad[]` |
| `GET /channels/{id}` | playback decision (exists, unchanged) |

### `Ad` shape (array element)

```ts
Ad = {
  id: number;                 // stable; the key for socket UPDATE / REMOVE
  placement: 'APP_OPEN' | 'CHANNEL_CHANGE' | 'MID_ROLL';  // ← NEW field, frozen casing
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  durationSeconds: number;    // how long the ad plays
  skippable: boolean;
  skipAfterSeconds: number;   // when the skip button arms

  // MID_ROLL ONLY:
  startTime?: string;         // ← REQUIRED on MID_ROLL: absolute ISO-8601 instant to fire
                              //   (e.g. "2026-06-28T18:30:00Z"). The admin's chosen time —
                              //   may be now, in 2 min, in 30 min, whatever. The client fires
                              //   when wall-clock reaches it. NOT a duration.
  validUntil?: string;        // optional ISO-8601: client drops the ad if this passes
                              //   while backgrounded (no late fire).
}
```

**Notes for the backend:**
- **`placement` casing is frozen** to `APP_OPEN` / `CHANNEL_CHANGE` / `MID_ROLL` (UPPERCASE) — the client
  enum already uses these. (The earlier `channel_open` / `midroll` proposal maps to these. If you prefer
  `CHANNEL_OPEN` / `MIDROLL`, tell the client engineer once so both sides rename together — but it must be
  ONE frozen set.)
- **`startTime` (absolute ISO-8601) on every `MID_ROLL` is non-negotiable.** It's *when* to fire, not how
  long it plays (`durationSeconds`). Absolute time — not a relative delay — so every viewer in the channel
  shows the ad at the same wall-clock moment regardless of when they joined.
- **`CHANNEL_CHANGE` + `APP_OPEN` fire immediately** — omit `startTime` (or set it to the current instant).
  The client treats a missing or `≤ now` `startTime` as "show immediately." Do **not** send the literal
  string `"now"` — use a real ISO timestamp or omit.
- A channel may have **several** mid-rolls → multiple `MID_ROLL` elements, each with its own `id` + `startTime`.
- **(Optional hardening — clock skew.)** Absolute `startTime` is compared against the device clock. Phones
  are usually NTP-synced so this is fine; if you want it bulletproof, include a top-level server `now`
  (ISO) in the response so the client can correct its offset. Not required for v1.

The array **seeds** the client scheduler on channel open; the socket `MidrollEvent` (§6) then
adds/updates/removes mid-rolls live, keyed by `id` (matching `Ad.id`).

---

## 8. End-to-end flows

**Watch-time across a program switch (single channel):**
1. User opens channel 7 (live) → client `SEND /app/watch {channelId:7, programId:1001, kind:"LIVE"}` → segment A opens.
2. User taps a past programme → client `SEND /app/watch {channelId:7, programId:1002, kind:"RECORDED"}` → backend closes A (duration), opens B.
3. User leaves → client `SEND /app/watch.end {channelId:7}` → backend closes B. (App-kill instead → `SessionDisconnectEvent` closes B.)

**Mid-roll while watching:**
1. Admin schedules ad 42 on channel 7 for 18:30 → `convertAndSend("/topic/channel.7", {op:"ADD",adId:42,channelId:7,creative:{…,startTime:"2026-06-28T18:30:00Z"}})`.
2. Client (subscribed to `/topic/channel.7`) inserts it into its array + arms a background-safe timer to `startTime`; fires only if still in channel 7.
3. Admin moves it to 18:35 → `{op:"UPDATE",adId:42,creative:{…,startTime:"2026-06-28T18:35:00Z"}}`. Cancels → `{op:"REMOVE",adId:42,channelId:7}`.

**Presence:** connect → `SADD presence:online`. Subscribe `/topic/channel.7` → `SADD channel:viewers:7`. Disconnect → both removed + open watch segment closed.

---

## 9. Invariants (do not violate)

1. **Reuse the existing CONNECT-frame JWT auth** (`StompAuthChannelInterceptor`); set `userId` as principal.
2. **Room-scoped emits only** — mid-roll events go to `/topic/channel.{id}`, never a global broadcast.
3. **Backend stamps all watch timestamps** — never trust the client clock.
4. **`/app/watch` closes the previous open segment before opening a new one** (program-switch = one event).
5. **`SessionDisconnectEvent` closes the open watch segment** (kill-safe) and clears presence.
6. **Mid-roll `startTime` is an absolute ISO-8601 instant** (admin's chosen time), not a relative delay.
7. **Destinations + payload keys are frozen by this doc** — edit here and coordinate before changing.

---

## 10. Open items to confirm with the client engineer

- **STOMP endpoint path** (`/ws` assumed) and whether a **broker prefix** other than `/topic` is wanted.
- **`wss://` / TLS for production.** iOS App Transport Security blocks cleartext `ws://`; the current
  REST host is `http://`. Dev can use `ws://` on Android; **production needs `wss://`** (same cert as the
  API host). Confirm the TLS termination plan.
- **Merged ads endpoint** (§7) — confirm you can return the merged `Ad[]` (preroll + mid-rolls) on
  `GET /ads?channelId={id}` and the `APP_OPEN` `Ad[]` on `GET /ads`, with the new `placement` field and an
  absolute ISO `startTime` on every `MID_ROLL`. This replaces the two per-placement calls.
- **🔴 Absolute mid-roll `startTime`** — your `REALTIME_GEO_ADS_OPTIONS.md` notes `Ad.startTime` is today a
  `LocalTime` daily band, not an absolute instant. We need an **absolute ISO instant** per mid-roll fire
  (add a field or derive from band+date). This **gates** precise mid-rolls.
- **Ad impressions** (§6.1) — confirm `POST /ads/{id}/impression` → 204 (FE-reported, Option A).
- **Geo = Option B** (§6A) — confirm geo is **backend-fired** via `convertAndSendToUser → /user/queue/geo`
  (`GEO_BLOCK`/`GEO_LIFT`), country resolved server-side. We do **NOT** need the `GET /channels/{id}/geoblocks`
  look-ahead endpoint (that was Option A).
- **Placement naming** — confirm you'll emit `APP_OPEN` / `CHANNEL_CHANGE` / `MID_ROLL` (or tell us once if
  you want `CHANNEL_OPEN` / `MIDROLL` so we rename on the client).
- **Token-expiry enforcement** on the live socket (close-on-expiry) vs valid-until-disconnect.
- **In-channel count source** — subscription set (§4) vs open watch segments (§5).
- **Watch-time storage** — row-per-segment vs incremented per-program counters (backend's call; client
  doesn't care).
- **Server-side mid-roll frequency cap** — if a per-user cap is wanted, enforce it before emitting
  (client shows whatever it receives).
