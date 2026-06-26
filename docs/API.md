# API.md — Backend contract

Source of truth for `src/api/`. Seeded 2026-06-12 with the device-identity header spec; auth section reconciled 2026-06-12 against the live end-user OpenAPI spec (`/v3/api-docs/end-user`). All routes live under **`/api/v1`** — the prefix sits on the axios `baseURL` (`client.ts`), route constants stay bare.

## Authentication (`/auth/*`) — reconciled against swagger 2026-06-12

| Endpoint | Request | 200 response | Notes |
|---|---|---|---|
| `POST /auth/login` | `{ email, password }` | `{ accessToken, refreshToken, user: UserDTO }` | Swagger accepts an optional `device: DeviceInfoDTO` in the body; backend confirmed (2026-06-12) the client skips it — the separate `PUT /users/me/device` is enough |
| `POST /auth/refresh` | `{ refreshToken }` | `{ accessToken }` (+ ignored `tokenType`, `expiresInSeconds`) | **No rotation** — refresh token is static until expiry; response carries **no user** (boot recovery uses `GET /users/me`) |
| `POST /auth/logout` | `{ refreshToken, logoutOtherDevices? }` | empty | Revokes that session's refresh token (`logoutOtherDevices: true` → all sessions); client wipes local state regardless. Defaults `false` |
| `POST /auth/register` | `{ email, username, password, birthDate, city, country, gender, termsAccepted }` | `{ message }` | **Single-shot** — all profile data at once; saves a pending account + emails OTP. `birthDate`+`gender` required; gender/education are UPPERCASE enums; no `confirmPassword` (client-side check). Wire field is `termsAccepted: boolean` (client maps from its `acceptTerms` at the service boundary) |
| `POST /auth/register/verify` | `{ email, code }` | `{ accessToken, refreshToken, user: UserDTO }` | Activates the account → **auto-login** |
| `POST /auth/register/resend-otp` | `{ email }` | `{ message }` | Replaces any still-live code |
| `POST /auth/forgot-password` | `{ email }` | always `202` | Emails a one-time reset code. **No reset-resend endpoint** — re-call this (replaces the live code) |
| `POST /auth/reset-password/verify` | `{ email, code }` | `{ resetToken }` | One-time reset-session token |
| `POST /auth/reset-password` | `{ resetToken, newPassword }` | `{ message }` | Client then `router.replace`s to login. No `confirmPassword` (client-side check) |

### `UserDTO` (wire) → `User` (domain)

Wire shape: `{ id: int64, email, username, birthDate, city, country, gender: MALE|FEMALE|OTHER|UNSPECIFIED, educationLevel: HIGH|MEDIUM|LOW }`. `userDtoSchema` (`types/domain.ts`) validates + transforms in one parse: `id` → string, `displayName` ← `username`, `age` ← computed from `birthDate`, `location` ← `"city, country"`, enums lowercased.

**Parental PIN is not on `UserDTO` (changed 2026-06-16).** The gate is device-level / client-only — the PIN lives in `ParentalSlice` (MMKV), never on the user object or the wire. See `rules/ARCHITECTURE.md → Parental control`.

### `GET /users/me` / `PATCH /users/me`

Both return a **bare `UserDTO`** (no `{ user }` envelope). `PATCH` accepts `UpdateProfileRequestDTO`: `{ username?, city?, country?, gender?, educationLevel? }` — `email`/`birthDate` are not modifiable. **Profile edits are not wired in v1** (decision 2026-06-15); `PATCH` exists in the service but no screen calls it yet.

**Cross-device profile sync (2026-06-15).** `GET /users/me` is the sync channel: `useMeQuery` (mounted once at root) refetches it on **app foreground**, **reconnect**, and a **5-min active-only poll**, mirroring the result into the store, so a profile change made on one device reaches the others without sockets. Deliberately NOT bolted onto access-token refresh (the 401 interceptor runs on a hot path; a profile GET there would be wasteful). (Note: the parental PIN is device-level/client-only and is intentionally NOT part of this sync — see Parental control.)

### `POST /users/me/change-password`

Request `ChangePasswordRequestDTO`: `{ oldPassword, newPassword, logoutOtherDevices? }` (default `false`). Returns **fresh `{ accessToken, refreshToken }`** — this endpoint **ROTATES the refresh token** (unlike `/auth/refresh`), so the client rewrites the keychain copy + in-memory access token (`useChangePasswordMutation`). `logoutOtherDevices: true` also revokes the account's other sessions in the same call — so there is **no separate `logout-others` endpoint**. Errors carry stable `code`s (`auth.invalid_old_password`, `auth.password_unchanged`) mapped to copy via `authErrorMessage(err, _, codeMap)`.

### `DELETE /users/me` — permanent account deletion

No body — the access token (Authorization header) identifies the account. Returns **200** on success. The client (`deleteAccount` in `services/users.ts` → `useDeleteAccountMutation`) wipes the local session **only on 200** (`onSuccess`, not `onSettled`): `store.logout()` (remove keychain refresh token + clear auth) + `clearParentalConfig()` (deletion ALSO wipes the device parental gate, unlike logout) + `queryClient.clear()`. A failed delete keeps the user signed in and surfaces via the global `apiError` modal (no error-suppressing `meta`). No separate session/device cleanup call — the backend tears down the account's sessions on delete.

### Parental control — no API (device-level, client-only)

**Changed 2026-06-16.** Parental control has **no backend endpoints**. The PIN is content gating, not a credential, and is handled entirely on the client at the **device level**: it lives in `ParentalSlice` (`parentalEnabled` + `parentalPin`, MMKV-persisted), is set/verified by a local compare, and is never sent to or read from the server. There is no setup/toggle/verify endpoint and no cross-device sync (each device has its own PIN). The previously-specified `POST`/`PATCH`/`GET /parental` + `POST /parental/verify-pin` are removed. See `rules/ARCHITECTURE.md → Parental control`.

`POST /auth/logout` takes `{ refreshToken, logoutOtherDevices? }` (default `false`).

## Request headers (every API call)

Set by the client on the shared axios instance (`src/api/client.ts`):

| Header | Value | Purpose | Notes |
|---|---|---|---|
| `Authorization` | `Bearer <accessToken>` | Auth on protected calls | Omitted briefly on cold boot until the first 401-refresh lands (client retries) |
| `Accept-Language` | `sq` (default) \| `en` | Localized payloads | The **app** locale (user-switchable in settings), not the OS locale |

> **2026-06-23 — device headers removed (temporary, user decision).** `X-Device-Id` / `X-Device-Platform` / `X-App-Version` are **no longer sent**. Device info reaches the backend two ways only: the `PUT /users/me/device` registration body (once per session, on Home entry) and a **`deviceClass` query param** on the playback requests (see Channels). **Implication:** the **426 force-update gate can't compare version per-request** (no `X-App-Version`); `appVersion` still arrives in the registration body if a version check is wanted there. Reinstate the headers if per-request version/device correlation becomes a hard requirement.

## `426 Upgrade Required`

Returned by any endpoint when `X-App-Version` < the platform's minimum supported version. The client shows a blocking, non-dismissible update modal (store deep link). Semantics the backend must hold:

- Compare against the **native** version per platform. JS-only fixes ship via EAS Update, never via 426.
- Any response body is ignored by the client today; an optional `{ storeUrl }` could later override the default store link.

## `GET /app/version?platform=<DevicePlatform>`

Unauthenticated version gate (STBs check it on boot, possibly without a session).

```jsonc
// 200
{
  "platform": "androidstb",
  "latestVersion": "1.2.0",
  "minSupportedVersion": "1.0.0",
  "downloadUrl": "https://cdn.rtsh.al/apps/rtsh-tani-androidstb-1.2.0.apk" // sideloaded platforms only
}
// 400 — missing/unknown platform
{ "error": "platform is required" }
```

- Store builds (`ios`, `android`, `androidtv`) don't poll this — stores + 426 cover them.
- `androidstb` self-update: client compares `latestVersion`, downloads `downloadUrl`, installs (orchestration lands with the TV pass, plan 22.18).

## `PUT /users/me/device` — device registration (upsert)

Authenticated. The client sends it **fire-and-forget once on Home-screen entry** (`useDeviceIdentity` → `useRegisterDeviceMutation`, 2026-06-23) — by then the user is authenticated and in the app. PUT is an **idempotent upsert keyed on `(userId, deviceKey)`** — re-sends with identical data are expected and harmless (app/OS updates refresh `appVersion` / `operatingSystem` on the next entry). The mutation carries `meta: SILENT_ERROR`, so a failure never surfaces a modal — registration is metadata, not auth; don't gate any flow on it.

The swagger also accepts an optional `device: DeviceInfoDTO` inside the login / register-verify bodies; **backend confirmed (2026-06-12) this PUT alone is enough** — the client never sends device info at session creation.

```jsonc
// Request body — bare DeviceInfoDTO, NO envelope
{
  "deviceKey": "3f1c…-uuid",       // app-generated UUID, keychain-persisted (rtsh.device_id)
  "type": "PHONE_ANDROID",          // see enum below
  "model": "Pixel 8",               // expo-device modelName
  "operatingSystem": "Android 15",  // osName + osVersion
  "appVersion": "1.0.0"             // native binary version
}
// 200 — empty body; ignored by the client
```

`type` enum (✅ confirmed from the OpenAPI `DeviceInfoDTO`, 2026-06-12):
`PHONE_IOS | PHONE_ANDROID | TABLET_IPADOS | TABLET_ANDROID | ANDROID_TV | STB_ANDROID | TIZEN_TV | WEBOS_TV` — this client never sends the TV-web values; with no `UNKNOWN`, an unrecognized form factor falls back to the platform's phone type.

- Failures are swallowed client-side (metadata, not auth) — don't gate any user flow on this call.
- **No device cap exists** (confirmed 2026-06-12): the PUT has no limit-error contract and `PlaybackDecisionDTO.decision` has no too-many-devices value — the registry is metadata ("manage my devices" / analytics), entitlement is package-based (`NOT_ENTITLED`).

## Channels

### `GET /channels?type=TV|RADIO`

Returns a plain array of `EndUserChannelDTO` — channel metadata only (name, logo). No stream URLs. Geo-blocking is **not** a list flag — it's enforced by the CDN on channel open (`GET /channels/{id}`); a blocked request surfaces as a player error.

```jsonc
// 200 — array (not wrapped)
[
  {
    "id": 1,
    "name": "RTSH 1",
    "type": "TV",
    "sortOrder": 1,
    "logoUrl": "https://…",
    "imageUrl": "https://…"
  }
]
```

### `GET /channels/{id}?deviceClass=MOBILE|TV|STB` — PlaybackDecisionDTO

Returns the playback decision for a single channel. No channel metadata — name/logo come from the list cache.

**`deviceClass` query param** (required, 2026-06-23) — `MOBILE | TV | STB`, from `getDeviceClass()` (derived from the device form factor). The backend uses it to return a **platform-specific player URL** in `streams`. Sent per playback request (stateless) rather than read from the device registry — so a multi-device account and the fire-and-forget registration race are both non-issues. *(Param name unconfirmed with backend — see ARCHITECTURE → Device identity known gaps.)*

```jsonc
// 200
{
  "decision": "ALLOWED",        // loose string — exact union TBD with backend
  "channelId": 1,
  "programId": 9007199254740991, // currently-live program ID
  "noticeMessage": "string",    // optional human-readable notice
  "streams": {
    "master": "https://…",      // ABR multivariant playlist (use for `auto`)
    "720p":   "https://…",      // fixed-rendition child playlist
    "540p":   "https://…",
    "360p":   "https://…"
    // rendition keys are used verbatim as the QualityId — no fixed list
  },
  "sessionId": "string",                  // playback session identifier (2026-06-23)
  "expiresAt": "2026-06-23T08:03:14.952Z" // ISO-8601 — signed stream URLs expire at this instant
}
```

The client maps `streams` keys to `QualityId` **dynamically** via `resolveStreamSource` / `availableQualityIds` (`utils/resolveStreamSource.ts`): `master` → `auto`, and **every other key is used verbatim as its own `QualityId`** (the quality sheet lists them in backend order, labelled by the key itself). There is no fixed rendition table — keys the backend renames or adds flow through unchanged, so `QualityId` is `'auto' | (string & {})`. `expiresAt` drives the pre-expiry re-sign (`refetchInterval` at `expiresAt − 30s`); `sessionId` is replayed to `POST /channels/playback/refresh` to re-sign the session (see below).

### `POST /channels/playback/refresh` — re-sign an active session

Re-signs an **existing** playback session: returns a fresh `streams` URL + new `expiresAt` for the same `sessionId`, **without** re-running the full decision (no geo re-check, no new session). The geo / `decision` gate is evaluated **only** on the initial `GET /channels/{id}`.

```jsonc
// request
{ "sessionId": "string" }   // sessionId from the initial PlaybackDecisionDTO
// 200 — same PlaybackDecisionDTO shape as GET /channels/{id}
{
  "decision": "ALLOWED",
  "channelId": 1,
  "programId": 9007199254740991,
  "streams": { "master": "https://…" },
  "sessionId": "string",
  "expiresAt": "2026-06-25T13:57:39.180Z"
}
```

`useChannelPlaybackQuery` (`queries/useChannelsQuery.ts`) calls `getChannelById` / `getCatchupPlayback` on the **first** fetch (no cached `sessionId`), then routes every interval-driven re-fetch (armed at `expiresAt − 30s`, 5s floor, paused while backgrounded) through `refreshPlayback(sessionId)`. Returning to live invalidates the live key, clearing the cached session so the next play re-establishes one via the decision endpoint.

### `GET /channels/{id}/epg?date=YYYY-MM-DD`

Returns EPG items for the channel on the given date. Each item embeds the same `PlaybackDecisionDTO` fields so tapping a recorded programme swaps the player source without an extra network request.

```jsonc
// 200
{
  "items": [
    {
      // EPG metadata
      "id": "epg-1-2026-06-18-1",
      "channelId": "1",
      "channelName": "RTSH 1",
      "title": "Lajmet",
      "description": "…",
      "startTime": "2026-06-18T06:00:00.000Z",
      "endTime":   "2026-06-18T06:30:00.000Z",
      "isAdult": false,
      "isLive": true,
      "thumbnail": "https://…",
      // Playback data (same shape as PlaybackDecisionDTO)
      "decision": "ALLOWED",
      "programId": "epg-1-2026-06-18-1",
      "streams": { "master": "https://…", "720p": "https://…" }
    }
  ]
}
```

### `GET /channels/{channelId}/epg/{programId}?deviceClass=MOBILE|TV|STB` — recorded playback

Catch-up playback decision for a single recorded programme (`getCatchupPlayback`). Same `PlaybackDecisionDTO` shape as `GET /channels/{id}`, and the same **`deviceClass` query param** (2026-06-23) so the backend serves a platform-specific recorded-stream URL. Tapping a recorded EPG row that already embeds playback fields avoids this call; it's used when the row's playback data isn't present.

## Guide

### `GET /guide?type=TV|RADIO`

"Now" guide — one entry per channel/station with the **currently airing** programme (`now`). `type` mirrors the channels endpoint (`TV` or `RADIO`); the Guide tab's TV/Radio toggle drives it. No `next` is returned. Each row's progress bar is derived client-side from `now.start` / `now.end` vs the fetch time. Server-driven freshness: the client never times programme boundaries here — it refetches on tab focus, app foreground, reconnect, and pull-to-refresh (no polling). TV rows open `channel/{id}`, radio rows open `radio/{id}`.

```jsonc
// 200 — bare array (GuideChannelDto[])
[
  {
    "id": 1,                  // channel id (same as the channels endpoint)
    "name": "RTSH 1",         // channel name
    "logoUrl": "https://…",
    "imageUrl": "https://…",
    "now": {
      "id": 9007199254740991,
      "name": "Edicioni Qendror i Lajmeve",
      "description": "…",
      "start": "2026-06-22T17:00:00.000Z",
      "end":   "2026-06-22T17:30:00.000Z",
      "ageRating": "",
      "isAdult": false
    }
  }
]
```

The channel identity is `id` / `name` (not `channelId` / `channelName`). Mapped at the service boundary (`services/guide.ts`) to the domain `GuideChannel` (`id` int64 → `channelId` string, `name` → `channelName`, `now.name` → `now.title`). `now` may be `null` if nothing is airing.

## Analytics

### `POST /analytics/events` — telemetry ingestion (fire-and-forget)

> **Client proposal — confirm with the middleware team (they own ingestion).** Spec MW.14 / Mon.6.

Batched body (the client posts one event per call, but the shape is a batch so batching can be added without a contract change):

```jsonc
{
  "events": [
    {
      "event": "channel_watch_start",   // see event list below
      "ts": 1719400000000,               // client epoch ms
      "sessionId": "uuid-or-null",        // per foreground session; null for pre-auth app_open
      "props": { "channelId": "12", "kind": "live" },
      "device": {                          // == DeviceRegistration; NO PII
        "deviceKey": "uuid",
        "type": "PHONE_IOS",
        "model": "iPhone15,2",
        "operatingSystem": "iOS 18.0",
        "appVersion": "1.0.0"
      }
    }
  ]
}
```

**No PII in the body** (no email / token / displayName — enforced by the typed client payload). The backend stamps `userId` from the `Authorization` token (absent → anonymous, e.g. pre-auth `app_open`) and **country from the request IP** (no client geolocation permission). Response body is ignored; any 2xx is success. Fire-and-forget: the client swallows all failures and never retries (lossy-tolerant).

**Events** (`event` + `props`):
| `event` | `props` |
|---|---|
| `app_open` | `{}` |
| `session_start` | `{ sessionId }` |
| `session_end` | `{ sessionId, durationMs }` |
| `channel_watch_start` | `{ channelId, kind: 'live'\|'radio'\|'recorded' }` |
| `channel_watch_end` | `{ channelId, kind, watchDurationMs }` |
| `stream_error` | `{ channelId, errorType }` |
| `heartbeat` | `{ state: 'foreground'\|'watching', channelId? }` — every 5 min while foregrounded |

Opt-out: the client suppresses **all** events (incl. heartbeat) when the device's `analyticsEnabled` setting is off.

## Out of band

- CDN segment / AES-key requests carry **no** app headers. Per-device or geo enforcement at the edge rides backend-issued **signed playback URLs** (see plan 15.2), not headers.
