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

**Pending backend addition (agreed 2026-06-15):** `parentalPin: { enabled: boolean, pin: string | null } | null` on `UserDTO` — returned by `/auth/login`, `/auth/register/verify`, and `GET /users/me`. The parental gate reads it directly (`userDtoSchema` accepts it as `nullish`). It's content gating, not a credential, so the PIN is carried in cleartext over TLS and persisted client-side — see `rules/ARCHITECTURE.md → Parental control`.

### `GET /users/me` / `PATCH /users/me`

Both return a **bare `UserDTO`** (no `{ user }` envelope). `PATCH` accepts `UpdateProfileRequestDTO`: `{ username?, city?, country?, gender?, educationLevel? }` — `email`/`birthDate` are not modifiable. **Profile edits are not wired in v1** (decision 2026-06-15); `PATCH` exists in the service but no screen calls it yet.

**Cross-device profile sync (2026-06-15).** `GET /users/me` is the sync channel: `useMeQuery` (mounted once at root) refetches it on **app foreground**, **reconnect**, and a **5-min active-only poll**, mirroring the result into the store. A parental change made on one device reaches the others without sockets. Deliberately NOT bolted onto access-token refresh (the 401 interceptor runs on a hot path; a profile GET there would be wasteful). True real-time enforcement during playback belongs server-side (playback decision / heartbeat), not this advisory client sync.

### `POST /users/me/change-password`

Request `ChangePasswordRequestDTO`: `{ oldPassword, newPassword, logoutOtherDevices? }` (default `false`). Returns **fresh `{ accessToken, refreshToken }`** — this endpoint **ROTATES the refresh token** (unlike `/auth/refresh`), so the client rewrites the keychain copy + in-memory access token (`useChangePasswordMutation`). `logoutOtherDevices: true` also revokes the account's other sessions in the same call — so there is **no separate `logout-others` endpoint**. Errors carry stable `code`s (`auth.invalid_old_password`, `auth.password_unchanged`) mapped to copy via `authErrorMessage(err, _, codeMap)`.

### Parental control (`/api/v1/parental`)

The PIN is content gating, not a credential — it rides on `user.parentalPin = { enabled, pin }`, so **verification is a local compare** and toggles send **no `currentPin`** (re-entry is checked client-side before the call). `GET /parental` and `POST /parental/verify-pin` exist server-side but the client never calls them (it reads `user.parentalPin` and re-syncs via `GET /users/me`). Both write endpoints return **`204`**; the client mirrors the new state onto `user.parentalPin`.

| Endpoint | Request | Response | Notes |
|---|---|---|---|
| `POST /parental` | `{ enabled: true, pin }` (4–6 digits) | `204` | First-time setup. `maxAllowedAge?` accepted but unused (age-rating gating is a playback-phase concern). Client mirrors `{ enabled: true, pin }` locally |
| `PATCH /parental` | `{ enabled }` (and later `{ enabled, newPin }` for change-PIN) | `204` | Enable/disable toggle. **No `currentPin`** — disable verifies the PIN locally first. Mirrors `enabled` locally |
| `GET /parental` | — | `{ enabled, pinSet, maxAllowedAge }` | **Unused** — client reads `user.parentalPin`; cross-device freshness via `GET /users/me` |
| `POST /parental/verify-pin` | `{ pin }` | 200 = correct | **Unused** — verification is a local compare against `user.parentalPin.pin` |

Forgot-PIN reset has no endpoint yet (deferred; email-OTP or account-password flow TBD). `POST /auth/logout` also takes `{ refreshToken, logoutOtherDevices? }` (default `false`).

## Request headers (every API call)

Set by the client on the shared axios instance (`src/api/client.ts` + `useDeviceIdentity`):

| Header | Value | Purpose | Notes |
|---|---|---|---|
| `X-Device-Id` | UUIDv4 | Concurrency limits, session tracking, analytics correlation | App-generated, keychain-persisted. Stable per install; on iOS survives reinstall. Treat as **optional metadata, not auth** — a request fired in the first ~ms of boot may omit it |
| `X-Device-Platform` | `ios \| android \| androidtv \| androidstb \| tizen \| webos` | Manifest / ABR-ladder selection | This app sends `ios`, `android`, `androidtv` (runtime-detected) and `androidstb` (build-time flag). `tizen`/`webos` come from the separate web apps |
| `X-App-Version` | semver string | Force-update (426) comparison | **Native binary version** (`CFBundleShortVersionString` / `versionName`), not the OTA bundle version |
| `Authorization` | `Bearer <accessToken>` | Auth on protected calls | Omitted briefly on cold boot until the background refresh lands (client retries via 401-refresh) |
| `Accept-Language` | `sq` (default) \| `en` | Localized payloads | The **app** locale (user-switchable in settings), not the OS locale |

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

Authenticated. The client sends it **fire-and-forget whenever auth becomes ready**: on login success, on register completion, and on every cold boot with an existing session (covers app/OS updates refreshing `appVersion` / `operatingSystem`). PUT is an **idempotent upsert keyed on `(userId, deviceKey)`** — re-sends with identical data are expected and harmless.

The swagger also accepts an optional `device: DeviceInfoDTO` inside the login / register-verify bodies; **backend confirmed (2026-06-12) this PUT alone is enough** — the client never sends device info at session creation.

```jsonc
// Request body — bare DeviceInfoDTO, NO envelope
{
  "deviceKey": "3f1c…-uuid",       // SAME value as the X-Device-Id header
  "type": "PHONE_ANDROID",          // see enum below
  "model": "Pixel 8",               // expo-device modelName
  "operatingSystem": "Android 15",  // osName + osVersion
  "appVersion": "1.0.0"             // native binary version (= X-App-Version)
}
// 200 — empty body; ignored by the client
```

`type` enum (✅ confirmed from the OpenAPI `DeviceInfoDTO`, 2026-06-12):
`PHONE_IOS | PHONE_ANDROID | TABLET_IPADOS | TABLET_ANDROID | ANDROID_TV | STB_ANDROID | TIZEN_TV | WEBOS_TV` — this client never sends the TV-web values; with no `UNKNOWN`, an unrecognized form factor falls back to the platform's phone type.

- Failures are swallowed client-side (metadata, not auth) — don't gate any user flow on this call.
- **No device cap exists** (confirmed 2026-06-12): the PUT has no limit-error contract and `PlaybackDecisionDTO.decision` has no too-many-devices value — the registry is metadata ("manage my devices" / analytics), entitlement is package-based (`NOT_ENTITLED`).

## Out of band

- CDN segment / AES-key requests carry **no** app headers. Per-device or geo enforcement at the edge rides backend-issued **signed playback URLs** (see plan 15.2), not headers.
