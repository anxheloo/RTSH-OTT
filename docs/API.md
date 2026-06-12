# API.md — Backend contract

Source of truth for `src/api/`. Seeded 2026-06-12 with the device-identity header spec; auth section reconciled 2026-06-12 against the live end-user OpenAPI spec (`/v3/api-docs/end-user`). All routes live under **`/api/v1`** — the prefix sits on the axios `baseURL` (`client.ts`), route constants stay bare.

## Authentication (`/auth/*`) — reconciled against swagger 2026-06-12

| Endpoint | Request | 200 response | Notes |
|---|---|---|---|
| `POST /auth/login` | `{ email, password }` | `{ accessToken, refreshToken, user: UserDTO }` | Swagger accepts an optional `device: DeviceInfoDTO` in the body; backend confirmed (2026-06-12) the client skips it — the separate `PUT /users/me/device` is enough |
| `POST /auth/refresh` | `{ refreshToken }` | `{ accessToken }` (+ ignored `tokenType`, `expiresInSeconds`) | **No rotation** — refresh token is static until expiry; response carries **no user** (boot recovery uses `GET /users/me`) |
| `POST /auth/logout` | `{ refreshToken }` | empty | Revokes that session's refresh token; client wipes local state regardless |
| `POST /auth/register` | `{ email, username, password, birthDate, city, country, gender, termsAccepted }` | `{ message }` | **Single-shot** — all profile data at once; saves a pending account + emails OTP. `birthDate`+`gender` required; gender/education are UPPERCASE enums; no `confirmPassword` (client-side check). Wire field is `termsAccepted: boolean` (client maps from its `acceptTerms` at the service boundary) |
| `POST /auth/register/verify` | `{ email, code }` | `{ accessToken, refreshToken, user: UserDTO }` | Activates the account → **auto-login** |
| `POST /auth/register/resend-otp` | `{ email }` | `{ message }` | Replaces any still-live code |
| `POST /auth/forgot-password` | `{ email }` | always `202` | Emails a one-time reset code. **No reset-resend endpoint** — re-call this (replaces the live code) |
| `POST /auth/reset-password/verify` | `{ email, code }` | `{ resetToken }` | One-time reset-session token |
| `POST /auth/reset-password` | `{ resetToken, newPassword }` | `{ message }` | Client then `router.replace`s to login. No `confirmPassword` (client-side check) |

### `UserDTO` (wire) → `User` (domain)

Wire shape: `{ id: int64, email, username, birthDate, city, country, gender: MALE|FEMALE|OTHER|UNSPECIFIED, educationLevel: HIGH|MEDIUM|LOW }`. `userDtoSchema` (`types/domain.ts`) validates + transforms in one parse: `id` → string, `displayName` ← `username`, `age` ← computed from `birthDate`, `location` ← `"city, country"`, enums lowercased.

**Pending backend additions (asked 2026-06-12):** `parentalPinSet: boolean` on `UserDTO` (the parental gate hydrates from it — `userDtoSchema` already accepts it as optional).

### `GET /users/me` / `PATCH /users/me`

Both return a **bare `UserDTO`** (no `{ user }` envelope). `PATCH` accepts `UpdateProfileRequestDTO`: `{ username?, city?, country?, gender?, educationLevel? }` — `email`/`birthDate` are not modifiable.

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
