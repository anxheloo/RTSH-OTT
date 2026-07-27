# FE response — Mid-roll ads flow (re: `fe-midroll-ads-flow.md`)

Frontend findings + changes after reviewing your 2026-07-20 doc. Snapshot **2026-07-21**, branch `main`.
**Code wins over this doc.**

---

## 0. TL;DR

**The §5 "REQUIRED — schedule a future `startTime`" timer already existed on the client** — a chained
one-shot `setTimeout` armed to the next future `startTime` (`src/realtime/midroll.ts` →
`nextMidrollBoundaryMs`, consumed by `src/hooks/useChannelRealtime.ts`), with unit tests. It was built
2026-06-29 and hardened 2026-07-06, so the "band opens later today → nothing happens" row of your table was
not caused by a missing timer.

The actual client-side defect was an **extra eligibility guard your contract doesn't have**: we refused any
ad whose `startTime` predated the moment the viewer entered the channel ("session-window guard"). Your
contract is *"`startTime` ≤ now → play now"*, and you rely on it — an active band's `startTime` is clamped
to "now" on the REST path. Under clock skew (device clock ahead of server) or any ordering race, the clamped
instant could land *before* our session anchor and the ad was **silently dropped forever**. That produces
exactly the "nothing happens" symptom, and it can hit the WS path hardest (an `ADD` pushed for an
already-open band).

Fixed 2026-07-21 — client now matches your §3 table exactly. Three changes, all client-side; **nothing is
needed from the backend** except the two confirmations in §3 below.

## 1. What changed on the client (2026-07-21)

1. **Open-window due rule** (`src/realtime/midroll.ts`). A mid-roll is due when `startTime` is null or
   `≤ now` AND its viewing window is open (`validUntil` in the future; ads without a usable `validUntil`
   fall back to a fixed 5-minute staleness window measured from `startTime`). The old additional condition
   ("`startTime` must be after channel entry") is gone. Replay protection ("don't show the same ad twice")
   is an id set that survives channel re-entry within an app session — not a time comparison.
2. **WS creatives are now schema-validated** (`useChannelRealtime.applyMidroll`). A pushed `creative` goes
   through the **same Zod schema as the REST seed**; a malformed one is dropped (loudly in dev builds). We
   also coerce `adId`/`channelId` to numbers before matching. Consequence for you: if the WS `AdDTO`
   serialization ever diverges from the REST one, the ad will be **dropped, not mis-scheduled** — see §3.
3. **REST re-seed on app foreground** (your §6 recommendation). We already re-seeded `GET /ads?channelId=`
   on STOMP reconnect; we now also re-seed on every return-to-foreground, covering pushes that raced a
   brief background/network blip too short to drop the socket. This also picks up the next day's band
   occurrence on resume.

## 2. Current client behavior per your §0 table

| Case | `startTime` sent | App now |
|---|---|---|
| No band | `null` | ✅ plays immediately (never lapses) |
| Band active now | `now` (clamped) | ✅ plays immediately — skew-immune (any `≤ now` inside an open window is due) |
| Band opens later today | future instant | ✅ boundary timer fires it at `startTime` (+250ms); survives foreground/reconnect via re-seed |
| Band elapsed today | *(absent / REMOVE)* | ✅ absent from seed; a pending/on-screen ad is cancelled on `REMOVE` |

Also confirmed implemented, per your §5 checklist: `validUntil` honored (authoritative window; 5-min
staleness fallback when unusable); `REMOVE` reads the id from the top-level `adId` (creative is null) and
cancels a pending or on-screen ad; all scheduling is cancelled on channel change/leave/teardown and is
disabled entirely for catch-up/recorded playback (an absolute-time break is meaningless off the live edge).

## 3. Two confirmations we need from you

1. **Is the `AdSlots.midrollWindow` clamp applied identically on the WS `ADD`/`UPDATE` path?** Your §3 says
   the rule is "applied identically on the REST and WS paths" — please confirm it's true for the clamp
   specifically (an `ADD` for an already-open band should carry `startTime = now`, not the raw band start).
   After our fix we're resilient either way, but the contract should state it.
2. **Is the WS `creative` serialized byte-identical to the REST `AdDTO`?** (Field names, ISO-8601 instant
   strings for `startTime`/`validUntil`, numeric `id`/`adId`, `placement` present.) We now validate pushed
   creatives against the REST schema and **drop non-conforming ones** — a silent scheduling corruption is
   worse than a dropped ad. If Jackson config differs between the REST controller and the STOMP broker
   (e.g. `WRITE_DATES_AS_TIMESTAMPS`), pushed ads will be rejected client-side.

## 4. Joint verification (your §8)

We'll run your §8 scenario (band ~2 min out on a watched channel) plus this matrix on a physical device —
please watch for the `[realtime] midroll ADD …` log lines on your side during the session:

| # | Scenario | Path exercised |
|---|---|---|
| a | Ad created **before** channel open, future band | REST seed → boundary timer |
| b | Ad pushed **while watching**, future band | WS `ADD` → boundary timer |
| c | Ad pushed mid-band (window already open) | WS `ADD` + clamp (§3 confirmation 1) |
| d | App backgrounded across the band start, foregrounded inside the window | foreground re-seed + staleness/`validUntil` |
| e | `REMOVE` while pending and while on-screen | cancel + dismiss |

Impressions (`POST /ads/{id}/impression` with `watchedSeconds`/`durationSeconds`/`clientEventId`) are
unchanged and fire once per shown ad at completion.

---

Related: `docs/REALTIME_SOCKET.md` (FE contract mirror) · your `fe-midroll-ads-flow.md` §1aj/§1af handover.
