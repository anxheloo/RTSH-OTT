# Real-time layer — design spec (SUPERSEDED)

**Date:** 2026-06-27 → reworked 2026-06-28
**Status:** SUPERSEDED — the Socket.IO design below was replaced by a STOMP-over-WebSocket design.

## Why superseded

The original design picked **Socket.IO**. That's wrong for this backend:

- Socket.IO has **no official Java server** — only third-party Netty ports that run as a separate server
  on a second port and don't reuse Spring Security / interceptors.
- The backend is **Spring** and **already runs STOMP over WebSocket** for admins
  (`StompAuthChannelInterceptor`, `StompLiveEventPublisher`).
- The four concerns are **bidirectional** (client→server watch events + server→client mid-roll pushes),
  which rules out SSE (server→client only).

→ **Transport = STOMP over WebSocket** (`@stomp/stompjs` client ↔ native Spring STOMP). Socket.IO+STOMP
cannot interoperate; both sides must speak STOMP.

## Current design lives in

- **Backend contract:** `docs/REALTIME_SOCKET.md` (STOMP destinations, payloads, presence/Redis, watch
  segments, mid-roll events, invariants).
- **Client plan:** `docs/superpowers/plans/2026-06-28-realtime-stomp.md` (task-by-task with code).

## Scope change (2026-06-28)

Narrowed to **four concerns**: presence (active users), in-channel presence, per-program watch time, and
mid-roll add/update/remove. **Geo-blocking and the playback `/refresh` re-sign are out of scope** and
handled separately (geo: the next REST `decision` already gates; `/refresh`: its own session flow).

The watch-time model is the **segment** model: client emits `/app/watch` on channel enter and on each
program switch (backend closes the previous segment and opens a new one), and `/app/watch.end` on leave;
disconnect/app-kill closes the open segment server-side. This replaces the disabled REST analytics
`channel_watch_start/_end` pair.
