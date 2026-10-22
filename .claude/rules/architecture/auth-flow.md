---
paths:
  - "src/api/client.ts"
  - "src/api/services/auth.ts"
  - "src/api/services/users.ts"
  - "src/api/mutations/**"
  - "src/api/queries/useMeQuery.ts"
  - "src/lib/tokenVault.ts"
  - "src/lib/keychain.ts"
  - "src/constants/auth.ts"
  - "src/features/auth/**"
  - "src/hooks/useEstablishSession.ts"
  - "src/store/createUserSlice.ts"
  - "src/components/auth/**"
  - "src/app/**/login.tsx"
  - "src/app/**/register.tsx"
  - "src/app/**/forgot.tsx"
  - "src/app/**/change-password.tsx"
  - "src/app/**/profile.tsx"
  - "src/constants/cities.ts"
  - "scripts/build-cities.mjs"
---

# Auth flow

## How it works today (post 5.5a + 5.8 + 11.X.8 + swagger reconciliation 2026-06-12)

All routes live under `/api/v1` (prefix on the axios `baseURL`, route constants stay bare). Full endpoint contract: `docs/API.md → Authentication`.

1. **Boot (simplified 2026-06-17; `useBootstrap` removed 2026-06-18)** — `RootLayoutNav` (`_layout.tsx`) calls each boot hook directly — there is no `useBootstrap` orchestrator anymore. `useCheckToken` has **one job**: read the refresh token via the **token vault** (`getRefreshToken()` — memory-first then keychain; on a cold boot memory is empty so this is effectively the keychain). No token → unauthenticated (`(auth)`). A token only exists here if the last session checked **"remember me"** (memory-only sessions are gone after an app close → fresh start by design — see **"Remember me"** below). Token present → `useAppStore.setState({ isAuthenticated: true })` with **no network** — offline-first fast path. It never calls `getMe()` or `refreshAccessToken()`: the user object is hydrated by `useMeQuery` (mounted in `(app)/_layout.tsx`, runs on every authed app open), and the access token is hydrated **lazily by the 401 interceptor** — on a cold boot `token` is null, so the first authed request 401s and is refreshed-and-retried (no proactive boot refresh; the old `useBootstrap` background refresh was dropped as redundant with the interceptor). The old "MMKV wiped but keychain survived" recovery path was removed — `useMeQuery` covers re-hydrating the user, so it was redundant. Trade-off: an **expired** refresh token still flips `isAuthenticated: true` instantly, then the first request's refresh gets 401/403 and `logout()` flips it back → one brief flash. Accepted for instant offline-first boot.
2. **Login** — mutation POSTs `/auth/login { email, password }` via `apiClient` (the swagger accepts an optional `device` in the body; backend confirmed 2026-06-12 the client skips it — the separate `PUT /users/me/device` upsert fired by `useDeviceIdentity` when `isAuthenticated` flips true is enough). On success: refresh token → the **token vault** (`lib/tokenVault.ts`) per the login form's **"remember me"** choice (keychain if on, in-memory only if off — see **"Remember me"** below), user + access token → store via `login(user, accessToken)`.
3. **In-flight 401** — response interceptor in `src/api/client.ts` calls `refreshAccessToken()` through a **bare axios instance** (`refreshClient` in `services/auth.ts`) — bypasses the interceptor to prevent refresh-loop deadlocks. The single-flight promise lives **inside `refreshAccessToken`** (2026-06-12, moved out of the interceptor) so every caller — interceptor and boot background refresh — shares one in-flight request; concurrent refreshes would become logout bugs the day the backend rotates tokens. On success: retries the original request. On failure: the interceptor **only rejects** — it never logs out. Logout fires solely inside `refreshAccessToken` on a confirmed 401/403, so a transient refresh failure (offline, timeout, 5xx) mid-session can't wipe the keychain. That branch also `queryClient.clear()`s cached server data (added 2026-07-03 — previously only the user-initiated logout mutation and delete-account cleared it, so a forced logout left the prior session's `['me']`/playback caches in memory for the next sign-in). That same 401/403 branch also opens a one-time `notify` modal (`errors.session_expired` / `_body`) so the user learns _why_ they were bounced to login — it's the only logout path that surfaces a notice (user-initiated logout stays silent).
4. **Refresh — NO rotation (backend decision 2026-06-12).** `POST /auth/refresh { refreshToken }` returns `{ accessToken }` only; the refresh token is static until expiry, so the keychain copy is never rewritten and on success only the in-memory access token updates (`useAppStore.setState({ token })`). Trade-off accepted: replay of a stolen refresh token is undetectable (rotation would catch it); revocation still works via logout / logout-others. Failure semantics unchanged: only 401/403 wipes the keychain; network / DNS / 5xx errors return `null` without logout, so flaky connectivity doesn't sign users out.
5. **Logout** — the mutation reads the keychain refresh token and POSTs `/auth/logout { refreshToken, logoutOtherDevices? }` best-effort (the refresh token identifies _which session_ to revoke; `logoutOtherDevices: true` revokes all; defaults `false`). `useAppStore.logout()` stays the async single chokepoint for the local wipe: calls `clearRefreshToken()` (clears the vault's in-memory copy **and** the keychain) + removes the PIN cache, clears store auth state; the mutation also `queryClient.clear()`s cached data.
   5a. **Delete account** — `DELETE /users/me` (no body; the access token identifies the account), `useDeleteAccountMutation`, triggered from a `confirmation` modal on the Profile screen next to Logout. Unlike logout it is **not** best-effort: the local wipe runs **only on a confirmed 200** (`onSuccess`, not `onSettled`) — `store.logout()` + `clearParentalConfig()` + `queryClient.clear()`, then the root guard routes to `(auth)`. A failed delete keeps the user signed in and surfaces via the global `apiError` modal (no error-suppressing `meta`). It is the **one** local-wipe path that also clears the device-level parental gate (see Parental control) — the device's account data is being erased, so the PIN goes with it; plain logout deliberately leaves it intact.
   5b. **Change password** — `POST /users/me/change-password { oldPassword, newPassword, logoutOtherDevices? }` (authenticated screen, opened from Settings → Account). Unlike `/auth/refresh`, this **ROTATES the refresh token** and returns a fresh `{ accessToken, refreshToken }`, so `useChangePasswordMutation` re-persists via the vault (`rotateRefreshToken()` — keychain or memory, matching the session's **"remember me"** choice) + swaps the in-memory access token (`updateUserSlice({ token })`); `user` is unchanged. `logoutOtherDevices` folds the "sign out everywhere else" option into the same call — there is no separate logout-others endpoint. Errors map by stable `code` (`auth.invalid_old_password`, `auth.password_unchanged`) via `authErrorMessage(err, _, codeMap)`.
   5c. **Profile fetch (fetch-once + explicit invalidation; 2026-06-26)** — `useMeQuery` (mounted once in `(app)/_layout.tsx`) fetches `GET /users/me` **exactly once per authenticated session** and mirrors the bare `UserDTO` into the store. It overrides the global 5-min/refetch-on-focus defaults with `staleTime: Infinity` + `gcTime: Infinity` + `refetchOnWindowFocus: false` + `refetchOnReconnect: false`, so the **only** refresh path is explicit `queryClient.invalidateQueries({ queryKey: ['me'] })` — fired from any mutation that changes the user's profile. Deliberately **not** tied to access-token refresh: the 401 interceptor refreshes on a hot path, and a profile GET there would couple auth to a needless round-trip. **Trade-off (decided 2026-06-26):** this supersedes the prior cross-device foreground sync (foreground/reconnect refetch + 5-min poll) — a parental or profile change made on **another** device no longer auto-arrives on foreground; it lands on next cold boot or after a local invalidation. Real-time enforcement during active playback remains a server concern (playback decision / heartbeat), not this advisory fetch.
6. **Register** — single-shot: `POST /auth/register` carries ALL profile data (email, username, password, birthDate, city, country, gender, `termsAccepted` — wire name; the client's form keeps `acceptTerms`, mapped at the service boundary) and emails an OTP; `POST /auth/register/verify { email, code }` activates the account and returns tokens → **auto-login** (same persistence path as login). `confirmPassword` never leaves the client.
7. **Password reset** — `POST /auth/forgot-password { email }` (always 202) → `POST /auth/reset-password/verify { email, code }` → `{ resetToken }` (one-time) → `POST /auth/reset-password { resetToken, newPassword }` → success `notify` modal + `router.replace` to login (no stale wizard in the back stack). No reset-resend endpoint: re-firing forgot-password replaces the live code.

## Remember me (token persistence; built 2026-06-30)

A **"remember me"** checkbox on the login form (**pre-filled with the user's last choice**, default ON on first launch — preserves the app's prior always-persist behavior) decides only **where the refresh token lives**, nothing else in the flow. **Register has no such checkbox (2026-07-27 product decision)** — a fresh signup always persists the refresh token to the keychain (`setRefreshToken(refreshToken, { remember: true })` in `register.tsx`'s `completeLogin`), on the reasoning that a user who just created an account wants to stay logged in; asking again immediately after registering is pure friction. The persisted `rememberMe` choice (`SettingsSlice`) is login-only from this point — register neither reads nor writes it.

- **On** → refresh token persisted to the **keychain** (survives app restarts — the original behavior).
- **Off** → refresh token kept **in memory only** (module-scope in the vault); it lives for the JS context's lifetime, so closing the app loses it and the next launch starts at `(auth)` — fresh.

The single owner is **`lib/tokenVault.ts`** — `setRefreshToken(token, { remember })`, `getRefreshToken()` (memory-first then keychain), `rotateRefreshToken()` (re-persist a rotated token using the session's choice), `clearRefreshToken()`. **All** refresh-token reads/writes route through it (`useCheckToken`, `authRefresh`, `useLoginMutation`, `useLogoutMutation`, `useChangePasswordMutation`, register-verify, `store.logout`); only `constants/auth.ts` (the key constant) and the vault reference `REFRESH_TOKEN_KEY`. The login mutation takes the flag as a mutation variable (`LoginVariables.rememberMe`, stripped before the request); register-verify always calls `setRefreshToken` with `{ remember: true }` — there is no `rememberMe` field on `registerSchema` and never a body field on `/auth/register`.

**Why this design:** memory-first reads mean a non-remembered session still refreshes its access token on a mid-session 401 (memory hit), while a cold boot (empty memory) only finds a token if it was persisted — so the "fresh start" behavior falls out for free with no extra boot branch. `setRefreshToken({ remember: false })` also **clears** the keychain, so a token left over from a previous remembered session can't silently resurrect the login. The vault holds the session's `remembered` choice so a mid-session rotation (change-password) re-persists to the same place. Memory-only is also strictly **more secure** on shared devices (no at-rest token).

The **choice** (not the token) is persisted to MMKV via `SettingsSlice.rememberMe` (default ON) and pre-fills the login checkbox — login saves it on submit (`setRememberMe`). This is a pure UI preference; the token's actual location is still the vault's call. (The persisted choice is distinct from the keychain token's presence — a non-remembered session persists `rememberMe: false` so the box stays unchecked next launch, while the keychain holds no token.)

**Known gaps:** the OS may reclaim the JS context under memory pressure while backgrounded → a non-remembered session ends early (acceptable, matches "you closed the app").

**Broken Keystore → memory-only (2026-10-06).** Uncertified Android TV boxes (H96 Max, X96, A95X, HK1…) ship firmware whose Keystore rejects every write ("Keystore operation failed"). `setRefreshToken({ remember: true })` now swallows that rejection and keeps the token in memory, so login succeeds and the user signs in again after a full close. Never plaintext MMKV: a credential on disk unencrypted breaks the invariant under Persistence boundaries. Before this, the throw failed the login mutation on those boxes. Locked by `lib/__tests__/tokenVault.test.ts`; device-verified on the Android emulator with the native `setValueWithKeyAsync` patched to reject.

## Guest session — browse without an account (built 2026-08-20; **iOS only**)

Apple rejected the app **twice** under **Guideline 5.1.1(v)** ("requires users to
register to access features that are not account based"). Nothing here is
account-based except the account itself, and every escape was closed: no Albanian law
requires identifying a viewer, the app is free (so no paid-entitlement carve-out), and
a geo-conditional wall fails because App Review sits in the US — IP-whitelisting Apple
would itself be Guideline **2.3.1**, which gets apps *removed*, not rejected. So the
app must open into content, which it can only do if the backend issues a token to an
unidentified device.

**iOS only.** `GUEST_MODE_ENABLED = Platform.OS === 'ios'` (`constants/auth.ts`).
Google Play has no equivalent rule, so Android — phone, tablet, TV and STB, one
artifact — keeps its login wall byte-identical. Everything guest-shaped is gated on
that constant or on `isGuest`, which is unreachable off-iOS.

**`isAuthenticated` keeps its narrow meaning** — a real, identified user — so all 17
existing consumers stayed correct with no review. "There is a usable session" is the
separate `selectHasSession` (`isAuthenticated || isGuest`), and it is the ONLY
predicate gating app access. That is why `useMeQuery` (`enabled: isAuthenticated`)
never fires for a guest and never meets the backend's `403`.

1. **Mint** — `POST /auth/guest { device }` (`services/auth.ts → guestLogin`), the
   SAME `DeviceRegistration` login sends, so the token carries the same `dt`/`dc`
   claims and every downstream endpoint, the player, the socket and the ad layer treat
   a guest byte-identically. Returns an access token ONLY: no `user`, and deliberately
   **no refresh token** — one in the keychain would be indistinguishable from a
   member's at boot.
2. **Persistence — the token, in MMKV, NOT the keychain.** `guestToken` on
   `UserSlice`, in `partialize`. An anonymous token that opens only free broadcast
   content is a weaker secret than the `parentalPin` hash already there (`/users/me`,
   `/packages` and `/auth/logout` all `403` for it), and MMKV is **synchronous** — so
   the boot read adds no async step and no new throw surface. `token` itself stays
   memory-only for members; this is the only token that ever reaches disk.
   **`login` and `logout` MUST null it** (plain `set` — synchronous, cannot throw). A
   leftover copy is found by the boot rehydrate and silently signs a signed-OUT user
   back in as a guest — the same trap `tokenVault` documents for a non-remembered
   session. Locked by a test, and device-verified.
3. **Boot** (`useEstablishSession`, renamed from `useCheckToken`) — five ordered
   outcomes, only one of which touches the network: refresh token → member (no
   network) · not iOS → auth stack · **persisted `guestToken` → guest (no network)** ·
   `guestChosen` → mint (rare: the token was lost) · else / mint failed → auth stack.
   The `!GUEST_MODE_ENABLED` return sits ABOVE the token read, so Android boot stays
   one keychain read and the same early return it always was.
4. **Re-mint on 401, never refresh.** `doRefresh` early-returns `remintGuest()` when
   `isGuest`, so a guest never calls `/auth/refresh` (which `401`s for them by design).
   Same single-flight and retry-once contract as the member path; only the source of
   the new token differs. A confirmed **401/403** — the backend's `auth.guest_disabled`
   kill switch — tears the session down to the auth stack; anything else returns null
   **without** teardown, so a flaky network cannot eject someone mid-programme.
   Deliberately NOT `forceSessionExpired()`: that clears the query cache and raises
   "your session expired", both wrong for someone who never had a session.
5. **The rate limit is a first-class case.** `POST /auth/guest` is capped at **60
   mints/min per IP**, and carrier NAT puts a whole city behind one address — so a
   `429` is a crowd, not a client fault. `mintGuestSession` (`features/auth/`) is the
   single minting path for all three call sites and retries transient failures only
   (`429`, network, `5xx`; never `400`/`403`, which cannot succeed). Backoff is short
   (0.5s, 2s) and deliberately ignores the server's `Retry-After: 60`: this can run on
   the boot path, where a 60s hang is worse than falling back to the welcome gate — and
   that gate carries its own "continue without an account" button, so it is an entry
   screen with a one-tap retry, **not** a registration wall. Persisting the token is
   what makes this rare: a guest mints roughly once per install, not once per launch.

**What an account is required for** — gated client-side on `isGuest`, never by parsing
a `403`: **catch-up replay** (`GUEST_CATCHUP_ALLOWED`, checked before `guardPlay` so
the signed stream URL is never fetched), **18+ programmes** (`useParentalGuard` with
`enabled: parentalEnabled || isGuest` — the `|| isGuest` is load-bearing, since a
guest's `parentalEnabled` is always false), **enabling the parental PIN** (the Settings
row is shown but routed to the sign-in prompt), and everything account-shaped on
Profile. The `signInRequired` modal owns its own copy and its navigation in
`ModalWrapper`, so no gate can drift from another.

**Deliberately still ON for guests:** ads, geo-blocking and the STOMP socket
(`useRealtimeConnection` gates on `hasSession`, not `isAuthenticated`). Without the
socket a guest could start a match legally and never be cut off when an Albania-only
right is enforced mid-stream.

**Backend contract — verified against the live API 2026-08-20**, not taken on trust:
`type: "guest"`, `dt`/`dc` present, no `did`, **30-day TTL**, bare `{accessToken}`;
`GET /channels` + `/guide` → `200`, `/users/me` + `/packages` → `403`,
`/auth/refresh` → `401`. `PlaybackDecision` gained **`LOGIN_REQUIRED`** for catch-up,
which costs us nothing because `decision` is typed as an open `z.string()`, not a
closed enum. **The constraint that matters:** `LOGIN_REQUIRED` must NEVER appear on a
LIVE path for a guest — both `channel/[id]`'s `decisionBlocked` and
`useLiveProgramBlock` treat *anything* not `ALLOWED` as "stop the player", so it would
make live TV unwatchable for every guest.

**Known gaps:**
- **18+ is client-enforced only.** The backend gates adult content for neither guests
  nor members — `birthDate` is checked nowhere — so signing in provides no real age
  assurance. Acceptable while RTSH's adult-flagged slots are post-watershed material;
  it must change if genuinely 18+ content ships.
- **Catch-up behind login is the residual rejection risk.** Replay of free broadcast is
  not account-based, which is the exact shape 5.1.1(v) describes. A product decision,
  isolated behind `GUEST_CATCHUP_ALLOWED` so it reverses in one line.
- **A guest is anonymous per mint server-side** — the backend validates then discards
  `deviceKey`, so there is no `did` and no cross-launch identity. Monitoring uses our
  own keychain UUID (`guest:<deviceKey>`), which is stable across mints.
- **"No network at boot" is proven by unit test, not on device.** JS network
  interception captures `fetch` only and this app uses axios/XHR.

## Why these choices

- **Offline-first boot.** OTT users open the app on subways, planes, hotel WiFi captives. Blocking the splash on a network round-trip is unacceptable. Keychain-only check resolves in ~0ms.
- **Bare axios for refresh.** The interceptor blindly retries 401s through the shared refresh promise. If the refresh call _itself_ returned 401 through `apiClient`, the interceptor would await its own refresh and deadlock. Bare instance side-steps the trap entirely.
- **Narrow logout trigger — enforced in ONE layer.** Original code wiped the keychain on every error — a subway commute could log a user out. Now only confirmed auth failures (401/403) clear the token, and that decision lives exclusively inside `refreshAccessToken`. (Fixed 2026-06-12: the interceptor used to `logout()` on _any_ null refresh result, which re-introduced the subway bug for transient failures during a 401-retry cycle — callers must treat `null` as "no token this attempt", never as a logout signal.)
- **Access token in memory, refresh token in keychain.** Standard mobile pattern. Access token is short-lived and ephemeral; refresh token justifies hardware-backed storage.
- **Why two tokens at all, when the user never logs out?** (Decided 2026-06-10.) Session length is set by the _refresh_ token's lifetime (~30–60 d), not by having two tokens — a single token could live as long. The split buys two things that a long session makes _more_ valuable, not less: **(1) blast radius** — the access token rides every API + stream request, so it's the one most likely to leak (logs, Sentry, a proxy, a CDN edge); keeping it short-lived (~15–30 min) makes a leaked copy near-worthless, whereas a single long-lived token on every wire stays valid for weeks if leaked once. **(2) revocation** — a stateless access JWT is validated by signature alone (no DB hit) but cannot be un-issued; you revoke the _refresh_ token (opaque, server-side) to kill a session on logout-all / password-change / fraud, and the session dies at the next access expiry. A single token forces a choice between statelessness and revocability. Net: dual = stateless fast-path (access) + revocable cold-path (refresh). ~~The refresh rotates on every use~~ — **superseded 2026-06-12:** the backend chose a static refresh token (no rotation; see "Refresh — NO rotation" above), so replay detection is off the table; revocation remains.
- **Zod at the auth boundary (22.14d, reshaped 2026-06-12).** `login` / `register-verify` parse through `authResponseSchema`, `refresh` through `refreshResponseSchema`, `getMe` / `updateProfile` through `userDtoSchema` (`types/domain.ts`) before any token reaches the keychain or the store. `userDtoSchema` validates the wire `UserDTO` **and transforms it to the domain `User`** in one parse (int64 id → string, `username` → `displayName`, `birthDate`/`city`+`country` → `age`/`location`, enums lowercased). All user-bearing endpoints now return the **bare** shape (no `{ user }` envelope) — the old envelope-mismatch trap is gone.

## Known gaps (tracked in plan.md)

- **One wasted 401 round-trip per cold boot.** Between `useCheckToken` resolving and the background refresh completing, the store has `isAuthenticated: true` but `token: null`. First real query hits 401, interceptor refreshes-and-retries. Acceptable trade for instant splash. Tracked: **5.X.5**.
- **MMKV plaintext — accepted risk (5.X.10, decided 2026-06-10).** Not encrypting: real secrets are keychain/memory-only; the blob is low-sensitivity PII. See Persistence boundaries → Known gaps for the full rationale + invariant.
- ~~**iOS keychain accessibility = `WHEN_UNLOCKED`.**~~ **Resolved (verified in code, audit 2026-07-03):** `lib/keychain.ts` defaults to `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so background radio can read the refresh token while locked and the token never syncs to iCloud/other devices. Closes **5.X.11**.
- ~~**No Zod validation at API boundary.**~~ **Resolved for auth in 22.14d** (`authResponseSchema`/`userDtoSchema`), **and for the remaining domain services 2026-07-03** (`channelDtoSchema`/`playbackDecisionDtoSchema` in `services/channels.ts`, `guideProgramDtoSchema`/`guideChannelDtoSchema`/`adDtoSchema` in `types/domain.ts`) — loose-by-design (`z.looseObject`): load-bearing fields fail loud, decorative fields `.catch()` a default, unknown keys pass through since the contract is still settling; ads validate per-element (`safeParse` + drop the bad one instead of failing the whole array). Closes **5.X.2 / 11.Y.5**.
- **No domain-distinguishable errors in `useCheckToken`.** Returns `{ authenticated }` only — UI can't differentiate "no session" from "network failure" for smart retry UI. Tracked: **5.X.5**.
- ~~**`parentalPin` on the backend `UserDTO`**~~ — **dropped 2026-06-16.** The parental PIN is now device-level / client-only (`ParentalSlice`), so it is no longer on the user object and the backend does not carry it. See the **Parental control** section.
- **Static refresh token (no rotation)** — backend decision 2026-06-12. Replay of a stolen refresh token is undetectable; acceptable for v1, revisit if fraud signals appear.
- ~~**Parental PIN feature entirely absent.**~~ **Built (22.14 / 22.14b), reworked device-level 2026-06-16.** See the **Parental control** section below.

---

## Register form data (`constants/cities.*`)

`cities.json` (~40 KB, lazy-loaded) is generated by `npm run cities:build` (`scripts/build-cities.mjs`): every town for Albania, Kosovo and Montenegro (dr5hn dataset, ODbL), the 20 largest cities elsewhere (GeoNames, CC BY 4.0), with a pinned "Other". Both licences require the credit shown under Settings (`settings.credits`) — keep it if the data changes. Usernames are letters + digits only (any alphabet), 3–30 chars, in `features/auth/schemas.ts`; the backend currently checks length only.
