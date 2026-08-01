# ARCHITECTURE.md — RTSH-OTT

Current state of each cross-cutting flow + rationale + known gaps. Updated as plan steps land. Read before answering "how does X work" or proposing changes to X.

This file complements (does not duplicate) CLAUDE.md. CLAUDE.md describes _what the project is and where files live_; this file describes _how flows behave today and why_.

---

## Auth flow

### How it works today (post 5.5a + 5.8 + 11.X.8 + swagger reconciliation 2026-06-12)

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

### Remember me (token persistence; built 2026-06-30)

A **"remember me"** checkbox on the login form (**pre-filled with the user's last choice**, default ON on first launch — preserves the app's prior always-persist behavior) decides only **where the refresh token lives**, nothing else in the flow. **Register has no such checkbox (2026-07-27 product decision)** — a fresh signup always persists the refresh token to the keychain (`setRefreshToken(refreshToken, { remember: true })` in `register.tsx`'s `completeLogin`), on the reasoning that a user who just created an account wants to stay logged in; asking again immediately after registering is pure friction. The persisted `rememberMe` choice (`SettingsSlice`) is login-only from this point — register neither reads nor writes it.

- **On** → refresh token persisted to the **keychain** (survives app restarts — the original behavior).
- **Off** → refresh token kept **in memory only** (module-scope in the vault); it lives for the JS context's lifetime, so closing the app loses it and the next launch starts at `(auth)` — fresh.

The single owner is **`lib/tokenVault.ts`** — `setRefreshToken(token, { remember })`, `getRefreshToken()` (memory-first then keychain), `rotateRefreshToken()` (re-persist a rotated token using the session's choice), `clearRefreshToken()`. **All** refresh-token reads/writes route through it (`useCheckToken`, `authRefresh`, `useLoginMutation`, `useLogoutMutation`, `useChangePasswordMutation`, register-verify, `store.logout`); only `constants/auth.ts` (the key constant) and the vault reference `REFRESH_TOKEN_KEY`. The login mutation takes the flag as a mutation variable (`LoginVariables.rememberMe`, stripped before the request); register-verify always calls `setRefreshToken` with `{ remember: true }` — there is no `rememberMe` field on `registerSchema` and never a body field on `/auth/register`.

**Why this design:** memory-first reads mean a non-remembered session still refreshes its access token on a mid-session 401 (memory hit), while a cold boot (empty memory) only finds a token if it was persisted — so the "fresh start" behavior falls out for free with no extra boot branch. `setRefreshToken({ remember: false })` also **clears** the keychain, so a token left over from a previous remembered session can't silently resurrect the login. The vault holds the session's `remembered` choice so a mid-session rotation (change-password) re-persists to the same place. Memory-only is also strictly **more secure** on shared devices (no at-rest token).

The **choice** (not the token) is persisted to MMKV via `SettingsSlice.rememberMe` (default ON) and pre-fills the login checkbox — login saves it on submit (`setRememberMe`). This is a pure UI preference; the token's actual location is still the vault's call. (The persisted choice is distinct from the keychain token's presence — a non-remembered session persists `rememberMe: false` so the box stays unchecked next launch, while the keychain holds no token.)

**Known gaps:** the OS may reclaim the JS context under memory pressure while backgrounded → a non-remembered session ends early (acceptable, matches "you closed the app").

### Why these choices

- **Offline-first boot.** OTT users open the app on subways, planes, hotel WiFi captives. Blocking the splash on a network round-trip is unacceptable. Keychain-only check resolves in ~0ms.
- **Bare axios for refresh.** The interceptor blindly retries 401s through the shared refresh promise. If the refresh call _itself_ returned 401 through `apiClient`, the interceptor would await its own refresh and deadlock. Bare instance side-steps the trap entirely.
- **Narrow logout trigger — enforced in ONE layer.** Original code wiped the keychain on every error — a subway commute could log a user out. Now only confirmed auth failures (401/403) clear the token, and that decision lives exclusively inside `refreshAccessToken`. (Fixed 2026-06-12: the interceptor used to `logout()` on _any_ null refresh result, which re-introduced the subway bug for transient failures during a 401-retry cycle — callers must treat `null` as "no token this attempt", never as a logout signal.)
- **Access token in memory, refresh token in keychain.** Standard mobile pattern. Access token is short-lived and ephemeral; refresh token justifies hardware-backed storage.
- **Why two tokens at all, when the user never logs out?** (Decided 2026-06-10.) Session length is set by the _refresh_ token's lifetime (~30–60 d), not by having two tokens — a single token could live as long. The split buys two things that a long session makes _more_ valuable, not less: **(1) blast radius** — the access token rides every API + stream request, so it's the one most likely to leak (logs, Sentry, a proxy, a CDN edge); keeping it short-lived (~15–30 min) makes a leaked copy near-worthless, whereas a single long-lived token on every wire stays valid for weeks if leaked once. **(2) revocation** — a stateless access JWT is validated by signature alone (no DB hit) but cannot be un-issued; you revoke the _refresh_ token (opaque, server-side) to kill a session on logout-all / password-change / fraud, and the session dies at the next access expiry. A single token forces a choice between statelessness and revocability. Net: dual = stateless fast-path (access) + revocable cold-path (refresh). ~~The refresh rotates on every use~~ — **superseded 2026-06-12:** the backend chose a static refresh token (no rotation; see "Refresh — NO rotation" above), so replay detection is off the table; revocation remains.
- **Zod at the auth boundary (22.14d, reshaped 2026-06-12).** `login` / `register-verify` parse through `authResponseSchema`, `refresh` through `refreshResponseSchema`, `getMe` / `updateProfile` through `userDtoSchema` (`types/domain.ts`) before any token reaches the keychain or the store. `userDtoSchema` validates the wire `UserDTO` **and transforms it to the domain `User`** in one parse (int64 id → string, `username` → `displayName`, `birthDate`/`city`+`country` → `age`/`location`, enums lowercased). All user-bearing endpoints now return the **bare** shape (no `{ user }` envelope) — the old envelope-mismatch trap is gone.

### Known gaps (tracked in plan.md)

- **One wasted 401 round-trip per cold boot.** Between `useCheckToken` resolving and the background refresh completing, the store has `isAuthenticated: true` but `token: null`. First real query hits 401, interceptor refreshes-and-retries. Acceptable trade for instant splash. Tracked: **5.X.5**.
- **MMKV plaintext — accepted risk (5.X.10, decided 2026-06-10).** Not encrypting: real secrets are keychain/memory-only; the blob is low-sensitivity PII. See Persistence boundaries → Known gaps for the full rationale + invariant.
- ~~**iOS keychain accessibility = `WHEN_UNLOCKED`.**~~ **Resolved (verified in code, audit 2026-07-03):** `lib/keychain.ts` defaults to `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so background radio can read the refresh token while locked and the token never syncs to iCloud/other devices. Closes **5.X.11**.
- ~~**No Zod validation at API boundary.**~~ **Resolved for auth in 22.14d** (`authResponseSchema`/`userDtoSchema`), **and for the remaining domain services 2026-07-03** (`channelDtoSchema`/`playbackDecisionDtoSchema` in `services/channels.ts`, `guideProgramDtoSchema`/`guideChannelDtoSchema`/`adDtoSchema` in `types/domain.ts`) — loose-by-design (`z.looseObject`): load-bearing fields fail loud, decorative fields `.catch()` a default, unknown keys pass through since the contract is still settling; ads validate per-element (`safeParse` + drop the bad one instead of failing the whole array). Closes **5.X.2 / 11.Y.5**.
- **No domain-distinguishable errors in `useCheckToken`.** Returns `{ authenticated }` only — UI can't differentiate "no session" from "network failure" for smart retry UI. Tracked: **5.X.5**.
- ~~**`parentalPin` on the backend `UserDTO`**~~ — **dropped 2026-06-16.** The parental PIN is now device-level / client-only (`ParentalSlice`), so it is no longer on the user object and the backend does not carry it. See the **Parental control** section.
- **Static refresh token (no rotation)** — backend decision 2026-06-12. Replay of a stolen refresh token is undetectable; acceptable for v1, revisit if fraud signals appear.
- ~~**Parental PIN feature entirely absent.**~~ **Built (22.14 / 22.14b), reworked device-level 2026-06-16.** See the **Parental control** section below.

---

## Theme flow

### How it works today (post 5.5a)

- **Token files:** `src/theme/{colors,fonts,borders,spacing}.ts`. `ThemeColors` interface + `lightTheme` / `darkTheme` objects (15 semantic tokens each — placeholder palette).
- **Slice:** `createThemeSlice` holds `mode: 'light' | 'dark' | 'system'` + full `colors` object. Components read `useAppStore((s) => s.colors)` directly — no Context, no ThemeProvider.
- **`'system'` resolution:** `resolveColors(mode)` consults `Appearance.getColorScheme()` for `'system'`. Called at:
  - Slice init (lazy default for `colors`).
  - `onRehydrateStorage` after MMKV rehydration.
  - `Appearance.addChangeListener` in `useSystemTheme` (mounted in `RootLayoutNav`) for runtime OS toggles.
- **Toggle:** `toggleTheme` cycles `system → light → dark → system`. Direct mode selection via `setTheme(mode)`.

### Why these choices

- **No ThemeProvider.** Zustand selector subscription is already O(1) and skips re-renders that don't touch `colors`. Adding a Context provider would duplicate that mechanism.
- **Full `colors` object on the slice (not just `mode`).** Lets components access `s.colors.background` directly without going through a derived selector. Toggle swaps the object reference, triggering re-renders only for subscribers that read `colors`.
- **`Appearance.addChangeListener` lives in `useSystemTheme`.** A dedicated single-purpose hook, mounted once in `RootLayoutNav`, with cleanup. The slice can't subscribe to RN APIs without coupling the store to platform.

### Known gaps

- Missing semantic tokens (`overlay`, `disabled`, `onSurface`, `link`, `focus`, `skeleton`) — **5.X.6**.
- Missing `SHADOWS`, `OPACITY`, `Z_INDEX`, `ANIMATION` token files — **5.X.7**.
- `BORDERRADIUS` missing `pill`, `full`, `none` — **5.X.7**.
- `SPACING.space_10` + `space_28` off the 4px grid — **5.X.8**.
- Current `lightTheme` / `darkTheme` values are reasonable defaults but will need full replacement when design lands.

---

## Boot / Splash gate

### How it works today (post native-splash-only rework 2026-06-17)

The JS `BrandedSplash` was removed — boot is now native splash → router, no JS splash phase and no progress bar.

1. **Native splash** (`expo-splash-screen` config in `app.config.ts`) — shows the logo from frame zero, brand-black, and **stays up for the whole boot** (it's not hidden until React is ready). iOS: full lockup at `imageWidth: 160`. Android: the square RTSH mark at 128dp, because Android 12+ constrains the splash icon to a ~192dp circle that would butcher the wide lockup (128dp square → ~181dp diagonal, fits uncropped).
2. **Router** — `_layout.tsx` is split into **`RootLayout`** (providers only: `QueryClientProvider` → `KeyboardProvider`) and **`RootLayoutNav`** (all hooks + the `Stack`). The one-time wiring (`setupAuthRefresh`, `setupFocusManager`, `initI18n`) runs at **module scope** in `_layout.tsx` (not in render). `RootLayoutNav` calls the boot hooks directly — `useFonts`, `useCheckToken`, `useNetworkMonitor`, `useSystemTheme`, `useOTA` — and calls `SplashScreen.hideAsync()` once **both gates resolve** (`fontsLoaded && tokenChecked`). `useCheckToken`'s keychain read is **async** (`expo-secure-store`), so `RootLayoutNav` **returns `null` until `fontsLoaded && tokenChecked`** (the brand-black root window / native splash holds) — the `Stack` never renders before `isAuthenticated` is known. This makes the `(auth)`/`(app)` guards key on the correct **store** `isAuthenticated` with no flash on cold boot **or JS/Metro reload** (the native splash only covers a cold launch; on a reload there is no native splash, so the `return null` gate is what prevents the login flash). Guards key on `isAuthenticated`, never the in-memory access token (null on cold boot).

Boot gates: `useCheckToken` (keychain check) + `useFonts` (Inter). `SplashScreen.preventAutoHideAsync()` is called at module load in `_layout.tsx`. Native rebuild required when the splash config changes (config-plugin output).

### Why these choices

- **`RootLayout` / `RootLayoutNav` split.** Every TanStack hook (`useCheckToken`, and `useMeQuery` in `(app)/_layout.tsx`) needs a `QueryClientProvider` _ancestor_. Calling them in the same component that renders the provider in its JSX would leave them with no client in scope. The split puts all hooks in `RootLayoutNav`, rendered _inside_ the providers.
- **Native splash only (2026-06-17, supersedes the 2026-06-12 three-phase `BrandedSplash` handoff).** The native logo splash already covers the entire boot window (offline-first boot is near-instant), so the JS progress bar added a phase + a handoff seam for no real benefit. Removing `BrandedSplash` deletes the only place the native→JS swap could flicker. The native splash uses the same RTSH lockup the `BrandedSplash` rendered (`RtshLogoFull`), so the brand is unchanged.
- **Hide on fonts + keychain check.** Both essentially instant. No network blocking — `useCheckToken` is a keychain read only.
- **OTA does NOT gate splash.** OTA failures must never block boot. Updates apply on next foreground via `Updates.reloadAsync()`.
- **Network does NOT gate splash.** Offline-first.

### Known gaps

- Font load failure is silently swallowed (`hideAsync` keys on `fontsLoaded` only, not on a font error). With no Sentry, font load failures are invisible. Tracked: **5.X.12** (Sentry init).
- ~~No error boundary at root.~~ **Resolved 2026-07-03:** `app/_layout.tsx` exports a named `ErrorBoundary` (expo-router convention) — a dependency-free branded retry screen (no store/i18n/tokens on purpose: any of those could be the crash source), dev-only error detail, `retry` re-renders the subtree.

---

## Network state

### How it works today (post 5.5a + 5.8)

`src/hooks/useNetworkReconnect.ts`:

- **`useNetworkMonitor`** — one NetInfo listener for the whole app, mounted once at root in `RootLayoutNav` (RTSH `useNetworkMonitor` pattern). On each change it:
  - bridges NetInfo into TanStack `onlineManager` (queries pause offline, refetch on reconnect),
  - mirrors connectivity into the store via `updateNetworkSlice({ isOnline, connectionType })` — components read `useAppStore((s) => s.isOnline)`; the cellular gate reads `connectionType`,
  - opens the `noInternet` modal on disconnect and closes it on reconnect.
- **Online = `isConnected && (isInternetReachable ?? true)`** — captive-portal safe.
- **Modal copy owned by `ModalWrapper`** (i18n), so the listener passes no text. Auto-close on reconnect is an improvement over RTSH (which leaves the modal up).
- **Store default `isOnline: true`** (optimistic) — avoids a false "offline" flash before NetInfo's first report.
- **Why not a singleton + `useSyncExternalStore`?** Earlier this was a module-level singleton so it could be mounted by many components without leaking. But it's mounted once at root and the Zustand store is already a shared subscribable source — so `isOnline` lives in `NetworkSlice` and the singleton machinery was removed as over-engineering (2026-06-05).

### Why these choices

- **Mounted once at root, not per-component.** A single NetInfo subscription + one `onlineManager` listener, owned by `RootLayoutNav`. This eliminates the leak from the original `useEffect`-per-mount pattern (CRITICAL P5#4 from audit) without needing module-level singleton machinery — root is the only mount, so there is nothing to deduplicate.
- **Store as the shared source.** Connectivity lives in `NetworkSlice`; any component reads it via `useAppStore((s) => s.isOnline)`. Zustand is already a concurrent-safe subscribable store, so a hand-rolled singleton + `useSyncExternalStore` would only duplicate what the store provides (removed 2026-06-05).

### Known gaps

- No offline **banner** UI (the unused `OfflineBanner` component exists). Currently offline is surfaced via the `noInternet` modal triggered from the listener; a persistent banner is optional/future.
- Data screens now distinguish list states (2026-06-17): `ListEmptyComponent` is a three-way pick — skeleton while `isLoading`, `ErrorState` (with Retry → `refetch`) on a failed load, else the domain `Empty*State` for a genuine `[]`. Wired on Home (TV + radio) and Guide; built on the reusable `ListStateView` (`components/empty`). The live screen no longer spins forever offline (loader gated on `isOnline`). (Catch-up has no screen yet; Search reuses already-loaded data so it has no separate load-error surface.)
- **Unhandled query/mutation errors are no longer silent (2026-06-17).** The `queryClient` (`client.ts`) carries a `QueryCache`/`MutationCache` `onError` that opens the `apiError` modal for any **unexpected** failure (5xx, network, 404…) — a query offers Retry (`query.fetch()`), a mutation dismisses. It deliberately stays silent on 401/403/426 (the interceptor owns refresh-or-logout + force-update). Forms render their own errors via a **hybrid** opt-out — `meta: INLINE_CLIENT_ERROR` (auth forms, change-password, register/reset wizards, reworked 2026-06-17): the modal is suppressed only for **client (4xx)** failures the form shows inline (`isClientError(status)` in `client.ts`), but **unexpected** failures (5xx, network, timeout) still fire the modal. The inline side mirrors that boundary — `authErrorMessage` (`features/auth/errors.ts`) returns `undefined` for 5xx/network — so a request never shows both an inline message and a modal. This is the v5-idiomatic replacement for per-`useQuery` `onError` (removed in v5), chosen over a per-hook `useEffect(error→modal)` to avoid boilerplate and the banned "react to query state in useEffect" smell.
- ~~No cellular-data gate UI~~ — **built 2026-07-31.** `useCellularGate()` mounts at the top of both player routes (`channel/[id]`, `radio/[id]`) and returns `{ pending }`, which those routes gate playback on: the channel screen holds the player skeleton (`cellular.pending || mediaPending || adPending`, so `LivePlayer` never mounts and no stream is fetched), and the radio screen skips its `setRadioChannel` selection (`RadioAudioHost` is store-driven, so nothing reaches the speakers). `pending` is **derived, not stored** — exactly `connectionType === cellular && !cellularPlaybackAllowed && !cellularAcknowledged`. Continue sets the session-only `cellularAcknowledged`, which clears `pending` in the same render and releases the player; Cancel `router.back()`s. Because `pending` is reactive rather than mount-once, a mid-session Wi-Fi → cellular switch re-asks and re-holds playback — the behavior `createNetworkSlice` always documented as the intent but the old mount-only effect never delivered. The effect also clears its own modal on unmount: a route-owned `confirmation` must never outlive its route. Locked by `hooks/__tests__/useCellularGate.test.tsx`.

- **`channel/[id]` is a plain card push, NOT `presentation: 'fullScreenModal'` — load-bearing, do not "restore" it.** `ModalWrapper` lives at the app root, so its RN `<Modal>` presents from the root view controller. `fullScreenModal` makes the player a _second_ natively-presented VC from that same controller, and on iOS the two race: ANY global modal opened while the player is on screen (the cellular gate, `noInternet` on a mid-stream drop, `apiError`) flashed ~1s, was orphaned when the presentation settled, and — since nothing cleared `currentModal` — stranded the store at `'confirmation'`: an invisible full-screen modal window swallowing every touch app-wide once the user went back to the tabs. The card push keeps the player in the root controller's own stack, so global modals present cleanly over it. `animation: 'slide_from_bottom'` keeps the modal look; `gestureEnabled: false` preserves the no-swipe-to-dismiss behavior. **Needs a device pass on the player's fullscreen/rotation + PiP paths** — previously governed by the presented VC, now the root one.

---

## Persistence boundaries

| Data                                                                                                        | Storage                                                                                          | Why                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh token                                                                                               | Keychain (`expo-secure-store`) **if "remember me" is on**, else **in-memory only** (token vault) | Hardware-backed when persisted; "remember me" off keeps it out of at-rest storage → fresh start on next launch. See Auth flow → Remember me |
| User profile (`user`), settings, theme mode, **device parental config (`parentalEnabled` + `parentalPin`)** | MMKV (Zustand persist, **plaintext by design** — see decision below)                             | Fast sync read; persistence survives reinstalls per-platform behavior                                                                       |
| Access token                                                                                                | In-memory only (Zustand)                                                                         | Short-lived; survives only this app session                                                                                                 |
| Server data (channels, EPG, catch-up)                                                                       | TanStack Query cache                                                                             | Coming with `queries/` layer                                                                                                                |
| Resume positions per program                                                                                | MMKV (separate key)                                                                              | Frequent writes, no sync needed                                                                                                             |

### Known gaps

- **MMKV plaintext — accepted risk, won't encrypt (decided 2026-06-10, 5.X.10).** Real secrets are keychain-only (refresh token) or memory-only (access token); the MMKV blob holds only low-sensitivity PII (email / displayName / subscription tier) + boolean settings, and the OS sandbox blocks other apps from reading it. Encryption would only defend a physical-device-compromise + file-extraction scenario, leaking non-credential data — not worth the async-boot refactor. **Invariant (amended 2026-06-15):** never persist a real _credential_ into this plaintext blob (keep auth tokens in keychain). The device parental `pin` (in `ParentalSlice`) is a deliberate exception — it's content gating, not a credential (see Parental control), so plaintext persistence is acceptable for it specifically. The lightweight guard is the `user` field-whitelist (5.X.17), not encryption.
- ~~**`user` blob unbounded.**~~ **Resolved (5.X.17).** `persistUser()` in the store's `partialize` (`store/useAppStore.ts`) whitelists the exact fields that reach the plaintext MMKV blob (`id`, `email`, `displayName`, `username`, `age`, `location`, `gender`, `educationLevel`, `avatarUrl`, `subscription`) — a future sensitive `User` field (a token, a verification secret) can't silently land on disk; it must be added to the list on purpose. This is the chosen mitigation in place of encryption.
- `clearAppStorage(keys)` now takes explicit keys to avoid nuking unrelated MMKV caches on logout — done in 5.5a.

---

## Radio audio (cross-screen playback)

### How it works today (post 22.11)

- **Single engine above the router.** `RadioAudioHost` (`components/Media/RadioAudioHost.tsx`) is mounted once in `(app)/_layout.tsx`, sibling to `RadioMiniPlayer`. It owns the only `expo-audio` player and renders nothing.
- **Store-driven.** The host is purely reactive to `PlayerSlice`: `player.replace({uri})` when `radioStreamUrl` changes, `player.play()/pause()` when `radioIsPlaying` (or the stream) changes. It sets a background-capable audio session once (`setAudioModeAsync`).
- **Routes + mini-player never touch audio.** `radio/[id].tsx` selects a station via `setRadioChannel(...)`; the transport + mini-player flip `radioIsPlaying`. All audio is a downstream effect of the store. `clearRadio()` (mini-player close) pauses + tears down.
- **`RadioPlayer` is now presentational** (art + name/sub + `Equalizer` + prev/play/next) — no playback logic.

### Why these choices

- **Survives navigation.** The old inline `RadioPlayer` held the player, so leaving the screen unmounted it and stopped sound — fatal for a docked mini-player and for background radio. Hoisting the engine above the router decouples lifetime from any screen.
- **Single source of truth.** Two UIs (player route + mini-player) + future lock-screen controls all converge on `PlayerSlice`; the host is the only writer to the audio device.

### Known gaps

- **Background-while-locked + lock-screen controls wired (2026-06-26).** `RadioAudioHost` sets `shouldPlayInBackground: true` in `setAudioModeAsync` (keeps the session alive when the screen locks) and calls `player.setActiveForLockScreen(true, { title, artworkUrl })` on each station change (`clearLockScreenControls()` on teardown). Entitlements come from the `expo-audio` config plugin (`enableBackgroundPlayback: true` in `app.config.ts`) — **requires a native rebuild** to take effect. `doNotMix` interruption mode (already set) is required for the OS to bind the controls to the player.
- **Lock-screen now-playing metadata IS supported** on `expo-audio@56.0.11` via `setActiveForLockScreen` / `updateLockScreenMetadata` — the earlier "SDK 56 doesn't expose `NowPlayingInfo`" note was for an older version and is no longer true. Currently we send `title` + `artworkUrl`; `artist`/`albumTitle` (e.g. ICY in-stream song titles) are unused — `expo-audio` doesn't parse ICY metadata, so a live song title would need the server-driven radio guide or a switch to `react-native-track-player`.
- ~~**No radio-EPG source.**~~ **Resolved, with a day strip (2026-07-27).** `radio/[id].tsx` reuses the SAME per-channel EPG endpoint/hook AND day-strip mechanism as the TV channel screen (`useChannelEpgQuery`, `GET /channels/{id}/epg?date=YYYY-MM-DD`, the 7-back/today/7-forward `DayStrip` + `CatchupBanner`) — a radio station is a `Channel` with `type: 'RADIO'` in the same id-space, so no new endpoint or param was needed. Browsing is **read-only**: radio is one continuous stream with no per-programme recording, so only the currently-airing row on TODAY is interactive (`state: 'now'`, toggles the live stream); every other row — past or future, on any day — renders `state: 'scheduled'` (info-only, non-pressable, still expandable to read its description). The list auto-centers on the now-airing row on entry and re-centers on programme rollover.

  **Layout + virtualization (reworked 2026-07-27).** The screen is a fixed two-pane body under a **floating frosted header** (the `BrandHeader` treatment — `position: absolute` + iOS `BlurView` / Android translucent solid — rather than the flat in-flow `TabHeader` that settings/account use; the favourites action was dropped). The top pane (now-playing core) and the day strip are both **fixed**; the schedule list is the only scroller. The top pane is sized to its own content rather than a `flex: 1` half — a forced 50/50 split squeezed `RadioPlayer` into overlapping the pane below, so its internals were also given a compact pass (art 160 / smaller transport). The schedule is a **`FlashList`**, not a `.map()` in a `ScrollView`: a `ProgramRow` is expensive to mount (reanimated layout + worklet, plus a native `BlurView` on Android — and on radio nearly every row is `scheduled`, so nearly all of them carry one), and building a whole day at once made switching dates visibly janky. Virtualizing also replaced the `onLayout` offset bookkeeping with a plain `scrollToIndex` for the auto-center — nothing to measure, nothing to invalidate on a day change.

  **The same treatment was then applied to `channel/[id].tsx`** (device-verified on radio first): its mobile programme list is now a `FlashList` with `recycled` rows and `scrollToIndex` centering, and `centerOnProgram` / the row-offset refs are gone. The TV drawer list is unchanged — it was already a virtualized `FlatList`, and `ProgramRow` already disables its layout animation on TV, so it never had either symptom. `activeIndex` is now shared by both branches; only the scrolling mechanism differs.

---

## Parental control (content gate)

### How it works today (post 22.14 / 22.14b / 22.14d; **device-level rewrite 2026-06-16**)

> **Model change 2026-06-16 (product decision).** The PIN is now handled **entirely on the client and is device-level, not account-level**. It is never sent to or read from the backend and is not carried on the user object. The config lives in `ParentalSlice` (`parentalEnabled` + `parentalPin`) and is persisted to MMKV alongside settings. This supersedes the 2026-06-15 "rides on the user object" model (and the older keychain-verifier + server-KDF design before that). Plaintext MMKV persistence of the PIN remains a deliberate, written exception to the "never persist a secret in plaintext" invariant — it's content gating, not a credential. See Persistence boundaries.

- **Device-level, client owns everything.** The config belongs to the device, so it survives logout/login and a second account on the same device inherits the same gate. There are **no parental endpoints, no mutations, no cross-device sync**. `ParentalSlice` is the single source of truth and holds both the config and the lockout UX state (5-try client lockout):
  - **`parentalEnabled: boolean`** — drives whether adult content is gated.
  - **`parentalPin: string | null`** — the device PIN, `null` until first set.
  - **`setParentalConfig({ enabled?, pin? })`** — the only writer. Setting a `pin` stores it; toggling `enabled` keeps the existing PIN so re-enable needs no re-entry.
- **Setup + toggle (Settings switch):**
  - **First enable, no PIN yet** → `ParentalPinModal mode="set"` (enter + confirm); on confirm the modal calls `setParentalConfig({ enabled: true, pin })`.
  - **Re-enable when a PIN exists** → `setParentalConfig({ enabled: true })` directly (no re-entry — turning protection on isn't a downgrade).
  - **Disable** → `ParentalPinModal mode="verify"` (local PIN check) first, then `setParentalConfig({ enabled: false })` — removing the gate is the sensitive direction.
- **Verify is a local hash compare (updated — audit 2026-07-03).** What's stored in `parentalPin` is a **SHA-256 hex digest**, not the raw digits: `ParentalPinModal` hashes on set (`hashPin`) and on verify (`verifyPin`, `utils/pin.ts` via `expo-crypto`). Still fully local — no network, no keychain — so the frequent live re-checks (22.14c) stay free; the hash just keeps the raw digit string out of the plaintext MMKV blob.
- **Gating keys on `parentalEnabled` and the EPG row's `isAdult`.** Adult content is gated **only when `parentalEnabled` is true** — a user who never set a PIN sees adult content ungated (their choice). The flag always comes from the **EPG item** (`EpgItem.isAdult`), never the `PlaybackDecision` response (which carries no adult flag). `useParentalGuard`'s `enabled` ANDs-in `parentalEnabled`. Settings/Profile/channel read `useAppStore((s) => s.parentalEnabled)`.
- **Hydration is automatic.** `parentalEnabled` + `parentalPin` are in the persist `partialize`, so the gate is known before any network on warm boot — no separate flag to seed, no dependency on a user payload.
- **One screen guard, two triggers — `useParentalGuard(channelId, { isLive, enabled })`** (22.14c + recorded-path gate, 2026-06-24). One PIN, one `ParentalPinModal`, one per-id verified set; the trigger differs by what you're watching:
  - **Live (continuous, only while `isLive`).** A clean live channel can roll into an 18+ programme mid-watch, so the guard watches today's EPG and re-gates on the transition. It derives the airing adult programme from a `nowTs` timestamp held in state (render stays pure), arms a single `setTimeout` to the next programme edge that chains boundary→boundary, and re-evaluates on app-foreground (RN timers throttle while backgrounded). On entry to an `isAdult` programme the player unmounts (no A/V leak) and the verify modal shows; cancel stays blocked (`blockedDismissed`) with a re-unlock affordance; resolution is once-per-`programId`. The live branch is disabled when `!isLive` (so a recording isn't gated by whatever airs live now).
  - **Recorded (on-demand, at the tap).** Tapping a past programme plays a _known_ item — nothing to time-match — so `guard.guardPlay(program, onAllowed)` keys on that item's own `isAdult` and runs `onAllowed` (the `setSelectedProgramId` swap) only after the PIN verifies, so the signed stream URL is never fetched pre-PIN. Clean items play immediately.
  - **Future/scheduled** rows are non-playable (`ProgramRow` `disabled`), so there's no playback to gate.
  - Verification is the local compare (no network per boundary or per tap). A pending recorded gate takes precedence over a live prompt in the shared modal.

### Why these choices

- **Content gating, not a credential.** A 4–6 digit PIN that only blocks adult-flagged content isn't a real secret; the threat model is a curious child on a shared device, not an attacker. So it lives entirely client-side, verification is a local SHA-256 compare (`utils/pin.ts` — a hash, not KDF: keeps raw digits out of MMKV without credential-grade machinery), and there's no keychain cache and no server round-trip. **Boundary:** never reuse this PIN to gate anything that matters (purchases, account changes).
- **Device-level, not account-level (2026-06-16).** The gate protects _this device's_ viewing, regardless of who is signed in — so it's owned by the device (MMKV), not the account. It persists across logout/login and is intentionally NOT synced across a user's devices (each device sets its own PIN). Simpler than the account model and matches how a shared living-room device is actually used. **One exception clears it: account deletion** (`DELETE /users/me` → `clearParentalConfig`, see Auth flow 5a) — deletion erases the device's account data, so the gate goes with it; logout/login do not.
- **Content-level, not app-entry.** The PIN gates adult-flagged content (channel/program `isAdult`), not app launch — the `(auth)`/`(app)` guard is separate and keys on `isAuthenticated` only. A FaceID/PIN app-lock is a deliberately deferred, separate gate.

### Known gaps

- **Change-PIN / forgot-PIN deferred.** Change-PIN would extend `ParentalPinModal` (verify old → set new); forgot-PIN on a device-level client-only PIN means a local reset flow (UI not built). No backend involvement either way.
- **Per-device by design — no sync.** A user with multiple devices sets the PIN separately on each. Intentional (device-level), not a defect, but worth stating: a change on one device does not propagate.
- **Geo-blocking is CDN-enforced on channel open** (2026-06-22), with a **per-programme client look-ahead added 2026-07-01** — see Real-time → Geo. Whole-channel geo surfaces via the `PlaybackDecision`/`GEO_BLOCK` push; per-programme geo rides a `decision` flag on each EPG row (`useLiveProgramBlock` stops live at the boundary; a `programId`-scoped `GEO_BLOCK`/`GEO_LIFT` flips the cached row live). The flag is a UX look-ahead only — hard enforcement stays CDN/signed-URL. Tracked **15.2 / 11.X.9**.
- ~~**Catch-up/VOD program-level gate**~~ — **closed 2026-06-24.** Recorded playback now gates on the tapped programme's own `isAdult` at selection (`guard.guardPlay`), before the stream fetch. Both live (22.14c) and recorded paths are covered by `useParentalGuard`.
- **Channel-level gate still off** — the channel list / `PlaybackDecision` carry no `isAdult`, so there is no whole-channel lock. By design the per-programme gate covers every adult slot precisely (a channel mixes adult + clean programmes, so a channel lock would over-block clean recordings). Wire a channel-level check only if the backend adds channel `isAdult` and the product wants it.

---

## Device identity & request headers

### How it works today (device-into-token migration, 2026-07-14)

> **2026-07-14 — device identity moved into the access token (backend `viewing-session-v2`, breaking).** Device is now registered **once, at login/register-verify** (a `device` object in the request body); the backend bakes `did` (device id) + `dc` (device class) into the signed access token and derives them from there on every later request. This **replaces** the prior model (2026-06-23–2026-07-13): a standalone `PUT /users/me/device` upsert on every authenticated entry, plus a `?deviceClass=` query param re-sent on the two playback GETs and the `/ws` handshake. All three of those are gone. The cutover came with a **one-time revocation of every existing session** — old tokens carry no device and can authenticate but not play, so any 401 (including from `/auth/refresh`) must fall through to the normal re-login flow, which it already does (see Auth flow → Refresh).

- **Pure module, no mutation.** `utils/device.ts` (no React) still owns all "what device is this" facts. `buildDeviceRegistration()` builds the `device` object and is called directly (awaited) from the **login** (`app/(auth)/login.tsx`) and **register-verify** (`app/(auth)/register.tsx`) submit handlers — both mint a session, so both need it. There is no longer a registration mutation, a mount hook, or an app-entry effect; `useDeviceIdentity` and `useRegisterDeviceMutation` are deleted, and nothing replaces their mount in `(app)/_layout.tsx`.
- **`device` on login/register-verify** — `LoginPayload.device` and the register-verify-only `RegisterVerifyPayload.device` (`api/services/auth.ts`), both typed `DeviceRegistration` (`types/domain.ts`): `{ deviceKey, type, model, operatingSystem, appVersion }`. `deviceKey` is the keychain UUID (`rtsh.device_id`, module-cached; keychain not MMKV so it survives iOS reinstall — no ghost registry entry). `type` is the form-factor enum from `getDeviceType()` (expo-device `deviceType` × `Platform.OS`, STB build-flag wins first). Reset-password verify does **not** carry `device` — it doesn't mint a session, so `OtpPayload` (no `device`) stays its payload type; `RegisterVerifyPayload extends OtpPayload` adds it only where a token is minted.
- **`deviceClass` dropped everywhere except the ad-impression beacon.** `getChannelById` (`services/channels.ts`), `getCatchupPlayback` (`services/epg.ts`), and the WS handshake URL (`realtime/events.ts`'s `WS_URL`) no longer send it — the backend reads `dc` off the token (Bearer on the playback GETs; the STOMP CONNECT frame's `Authorization` header on the socket). `getDeviceClass()` itself is unchanged and still exported from `utils/device.ts`, still used by `reportAdImpression` (`services/ads.ts`) — **confirmed with backend 2026-07-15 this one stays a query param, not derived from the token**, so it was deliberately left untouched.
- **New failure mode: `400 playback.device_class_required`.** A token minted with no device (a stale pre-migration client, or a bug that skipped `device` at login) 400s on either playback GET. Handled globally in `client.ts`'s response interceptor (`isDeviceClassRequiredError`), which calls the shared `forceSessionExpired()` helper — the same teardown a confirmed refresh 401/403 already triggered (extracted out of `authRefresh.ts`'s `doRefresh` into `client.ts` so both call sites share one implementation): logout + `queryClient.clear()` + the one-time `session_expired` notify modal. This should never actually fire once the app sends `device` at login — it's a signal something upstream regressed, not a normal state.
- **`Authorization` + `Accept-Language`** — the **only** headers on the **API client** (`apiClient`), set per-request in the `client.ts` interceptor. Accept-Language reads the **store locale** (user-switchable), never the device locale.
- **Media `User-Agent` (stream requests only, 2026-06-27)** — a custom per-platform UA is stamped on the **media engine** requests (NOT `apiClient`): `getStreamHeaders()` (`utils/device.ts`) → `{ 'User-Agent': getStreamUserAgent() }`, passed to expo-video (`LivePlayer`'s `streamHeaders` in `channel/[id].tsx`, live + recorded) and expo-audio (`RadioAudioHost`'s `player.replace({ uri, headers })`, radio). The value is `RTSHTani-<Platform>` (e.g. `RTSHTani-AndroidTV`; no version — gating doesn't need it and the app version already reaches the backend in the login/register-verify `device` object), keyed off `getDeviceType()` via an exhaustive `Record` (`STREAM_UA_LABEL`) so it never diverges from what's sent at login; `getStreamHeaders()` caches a stable reference (device identity is static at runtime → one resolve, no re-render/source-replace churn). Purpose: let the origin/CDN recognize "this came from our app" and reject foreign requests (a manifest URL pasted into a browser carries the browser's own UA → rejected). **It's a spoofable speed-bump, NOT access control** — pair with signed/expiring/IP-bound URLs. Native applies it via expo-video Android `setUserAgent()` / iOS `AVURLAssetHTTPHeaderFieldsKey`, expo-audio Android `setDefaultRequestProperties` / iOS same iOS key. **iOS caveat:** UA-override rides the _private_ `AVURLAssetHTTPHeaderFieldsKey` (not the public `AVURLAssetHTTPUserAgentKey`, iOS 16+, which expo-video doesn't use) — verify `RTSHTani-iOS/...` actually reaches the origin in their logs; if it's stripped, flip the single `STREAM_ID_HEADER` constant (`utils/device.ts`) from `'User-Agent'` to `'X-Client-Platform'` — every call site is unchanged; only the header _name_ changes (a pure add, no reserved-UA/OS-default fight). Tizen/webOS are **separate apps** that set the same labels via `tizen.websetting.setUserAgentString` / `appinfo.json` `vendorExtension.userAgent`.
- **426 Upgrade Required** — the response-interceptor branch + blocking `forceUpdate` modal + `openStoreListing()` CTA still exist and fire if any response returns 426, unrelated to this migration. `GET /app/version?platform=…` (`getAppVersion`, `services/config.ts`) still exists for the sideloaded `androidstb` self-update poll.

### Why these choices

- **Device belongs on the token, not a side-channel.** The prior model (registration upsert + a per-request query param) could drift — a stale registration, a race between the fire-and-forget PUT and a channel tap, or a spoofed `deviceClass` value. Baking `did`/`dc` into the signed access token at the one moment a device is actually presented (login) makes every later request self-describing and un-spoofable without re-sending anything.
- **Login AND register-verify both need `device`.** Both endpoints mint a token (register-verify auto-logs in), so both need it present at the one moment device identity is established. Reset-password-verify doesn't mint a session, so it stays on plain `OtpPayload`.
- **Shared teardown, not two copies.** A confirmed refresh 401/403 and a `device_class_required` 400 are the same underlying situation — "this token is dead, re-login" — so `forceSessionExpired()` lives once in `client.ts` and both call sites use it. Keeping two hand-copies in sync across `authRefresh.ts` and the response interceptor was the alternative, and the kind of drift this migration is itself fixing.
- **Identity is static; layout is not.** Platform, version, and device ID never change at runtime. Screen-size _layout_ decisions live in the separate **`@/responsive`** module (→ Responsive layout & sizing). The split is intentional: this module reports the **physical device** (`getDeviceType()`/`getDeviceClass()`), `@/responsive` classifies the **live window** for layout. Don't unify them — note `getDeviceClass()` here (`MOBILE|TV|STB`, backend platform) is distinct from `@/responsive`'s `getDeviceClass(w,h)` (`phone|tablet|tv`, window size).

### Known gaps

- **iOS store URL placeholder** — `IOS_APP_STORE_ID` is empty until the App Store listing exists (Phase 24); the iOS 426 CTA is a no-op until then.
- **STB self-update orchestration not built** — endpoint + service exist; the boot check/download/install flow lands with the TV pass (22.18) on the `androidstb` build.
- **CDN requests carry no device headers** — if edge-level per-device enforcement is ever needed, it rides signed playback URLs (15.2 geo contract), not headers.
- **`DeviceType` enum ✅ confirmed** from the OpenAPI `DeviceInfoDTO` (2026-06-12) — client values match exactly. **No device cap** (confirmed 2026-06-12): neither the old registration PUT nor `PlaybackDecisionDTO` ever carried a device-limit error.

---

## Responsive layout & sizing (`@/responsive`)

### How it works today (2026-06-18)

A self-contained, **portable** module (`src/responsive/`) owns every device-size decision. It depends only on `react` + `react-native` — no store, theme, or API coupling — so the folder can be copied into another project and wired by editing one config file. Three deliberately-separate concerns (this is the industry standard: don't linearly scale a UI — a bigger screen should show _more_, not _bigger_):

1. **Layout — reactive, by device class + orientation.**
   - `getDeviceClass(width, height)` (pure) → `'phone' | 'tablet' | 'tv'`. Classifies by **shortest side** (`Math.min(width, height) ≥ TABLET_MIN_SHORTEST_SIDE` (600) ⇒ tablet; `Platform.isTV` ⇒ tv). The shortest side is orientation-independent, so a phone in landscape is never mistaken for a tablet in portrait — the same logic as Android's `sw600dp` qualifier.
   - `useResponsive()` → `{ deviceClass, isLandscape, width, height }` via `useWindowDimensions` (re-renders on rotation / split-view resize). Because it reads the **window**, an iPad in split-view correctly classifies as `phone` for layout.
   - `useResponsiveGrid()` → `numColumns` from `GRID_COLUMNS` (phone 2/2, tablet 3/4, TV 4/4). The Home channel grid consumes this; cards self-size via `flex: 1`. Single-column lists (radio/guide) stay single-column at every size — but are width-capped + centered on tablet/TV via `useContentWidth` (concern 3), not stretched edge-to-edge.

2. **Sizing — static step multiplier at the token layer.**
   - `scaled(n)` multiplies a token by a **discrete per-class step** (`UI_SCALE`: phone 1, tablet 1.15, TV 1.3), snapped to a physical pixel, **resolved once at module load** (`Dimensions.get`). Applied at the token _source_ only: `FONTSIZE`, `SPACING` (`theme/`), and the primitive size tables in `ReusableText`/`ReusableBtn`. Every component scales for free by consuming tokens — never call `scaled()` inside a feature component.

3. **Content width — reactive centered cap for single columns.**
   - `useContentWidth(variant)` returns a `ViewStyle` that caps a single column to `CONTENT_MAX_WIDTH[variant]` (`form` 480 / `content` 640 / `player` 820) and centers it on **tablet/TV**, and is a **no-op on phone** (empty object — phone byte-for-byte unchanged). Reactive (via `useResponsive`) + memoized (stable reference, safe in `useCallback`/memo deps). Applied to a `ScrollView`/`FlashList` `contentContainerStyle`, a wrapping `<View>`, or a `FlashList` `renderItem` row wrapper. Wired on: auth forms (`AuthScreen`), change-password, settings, account, profile, radio now-playing, the channel player (inline video + day-strip + EPG — as a conditional **style** on the same nodes, so it's never applied in fullscreen and never moves the player in the tree → no rotation remount), and the Guide / Search row lists. **Not** used on the Home grid (a grid fills the wider screen with more columns instead).

4. **Orientation — per device class, applied at runtime (2026-07-28).**
   - `hooks/useOrientation.ts` owns the policy; `app.config.ts` stays `orientation: 'default'` (the manifest must declare landscape so the player can rotate into it).
   - **Phone** — portrait-locked (`OrientationLock.PORTRAIT_UP` from `useLockPortrait`, mounted at the app root). Only `useFullscreenOrientation` rotates it, and only on the fullscreen button; there is no sensor-driven rotation.
   - **Tablet** — free rotation (`unlockAsync()`); the fullscreen locks are no-ops there.
   - **TV** — untouched (no portrait concept).
   - The phone-vs-larger check reads `Dimensions.get('screen')` — the **physical screen**, not `'window'` like `useResponsive()` does. Orientation is a device-level concern: an iPad in a narrow split-view window is still a tablet and must stay free to rotate, even though its window classifies as `phone` for layout.

### Why these choices

- **Tablets rotate because the OS already decided that.** For `targetSdk` 36 Android 16 ignores `android:screenOrientation` **and** `setRequestedOrientation()` — what `expo-screen-orientation` calls — on any display ≥ sw600dp, and Apple deprecated `UIRequiresFullScreen` in iPadOS 26. Locking a tablet was already fiction on current OSes; the runtime policy just makes intent match reality on both platforms. The `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` manifest opt-out was considered and rejected — Google removes it at `targetSdk` 37, mid-contract, and it does nothing for iPad.
- **Don't linearly scale; step by class.** Proportionally scaling every view turns a tablet into a blown-up phone and wastes the extra real estate (Apple/Google HIG). A small discrete step (≤1.3×) keeps typography readable and controls tappable without stretching the layout.
- **Static type, reactive layout.** Font/spacing that jumps on rotate or split-view resize is jarring, and a device's class doesn't change mid-session — so sizing is resolved once. Column counts _should_ track the live window, so the grid is reactive.
- **`phone = 1` is the safety net.** On phones `scaled(n) === n`, so the entire existing phone UI is byte-for-byte unchanged; only tablet/TV see the step. The same safety net holds for content width — `useContentWidth` returns an empty style on phone, so a single column there is full-bleed exactly as before; only tablet/TV get the centered cap.
- **A wide single column is wasted, not "bigger".** A login form or settings list at 1200dp wide is unreadable and ugly — the fix is a centered max-width column (every web/native tablet app does this), not stretching. Three caps (form/content/player) instead of one because a single-input form wants a narrower column than a player.
- **Window (layout) vs physical device (registry) are separate.** Layout cares about the live drawable window (split-view shrinks it); the backend device registry cares about the physical form factor. So `@/responsive` (window) and `utils/device.ts → getDeviceType()` (physical) stay decoupled even though both "classify the device".
- **Portable by construction.** Zero project imports inside `responsive/`; the only project-specific wiring (which tokens call `scaled()`, which screen calls `useResponsiveGrid()`) lives outside the folder. Tune everything in `responsive/breakpoints.ts`.

### Known gaps

- **Token scale is fixed at launch** — if a device enters/exits split-view mid-session the typography step does not re-resolve (layout columns do). Accepted: font jumps are worse than a stale step, and full-screen→split transitions are rare. Re-resolve via a context provider if it ever matters.
- **Single multiplier for all token types** — headings/body/spacing share one step. Per-category steps (e.g. headings scale less than body) are a refinement if tablet type feels heavy; not needed at 1.15×.
- **Card badge internals are still literal px** — `ChannelCard`'s frosted badge paddings/icon sizes are hardcoded (not tokens), so they don't scale on tablet. Minor (the card name text does scale via `FONTSIZE`); convert to tokens if badges look small on a real tablet.
- **TV (`4/4`, step 1.3) is untested on device** — no D-pad/focus nav yet (22.18); the column + scale config is in place but the large-screen pass will tune it.
- ~~**`radio/[id]` landscape untested**~~ — **fixed 2026-07-28.** It did share the channel screen's defect (a fixed two-pane column + the short landscape height ⇒ a schedule list with barely a row of viewport and no way to scroll the rest in), so it got the same split: on **tablet landscape** the now-playing core becomes the left column (42%, content-height, vertically centered via `alignSelf` on the row's cross axis) and the day strip + schedule the right column (`flex: 58`, full screen height). Applied the same way as the channel screen — a style swap on the existing `body`/pane nodes with both directions written explicitly, never an added/removed wrapper. Its column cap also moved from `useContentWidth('content')` (640) to **`'player'` (820)**, matching `channel/[id]`: at 640 a tablet in portrait (800dp) rendered 80dp gutters while the channel screen went full-bleed, so two sibling player screens disagreed on width. Verified on a 1280×800dp tablet emulator 2026-07-28: portrait renders edge-to-edge, landscape shows the two columns with the schedule scrolling through the full day.
- **`CountryPickerInput` sheet height is frozen at launch** — `SHEET_HEIGHT` reads `Dimensions.get('window').height` at **module scope** (`components/Inputs/CountryPickerInput.tsx`), so on a tablet the sheet keeps its launch-orientation height after a rotation until the app restarts. Latent before (nothing rotated); live now that tablets do.

---

## Android TV / STB

### How it works today

Android TV and operator STB run the **same codebase** as mobile, not a fork — and since **2026-07-28, the same Android artifact**: ONE APK/AAB installs and runs on phone, tablet, Android TV and STB. This supersedes the earlier two-build model (`EXPO_TV=1` selecting a separate TV prebuild).

**Why one artifact is possible at all:** `Platform.isTV` on Android is resolved at **runtime**, not build time — react-native reads `UiModeManager.getCurrentModeType() == UI_MODE_TYPE_TELEVISION` (`AndroidInfoModule.kt` → `Platform.android.js`). So the same JS bundle reports `isTV: true` on a TV and `false` on a phone with no build flag, and every `src/tv/` affordance adapts itself. The only genuinely build-time TV input is the **Android manifest**, which is now written unconditionally by **`plugins/withUniversalAndroidTV.js`** (see below). Google explicitly recommends this: *"We recommend that you have a single app that supports both mobile devices and TV devices"* ([Android TV docs](https://developer.android.com/training/tv/start/start)).

`react-native` is npm-aliased to `npm:react-native-tvos@0.86.0-2` (`package.json`) — a strict superset of mainline RN 0.86.0. The alias requires `.npmrc legacy-peer-deps=true` to stop npm ERESOLVE-ing the fork against `react-native` peers, which has the side effect of also skipping peer auto-install — so two peers are pinned **explicitly** in `package.json`: `react-native-nitro-modules` (mmkv's peer; silently missing otherwise → native build fails) and `@react-native/jest-preset` (RN's own jest preset → `npm test` fails otherwise).

`EXPO_TV` is now **inert** — nothing reads it. The `*_tv` / `*_stb` EAS profiles and `*:tv:*` npm scripts are deliberately **kept** (they still build, just identically to the mobile profiles) as reference structure for other projects. `APP_PLATFORM=androidstb` still works and is still the only way to distinguish an operator STB (`DeviceType: STB_ANDROID`) from retail Android TV — see Known gaps.

- **Single-build manifest plugin (`plugins/withUniversalAndroidTV.js`)** — always-on, Android-only, purely additive. Three edits: (1) adds the `LEANBACK_LAUNCHER` category to the **existing** MAIN intent-filter (never a second filter — two filters make some launchers render the app twice), so the phone `LAUNCHER` entry survives alongside it; (2) declares nine `<uses-feature android:required="false">` entries, which is **load-bearing, not cosmetic** — Android *infers* required features from permissions (`RECORD_AUDIO` ⇒ `android.hardware.microphone`), and one implicitly-required feature makes Google Play hide the app from every TV device; `leanback` stays `false` on purpose (true would hide it from phones); (3) copies the 320×180 banner to `res/drawable-xhdpi/tv_banner.png` and sets `android:banner`. It deliberately **never touches `android:icon`** — that attribute is global, so config-tv's `androidTVIcon` option would replace the phone adaptive icon with the flat TV drawable. Related: the `expo-audio` plugin is configured `recordAudioAndroid: false` (`app.config.ts`) — we only ever play audio, and dropping `RECORD_AUDIO` removes the implied microphone requirement at the source.
- **`@react-native-tvos/config-tv` is no longer registered** (still a devDependency for a future tvOS target). Its Android half is what `withUniversalAndroidTV` replaces; it can't be run unconditionally here because the same `EXPO_TV` flag also rewrites the **iOS** project into a tvOS target (`withTVXcodeProject` / `withTVPodfile` / `withTVInfoPlist`), which would destroy the iOS build on any `expo prebuild` or `--platform all`.

- **Focus module (`src/tv/`)** — portable, `isTV` (`Platform.isTV`)-gated, inert off-TV: `useTVFocus` (`{ focused, focusProps }`), `tvFocusHighlight(color, focused, { scale? })` (returns `undefined` off-TV/unfocused so it never clobbers a base style; `scale: false` for full-width elements — the default 1.05 pop overflows a full-bleed row past the screen edge), `TVFocusZone` (a `TVFocusGuideView` wrapper, a bare fragment off-TV) for `autoFocus`/focus-trapping a region. Wired into the shared primitives (`ReusableBtn`, `ListRow`, `ChannelCard`, `ProgramRow`, …) — see `STYLE_GUIDE.md → TV / D-pad focus` for the per-component conventions.
- ~~**D-pad-into-`ScrollView` fix** (`plugins/withAndroidTVFocusFix.js`)~~ — **DELETED 2026-07-28: it was a no-op.** The RN 0.80+ regression (react-native-tvos #1087) was real — `ReactScrollView.focusSearch()` running a custom clipped-element search that bypasses `TVFocusGuideView`, gated on the `enableCustomFocusSearchOnClippedElementsAndroid` feature flag — and the plugin force-overrode that flag to `false` in `MainApplication.onCreate()`. But **react-native-tvos 0.86 ships that flag defaulting to `false`** (verified in both `ReactNativeFeatureFlagsDefaults.kt:56` and the C++ `ReactNativeFeatureFlagsDefaults.h:90`), and neither `ReactNativeNewArchitectureFeatureFlagsDefaults` nor `ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android` (what `loadReactNative()` applies) overrides it — so the patch set the flag to the value it already had. Upstream fixed the regression by flipping the default, almost certainly at the SDK 56→57 / RN 0.86 upgrade; the plugin survived that upgrade as dead code. What actually makes the D-pad flow through the channel guide is the **single vertical `FlatList`** restructure (below), not this patch. **On every SDK upgrade, re-check that default** — if upstream flips it back to `true`, the patch must return (a reminder note sits in `app.config.ts`'s plugins array).
- **Navigation model — header menu, not bottom tabs.** The bottom tab bar is hidden on TV (`(tabs)/_layout.tsx` sets `tabBarStyle: { display: 'none' }` when `isTV`; `useTabBarHeight()` returns 0) — poor 10-foot UX. Sections switch via **`TVNavButton`** (`components/Brand/`, TV-only, rendered in `BrandHeader`'s top-right): it opens a **`Modal`** route-menu drawer listing the 4 tab routes. `Modal` (not an absolute `View`) is required because `BrandHeader` clips overflow — an absolute drawer would be cut off; `Modal` paints above the whole screen including the tab bar, and `onRequestClose` wires the remote Back button.
- **Channel screen — full-screen player + guide drawer.** On TV the player takes the whole screen; the date-strip + programme list open in a **drawer** (`TVFocusZone`-trapped, opened by a header `GuideIcon` button) instead of a side-by-side layout (a side-by-side layout was prototyped first, then superseded on user preference). The drawer body is a **single vertical `FlatList`** with the date strip as `ListHeaderComponent` — two separate scrollers (a horizontal strip + a vertical list) don't reliably hand the D-pad between them on tvOS/Android TV, one list does (and auto-scrolls the focused row into view). It opens centered on and focused on the now-airing programme (`initialScrollIndex` + `ProgramRow hasTVPreferredFocus`); Back / close / selecting a programme closes it.
- **Nested-focusable gotcha.** A focusable wrapper around focusable children traps the D-pad on the outer element (a pressable strip containing pressable buttons — `RadioMiniPlayer`; a full-screen tap overlay over control buttons — `PlayerControls`). Fixed with `focusable={!isTV}` on the outer wrapper (kept for touch on mobile).
- **Player controls don't auto-hide on TV** — hidden chrome can't be focused, so `PlayerControls` stays visible with focus rings on back/options/play/fullscreen.
- ~~**Native rebuild required to toggle TV**~~ — **gone with the single build (2026-07-28).** There is no mobile-vs-TV native dir any more: every Android prebuild produces the same TV-capable project, so `npm run prebuild:dev` / `:preview` / `:prod` are the only ones that matter and there's nothing to toggle back. (Emulator note that still applies: `expo run:android` auto-targets the single booted device — don't pass `--device <serial>`, expo matches AVD *names*, not adb serials. A TV emulator AVD defaults `hw.keyboard=no`; set it `yes` in the AVD `config.ini` + cold-restart to type with the host keyboard.)

### Why these choices

- **npm alias over a fork/separate app.** `react-native-tvos` is built as a drop-in superset specifically so a single codebase can ship both platforms; forking would double the maintenance surface for a large-screen pass that's explicitly scoped as a display-adjustment layer (22.18), not a separate product.
- **One artifact, because the only real delta is the manifest.** The two-build model existed to keep a mobile build free of leanback/focus native code. But the focus half turned out to be dead code (above), and the manifest half is purely **additive** — a `LEANBACK_LAUNCHER` category phones ignore, `uses-feature` entries that can only *widen* device compatibility, and a `banner` attribute phones don't read. Once the delta is provably additive, two artifacts buy nothing and cost double: two builds, two versionCodes, two store uploads, two things to keep in sync for 48 months. Google's own guidance says the same.
- **Runtime `isTV`, not a build flag, is the real gate.** Everything that must *behave* differently on TV already keys on `Platform.isTV`, which Android resolves from `UiModeManager` at runtime. That's strictly more robust than a prebuild flag: it can't be set wrong, can't drift between the JS and native halves, and needs no second CI path.
- **Never override a native feature flag without reading its shipped default.** The retired focus-fix patch is the cautionary tale — it forced a flag to a value upstream had already made the default, and survived an SDK upgrade as invisible dead code. Read the flag in `node_modules/react-native/.../ReactNativeFeatureFlagsDefaults.{kt,h}` before adding *or keeping* such a patch.
- **Drawer over side-by-side on the channel screen.** A side-by-side (video + guide) landscape layout is the standard OTT pattern and was built first, but the user preferred keeping the player full-screen with the guide as an on-demand overlay — simpler focus model (one drawer to trap, not two independent focus zones) at the cost of not showing the guide and video simultaneously.

### Known gaps

- **TV/tablet large-screen display-adjustment pass (22.18) is not done.** The current screens still run the **mobile portrait** layout on TV (only the channel screen has a TV-specific branch so far) — on a 1920×1080 screen the portrait inline video (`width:100%` + `aspectRatio:16/9`) renders at the full screen height, so anything stacked below it (day-strip, EPG list on non-channel screens) sits below the fold with nothing to scroll it into view. Root-caused 2026-07-07 (confirmed via a UI-tree dump on a real TV emulator boot) as a **layout** gap, not a focus bug — the D-pad/focus foundation itself works (Home grid nav, focus rings all verified on-device).
- **STB is the one thing the single build can't resolve.** An operator STB and a retail Android TV box are **runtime-identical** — nothing distinguishes them — so `DeviceType: STB_ANDROID` still depends on the build-time `APP_PLATFORM=androidstb` flag (`extra.devicePlatform` → `buildTimePlatform` in `utils/device.ts`). That means a *fully* single artifact reports every STB as `ANDROID_TV`. **Proposed fix (needs backend sign-off): let the backend classify it.** The login/register-verify `device` object already carries `model`, and the backend already bakes `dc` into the access token — so the client can send `ANDROID_TV` + the model string and the server maps known operator models → `STB`. A new box SKU then becomes a backend config row instead of an app release, which matters over a 48-month contract. Loose end: `getDeviceClass()` is still read client-side for the ad-impression beacon's `?deviceClass=` param, which would report `TV` for STBs until the backend corrects it on its side. Until that lands, the `*_stb` EAS profiles remain the escape hatch.
- **Play Store TV filtering is unverifiable off-store.** Sideloading (`adb install`) bypasses Play's feature filtering entirely, so the `uses-feature` / `RECORD_AUDIO` work can only be proven by `aapt2 dump badging` output plus Play Console's supported-device count after upload — never by a device test. Adding the leanback intent does **not** auto-publish to TV either: the TV form factor still needs an explicit Play Console opt-in with TV screenshots + a 1280×720 banner and a TV review.
- **STB self-update flow not built** — the `GET /app/version?platform=` endpoint exists (sideload poll) but the boot check/download/install orchestration lands with the rest of the TV pass.
- **10-foot visual tuning (contrast, safe margins, text size at distance) not done** — the `UI_SCALE` TV step (1.3×) and `GRID_COLUMNS` (4/4) are wired (see Responsive layout & sizing) but unvalidated against a real living-room viewing distance.

---

## Analytics & telemetry

> **Status: DISABLED.** The module is fully built as described below, but every mount is commented out — `useAnalytics()` in `(app)/_layout.tsx`, `useWatchTracking` + the `stream_error` `onError` in `channel/[id].tsx`. Nothing emits today. Re-enable (or formally defer) is tracked in `.claude/docs/plan.md → Phase 14`.

### How it works today (built 2026-06-26)

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

### Why these choices

- **Two primitives, not one.** Discrete events (`track`, fire-and-forget) and the periodic heartbeat (`useQuery` poll) are genuinely different interaction models — forcing the events through a query (no imperative per-call params; shared key dedupes) is the anti-pattern. They share one enrichment helper + one service, so it's not duplication.
- **Heartbeat as a query, not `setInterval`.** Reuses TanStack's interval + the app's `focusManager` bridge for background-pause + foreground-beat with zero manual `AppState` code.
- **First-party, fire-and-forget.** Telemetry must never affect the app (lossy-tolerant) and RTSH owns the data — so a plain `apiClient.post` that bypasses the global error machinery, behind a typed no-PII payload.

### Known gaps

- **`app_open` fires post-auth.** `useAnalytics` mounts in `(app)/_layout`, so a logged-out cold start (sitting on login) doesn't emit `app_open` until after auth. Acceptable for v1 (open funnel ≈ authenticated open); move the hook to the root layout with auth-gated session/heartbeat if pre-auth opens are needed.
- **`stream_error` errorType is coarse** — expo-video exposes no stable error code at the `statusChange` boundary, so it's a constant `'playback'`. Refine if the player surfaces a code.
- **Backend contract assumed** — `POST /analytics/events { events: [...] }` shape + the event names/props are the client's proposal; confirm with the middleware team (they own ingestion). No fallback provider (PostHog/Amplitude) wired.
- **Recorded vs live watch granularity** — the channel screen emits a fresh `watch_start`/`_end` pair when flipping live↔recorded (kind changes); fine-grained but means one screen visit can yield multiple watch sessions. Intentional.

---

## Real-time (STOMP over WebSocket)

### How it works today (built 2026-06-29)

Real-time layer in `src/realtime/` (`@/realtime`) over **STOMP-on-WebSocket** (`@stomp/stompjs`), chosen because the backend is Spring and already runs STOMP for admins (Socket.IO has no native Spring server; SSE can't carry the client→server watch events). Backend contract: `docs/REALTIME_SOCKET.md`. Five concerns, the playback `/refresh` stays separate:

- **`events.ts`** — `WS_URL` (derived from `API_BASE_URL`: http→ws, drop `/api/v1`, add `/ws`), `STOMP_DEST` (destinations), and the payload types (`MidrollEvent`, `GeoEvent`, `WatchKind`).
- **`client.ts`** — one STOMP `Client` singleton. `connectRealtime()`/`disconnectRealtime()`/`publish()`/`subscribe()`. Auth rides the CONNECT frame (`Authorization: Bearer <token>`, re-read in `beforeConnect` so a refreshed token is used on reconnect). Writes `realtimeConnected` to `RealtimeSlice` (runtime, not persisted).
- **`useRealtimeConnection()`** — mounted once in `(app)/_layout`; connects while `isAuthenticated` **and an access token exists** (2026-07-03: gated on token _presence_ — on cold boot the token is null until the first 401-refresh, and connecting then would send an empty Bearer → server reject → 2s reconnect churn; the boolean gate means a mid-session token refresh never bounces the socket, and reconnects pick up the fresh token via `beforeConnect`); disconnects on logout. **The held connection (+ STOMP ping/pong) IS presence** — no polling. Backend marks the user online on `SessionConnected`, offline on disconnect.
- **`useChannelRealtime(channelId, programId, kind, midrolls)`** — per-channel. Subscribes to `/topic/channel.{id}` (mid-roll delivery + in-channel presence via the subscriber count) and `/user/queue/geo` (Option B geo). Emits **watch segments** — `/app/watch` on enter + every program switch (backend closes the previous segment; no client stop-on-switch), `/app/watch.end` on unmount; disconnect closes it server-side. Returns `{ dueAd, onAdComplete, geoNotice }`.

**Mid-roll scheduling (Ads = Option A, client-scheduled).** Ad **data** is single-sourced in the TanStack cache (`['ads', channelId]`) — the merged `GET /ads` seed AND socket `MidrollEvent` add/update/remove (the handler calls `setQueryData`, keyed by `id`). The hook adds only scheduling **state** (a `nowMs` clock + a fired-ids set) and **derives** the due ad purely (earliest `MID_ROLL` whose fire time ≤ now, unfired, not lapsed) — same clock-in-state + one-boundary-`setTimeout` + foreground-re-eval discipline as `useNowProgram`. The pure core lives in `src/realtime/midroll.ts` (`selectDueMidroll`/`nextMidrollBoundaryMs`/`midrollLapsed`, unit-tested). **Open-window due rule (2026-07-21, replaces the session-window guard):** an ad is due when `startTime` ≤ now while its viewing window is open — including a start that predates the channel visit (join mid-band). The former guard (`fire ≥ sessionStart`, i.e. "never insert into the past") contradicted the backend contract (`fe-midroll-ads-flow.md` §3: "`startTime` ≤ now → play now"; the server *clamps* an active band's `startTime` to now on the REST seed) and could permanently eat an ad under device-vs-server clock skew — the root cause of "pushed scheduled ad never runs". Replay-on-re-entry protection is the module-level `shownMidrollIds` set (survives remounts within an app session), NOT a time comparison; `sessionStart` remains only as the rank anchor for fire-now ads. **Defensive parsing (2026-06-29, `midrollFireMs`/`midrollLapsed`):** a null or unparseable `startTime` resolves to NOW (fire immediately) rather than dropping the ad. Lapse handling (`midrollLapsed`, hardened 2026-07-06): a **valid** `validUntil` (a real instant strictly after `startTime`) is the authoritative viewing window — the ad lapses once `now` passes it (so a still-valid ad shows even if "late"); **any unusable `validUntil`** (absent / unparseable / zero-width `== startTime`) falls back to a fixed staleness window `MIDROLL_MAX_STALENESS_MS` (`constants/ads.ts`, 5 min) measured from `startTime`, so a break the user was **backgrounded across** isn't shown arbitrarily late on foreground re-eval; a fire-now ad (no `startTime`) has no reference instant and never lapses this way. A valid **future** `startTime` still schedules normally. Mid-roll delivery is **backend-confirmed (2026-07-06):** topic publish to `/topic/channel.{id}` with `MidrollEvent { op, adId, channelId, creative }` (op UPPER_SNAKE; ADD/UPDATE carry the full `creative`, REMOVE → `creative: null`; an all-channels ad only pushes to channels with a live subscriber → seed from REST on join). **Pushed creatives are schema-validated (2026-07-21):** `applyMidroll` parses `ev.creative` through the SAME `adDtoSchema` as the REST seed (malformed → dropped, dev-warn — a silently cached junk `startTime` would demote to fire-now) and coerces `ev.adId` to a number (a string-serialized id would miss every strict-equality match: REMOVE filter, fired-set re-arm). Open question to backend (see `docs/fe-midroll-ads-response.md`): confirm the WS `AdDTO` serialization is byte-identical to REST and that the active-band clamp also applies on the WS path. `startTime`/`validUntil` are absolute ISO `Instant`s (backend converts a DB time-of-day band to today's absolute instant, anchored Europe/Tirane; only today's firing is scheduled, elapsed bands are dropped from the array). The scheduler is gated on `kind === 'LIVE'` (2026-07-06) — an absolute-time break is meaningless against an on-demand recording. Each ad fires once; `onAdComplete` marks it shown. **The content stream pauses for the break (2026-06-30):** unlike the preroll (which unmounts the player), a mid-roll fires while the player is already mounted, so the channel screen passes `paused={adActive}` (`adActive = canShowMidrollAd` — the _actually-on-screen_ state, NOT the raw due ad, so a mid-roll suppressed by the `useAdSlot` exclusivity guard can't pause the picture with no visible ad; fixed 2026-07-06) → `LivePlayer` → `VideoPlayer`, which reconciles the flag onto the imperative player in an effect (no remount; CSAI / Google-IMA `ContentPauseRequested` model). On resume, `VideoPlayer` branches on `player.isLive`: a **live** stream best-effort re-syncs to the live edge (`seekBy(player.currentOffsetFromLive)`, skipped — resume in place — when the manifest lacks `EXT-X-PROGRAM-DATE-TIME` so `currentOffsetFromLive` is null) so the break doesn't strand the viewer behind live; **recorded** resumes in place. The same flag flips `allowsPictureInPicture`/`startsPictureInPictureAutomatically` off so the user can't background into a PiP window whose native surface would keep playing content behind the JS-overlay ad; an already-active PiP is **not** ejected (verified possible via the `VideoView` ref's `stopPictureInPicture()`, but rejected — pausing leaves a frozen frame, better UX than a window vanishing while the user is in another app). **Verified against expo-video 56.1.2 types** (`player.pause/play/seekBy/isLive/currentOffsetFromLive`, `VideoView` PiP props/ref). **Open caveat:** the live-edge seek depends on the RTSH origin emitting `EXT-X-PROGRAM-DATE-TIME` — validate on a real live stream alongside the untested-AES `TODO(anx 2026-06-02)`. The channel screen renders the overlay through the existing `AdOverlay`, which **self-reports its impression once at completion** (VAST/IMA convention — the ad unit beacons itself) — callers pass only `channelId` (attribution) and `AdOverlay` calls `reportAdImpression` internally (`POST /ads/{id}/impression`, fire-and-forget) — preroll, mid-roll, and app-open all report. The beacon fires on the **completion** path (skip / timer / video end), not mount, so the body can carry `watchedSeconds` (wall-clock since first paint, clamped to the ad's `durationSeconds`) + `durationSeconds` for the backend's avg-view-rate tile (Σwatched / Σduration, see `docs/REALTIME_SOCKET.md` §6.1). **`placement` is NOT sent (2026-07-06)** — the backend silently drops it; it lives on the `GET /ads` response. Every beacon carries a `clientEventId` (v4 UUID from `expo-crypto`) minted by `AdOverlay` **once per impression** (inside the `reportedRef` guard) and passed **in** the body — the backend de-dupes on it within a broadcast day. Per-impression, NOT per-POST: a future store-and-forward retry must replay the same id (a fresh id per attempt would defeat de-dupe); `reportAdImpression` is pure transport and does not mint it. `AdOverlay` holds a `startedAtRef` + a `reportedRef` once-guard so it fires exactly once across every dismissal path. Trade-off: an app force-killed mid-ad still won't report (nothing persists the pending beacon).

**Preroll gating & reveal delay.** While a channel-change or app-open preroll is active, the content player stays **unmounted** (`adPending = !!channelAd && !adDone` in `channel/[id].tsx`) so nothing autoplays behind the overlay — a skeleton holds the 16:9 slot until `onComplete` fires. Both prerolls ease in via **`useDelayedReveal(ready, delayMs)`** (`hooks/`, `AD_REVEAL_DELAY_MS` = 2000ms in `constants/ads.ts`) **after their host screen has settled** (Home channels loaded / channel EPG loaded), not the instant the ad is fetched — so the overlay doesn't snap up over a freshly-drawn page. The player stays unmounted for the whole delay too, so there's no autoplay leak behind the deferred overlay. **Slot exclusivity + route scoping (2026-07-03):** the app-open ad is mounted above the `Stack` in `(app)/_layout.tsx` (it outlives navigation), so a route-scope check (`usePathname()` must be one of the 4 tab paths) cancels its reveal on navigation, and a shared `AdsSlice.activeAdId` + `useAdSlot(wantsToShow, adId)` hook (`hooks/useAdSlot.ts`) ensures only one of the three placements (`APP_OPEN`/`CHANNEL_CHANGE`/`MID_ROLL`) can be on screen at a time app-wide — closes a stacking bug during screen-transition animations.

**Geo (Option B, backend-fired; unified with the decision 2026-06-30; per-programme 2026-07-01).** Geo has **two granularities**, distinguished by whether the `GeoEvent` carries a `programId`:

- **Whole-channel** (no `programId`) — the backend pushes `GEO_BLOCK`/`GEO_LIFT` to the affected viewer's session (`/user/queue/geo`); the hook surfaces an instant `geoNotice` overlay (only for the current `channelId`), and the channel screen folds it into the existing `decision`-blocked UI (`showBlocked`) — stop playback + show the notice; `GEO_LIFT`/channel-change clears it. **Every geo event also `invalidateQueries(['channel-playback'])`** so the authoritative `decision` re-fetches and CONVERGES with the push — the socket is an _invalidation signal_, not a parallel source of truth (the fix for "lift didn't unblock in real time / stale on re-entry"). `channelId` is coerced (`Number(ev.channelId)`) so a serialization mismatch can't swallow a `GEO_LIFT`. Join-time is unchanged (`GET /channels/{id}` → `GEO_BLOCKED`).

- **Per-programme** (`programId` present, 2026-07-01) — a specific programme (past or future) is geo-restricted while the channel itself is fine. Handled off a **`decision` flag on the EPG list row** (the SAME field `/epg/{programId}` returns — `ALLOWED`/`GEO_BLOCKED`/…, evaluated by the backend for the user's country). Three paths, all covered:
  1. **Tap a past/recorded programme** → `GET /channels/{id}/epg/{programId}` returns the decision; a non-`ALLOWED` value shows the block (unchanged).
  2. **Watching LIVE, rolls into a blocked programme** → **`useLiveProgramBlock`** (the decision sibling of `useParentalGuard`'s live branch) watches TODAY's EPG independently of the day strip, reuses `useNowProgram` for the now-airing derivation + boundary timer + foreground re-eval, and blocks when the airing programme's `decision !== 'ALLOWED'`. No boundary network call — the flag is already on the cached row. Watching-today-independently is required so the gate holds while the user browses a _past_ day with live still playing.
  3. **Admin blocks/lifts a programme mid-session** → a `GEO_BLOCK`/`GEO_LIFT` carrying `programId` → `useChannelRealtime` sets that row's `decision` (`GEO_BLOCKED`/`ALLOWED`) across every cached day of the channel via `setQueriesData(['channel-epg', channelId])` — no refetch; the live gate re-derives reactively. A re-entry / date change re-fetches the EPG which comes back already flagged.

  `decision` on the EPG row is the client's **look-ahead for a clean stop**, NOT the security boundary — hard enforcement stays the CDN / signed-URL layer (a tampered client that ignores the flag still 403s on the restricted segments).

**Merged ads endpoint.** `GET /ads?channelId={id}` → `Ad[]` (one `CHANNEL_CHANGE` preroll + N `MID_ROLL`); `GET /ads` → the `APP_OPEN` ad. Replaces the two per-placement `getAd` calls (`useAdQuery` + `getAd` removed; `useAdsQuery` + `getAds`). `Ad` extends `AdCreative` with `placement` + (mid-roll only) absolute `startTime` + optional `validUntil`.

### Why these choices

- **STOMP, not Socket.IO/SSE.** Spring-native + reuses the existing admin STOMP auth interceptor; bidirectional (watch events up, ad/geo down) rules out SSE; Socket.IO needs a non-native Netty side-server.
- **Presence = the held connection.** A connected socket's ping/pong already tells the backend who's online — interval polling for presence would be redundant and costlier.
- **Ads = Option A.** Client timers distribute the fire (no 200k synchronized send-burst) and give accurate impressions; the timer cost is small and matches the existing EPG/now-program timer discipline.
- **Geo = Option B.** Geo is rights _enforcement_ — it must fire server-side (and can pair with an origin session-kill), not depend on a client timer a tampered client could ignore.
- **Cache-as-source-of-truth for ads.** One place holds the array; the screen + scheduler both read it, the socket mutates it via `setQueryData` — no divergence between a hook ref and the cache.

### Known gaps / open items

- ~~**Backend contract pending Henri's validation**~~ — **CONFIRMED 2026-07-06.** Merged `GET /ads` (always a JSON array, both contexts; key off each element's `placement`, not index — preroll not guaranteed present or at [0]); **absolute ISO `Instant` `startTime`/`validUntil`** on mid-rolls (converted server-side from a DB time-of-day band, anchored Europe/Tirane, today-only); `POST /ads/{id}/impression` → 204 (`placement` dropped, send `clientEventId`); geo brokered on both `/topic` + `/queue` (`enableSimpleBroker("/topic","/queue")`, user prefix `/user`) so `/user/queue/geo` delivers; `GeoBlockEvent`/`MidrollEvent`/placement casing all UPPER_SNAKE. **`deviceClass` is REQUIRED + case-sensitive on the two playback GETs (400 if omitted/lowercased)** — the WS handshake param is optional/lenient. Remaining infra caveat: prod `wss://` rides nginx TLS; `/ws` needs `Upgrade`/`Connection` proxied + `proxy_read_timeout ≥` the WS heartbeat (ops task — a connect-then-drop-after-~1min is that timeout). Simple broker is single-node (fine now; needs a relay/Redis for horizontal scale).
- ~~**`wss://` required in production**~~ — **resolved (verified 2026-07-30).** `API_BASE_URL` is `https://api.mcn-mw.com/api/v1/` (`api/client.ts`) and `WS_URL` derives from it via `replace(/^http/, 'ws')` (`realtime/events.ts`) → `wss://api.mcn-mw.com/ws`. Production builds additionally ship **no** cleartext exception (`ALLOW_CLEARTEXT = IS_DEV || IS_PREVIEW`, `app.config.ts` → no `NSAllowsArbitraryLoads`, `usesCleartextTraffic: false`), so a cleartext URL is blocked by the OS rather than sent in the clear. This is what backs the Play Data-safety **"encrypted in transit: Yes"** declaration. Dev/preview still use `ws://` via the cleartext exception. The nginx `Upgrade` / `proxy_read_timeout` work is a separate ops task — see the entry above.
- **`TextEncoder`/`TextDecoder`** — `@stomp/stompjs` needs both at runtime (frame encode/decode; we force binary frames — see below — so BOTH are on the hot path). Hermes ships `TextEncoder`, but `TextDecoder` has been unreliable/absent on RN (present in debug via the JS-debugger runtime, **missing in release** — the classic "works in debug, breaks in release" trap; stomp-js #149). A **guarded pure-JS fallback** (`src/polyfills.ts` → `fastestsmallesttextencoderdecoder`) installs whichever global is missing — a no-op where the engine provides one, a guaranteed shim where it doesn't. Imported as the **first statement** of the root `app/_layout.tsx` (an `eslint-disable simple-import-sort` keeps it pinned above all other imports). Pure JS, no native, EAS-safe.
- **RN NULL-byte chopping → binary/append flags (`client.ts`, 2026-06-29).** RN's `WebSocket` strips the trailing NULL that terminates every STOMP frame, silently corrupting the protocol (works in dev, flakes in release; stomp-js RN notes + #53/#89/#149). The client sets **`forceBinaryWSFrames: true`** (outgoing frames sent as binary so the NULL survives) + **`appendMissingNULLonIncoming: true`** (re-append the NULL the socket chops off incoming text frames — Spring's STOMP broker sends text by default). Safe for small unfragmented messages (ours are tiny JSON). We deliberately do **not** force the _broker_ to binary — broker-binary incoming can hit an Android "Cannot create URL for blob" error (stomp-js #546). `connectionTimeout: 10000` fails a stalled CONNECT on flaky mobile → retry after `reconnectDelay`.
- **Subscribe/watch re-fire on (re)connect (`useChannelRealtime`, 2026-06-29).** `subscribe()`/`publish()` are no-ops until the socket is connected, and on a cold channel-open the screen mounts before the CONNECT handshake completes (so the first subscribe was previously lost). The subscribe + watch-open effects now depend on `realtimeConnected`, so they (re)attach when the connection opens AND re-open the watch segment after a reconnect (RN drops the socket on background → server-side subscriptions are lost). `watch.end` stays keyed on `channelId` only (must not fire on reconnect).
- ~~**No live socket round-trip tested yet**~~ — **resolved (2026-07-08).** The backend is live; the app runs against real endpoints and real data (channels, EPG, guide, catch-up, radio, ads, realtime), manually verified on physical Android, iOS simulator, and Android TV emulator. Mock mode (`EXPO_PUBLIC_API_MODE=mock`) remains available for dev/CI — realtime events stay inert there since it has no STOMP server (the REST `GET /ads` seed still drives the mock mid-roll).
- **Foreground REST re-seed (2026-07-21).** The hook's foreground handler now also invalidates `['ads', channelId]` (alongside the existing clock re-eval) — backend doc §6 recommendation: topics have no replay, so a push that raced a background/network blip too short to drop the STOMP connection (and thus never trigger the reconnect reconciler) was otherwise lost until channel re-entry. Also picks up the next day's band occurrence on resume.
- **`fired-ids` are the replay guard** — per-mount state seeded from the module-level `shownMidrollIds` set (survives channel re-entry within an app session; reset on app restart). Keyed by ad `id` (globally unique) so they don't leak across channels; an ADD/UPDATE/REMOVE socket op re-arms the id (a real reschedule may show again).
- **Fix verified by unit tests only so far (2026-07-21)** — the open-window rule + boundary-timer behavior are covered in `realtime/__tests__/midroll.test.ts` + `hooks/__tests__/useChannelRealtime.test.tsx`; the on-device matrix (REST-seed future band, WS ADD future band, WS ADD mid-band clamp, background-across-boundary, REMOVE while pending/on-screen — `docs/fe-midroll-ads-response.md` §4) still needs a run against the live backend.

---

## Observability (crash / error monitoring)

### How it works today (built 2026-07-29 — closes 14.1 / 5.X.12 / 11.Y.6)

`@sentry/react-native` **7.11.0** — the version `expo install` pins for SDK 57
(`expo/bundledNativeModules.json` → `~7.11.0`). npm's latest is 8.20.0; **do not chase it**, the pin
is the SDK-compatible one. Several APIs the Sentry docs show are 8.x-only — see Known gaps.

- **`lib/monitoring.ts`** is the single `Sentry.init` site (in `lib/` because it is platform infra,
  beside `keychain.ts` / `tokenVault.ts` — not a domain API call). Armed from `app/_layout.tsx` at
  module scope in **its own guard, before** the `setupAuthRefresh` / `setupFocusManager` / `initI18n`
  block, so everything after it is reportable and a reporter failure cannot wedge boot.
- **DSN is public, auth token is secret.** The DSN only permits *writing* events and is hardcoded in
  `monitoring.ts` — same convention and rationale as `API_BASE_URL` in `api/client.ts` (one value,
  bundled identically for local / EAS / OTA, env surface stays honestly documented as
  `EXPO_PUBLIC_API_MODE` only). `SENTRY_AUTH_TOKEN` can publish releases to the org and lives in
  exactly one place — **`eas env` at `sensitive` visibility** — reaching EAS Build by injection and
  the local OTA upload via `eas env:exec`. It is never in the tree and never in `.env`. DSN abuse is
  answered by spike protection + rate limits on the Sentry project, not by hiding it.
- **EU region.** The org `acsolutions-1a` is on `ingest.de.sentry.io`. Every tool that talks to it —
  the config plugin, `sentry-cli`, `sentry-expo-upload-sourcemaps` — must use `https://de.sentry.io/`.
  An upload sent to `sentry.io` lands nowhere **with no error anywhere**; traces just stay minified.
- **Environments — derived from the BINARY, not from `extra` (reworked 2026-07-31).** `environment`
  comes from **`Application.applicationId`**'s suffix (`.dev` → development, `.preview` → preview,
  else production), mirroring `getVariantValues()` in `app.config.ts`. Without an environment split
  every build pools into one stream: simulator noise beside real user crashes, a meaningless
  crash-free rate, and "alert me on a new issue in production" becomes inexpressible.

  It originally read `extra.appVariant` (the same build-time → runtime mechanism as
  `extra.devicePlatform`). **That is wrong for this signal and must not be restored.** `extra` is not
  baked once at build time — it is whatever process minted the *current manifest* evaluated
  `app.config.ts` to, and `expo-constants` resolves
  `rawUpdatesManifest ?? rawDevLauncherManifest ?? rawAppConfig`, so a **dev server** or an **OTA
  update** manifest silently outranks the binary's own copy. Two processes routinely evaluate that
  config with `APP_VARIANT` unset — where `app.config.ts` falls back to `'production'`:
  - **Metro.** `npm start` (`package.json`, no `APP_VARIANT`; only `start:dev` sets it) served a
    `.dev` simulator build a manifest saying `production` → issue `REACT-NATIVE-RTSH-OTT-2` landed
    in the **production** stream on 2026-07-31. This is what prompted the rework.
  - **`eas update`.** It re-evaluates the config in its own process. A shell `VAR=x cmd1 && cmd2`
    prefix binds to `cmd1` **only**, so `APP_VARIANT=production npm run ota:export && … && eas update`
    left it unset on the publish itself — every OTA shipped `appVariant: 'production'` regardless of
    channel. Fixed by prefixing `eas update` directly in all nine `eas:update:*` scripts.

  A rejected alternative: flipping `app.config.ts`'s unset-default to `'development'`. It would have
  fixed the Metro case and **broken the production OTA case** — production users' crashes filed under
  `development`, i.e. invisible. It also fails open on `ALLOW_CLEARTEXT` (`IS_DEV || IS_PREVIEW`) and
  on Sentry's `disableAutoUpload: IS_DEV`. Reading the binary's identity fixes both cases and touches
  no native config. `app.config.ts` is deliberately **unchanged**.
- **PII is scrubbed on BOTH channels.** `beforeSend` scrubs the event; `beforeBreadcrumb` scrubs
  breadcrumbs, which Sentry collects *separately*. The second hook is not optional here — `client.ts`
  sets `Authorization: Bearer <token>` on every request and Sentry's default HTTP breadcrumb
  integration records request metadata, so a token reaches Sentry **past a flawless `beforeSend`**.
  Console breadcrumbs are dropped outright (the style guide bans committed `console.log`, so they are
  pure noise and the one place a stray token would surface). The deep scrubber **fails CLOSED**: at
  `MAX_SCRUB_DEPTH` it returns `[redacted]`, never the raw subtree. This is the ISO 27001
  "no credentials in logs" obligation enforced in code.
- **`sendDefaultPii: false`** — deliberate. Sentry's own docs example ships `true`; that is
  defensible (IP-geo + headers improve grouping) but this app holds auth tokens and carries a store
  data-safety declaration. Flipping it is a recorded decision and must be re-declared to
  `docs/PUBLISHING_AUDIT.md` (item 24.6, third-party SDK disclosure).
- **User context.** `store/createUserSlice.ts` is the single chokepoint: `setMonitoringUser(user.id)`
  on `login`, `clearMonitoringUser()` on `logout`. **Opaque account id only, never the email.**
  Without an identity Sentry cannot separate "one user hit this 400 times" from "400 users hit it
  once"; without the clear-on-logout a shared device (the living-room STB) attributes the next
  person's crashes to whoever signed in last.
- **Error boundary.** The existing expo-router `ErrorBoundary` in `app/_layout.tsx` now **reports and
  still shows the recoverable fallback**. The `Sentry.captureException` call is explicit because
  7.11.0 predates `Sentry.wrapExpoRouterErrorBoundary` and the Metro
  `autoWrapExpoRouterErrorBoundary` option (both 8.16+). expo-router *swallows* render errors, so
  without that call Sentry never sees them. The boundary stays otherwise dependency-free.
- **`Sentry.wrap(RootLayout)`** is required, not decorative: it installs the React error handler +
  `TouchEventBoundary` (touch breadcrumbs, rage-tap detection) and roots app-start spans.
- **Navigation instrumentation.** `reactNavigationIntegration({ enableTimeToInitialDisplay: true })`,
  bound in `RootLayoutNav` via `registerNavigationContainer(useNavigationContainerRef())`. A crash
  with no route attached is half a crash.
- **Tracing** is on at `__DEV__ ? 1.0 : 0.2`. `1.0` in production is a metered-spend bug — every
  transaction is billed. Replay, structured logging and profiling are **deliberately not enabled**
  (user decision 2026-07-29): replay is of limited value on a 10-foot TV UI and would expand the
  data-safety declaration.
- **`ignoreErrors`** filters only *known-transient* conditions this app already handles by design
  (offline `Network Error`, axios cancel on fast navigation, axios timeout). Do not extend the list
  without a written reason — an unexplained filter is how a real bug stays invisible for months.
- **Readable stack traces — three paths, all wired.**
  - *EAS Build* + *local release builds* (`expo run:* --variant release` / `--configuration Release`):
    the `@sentry/react-native/expo` config plugin generates the iOS build phase (dSYMs + JS maps) and
    applies the Android Gradle plugin (ProGuard mappings + Hermes `.hbc.map`). `disableAutoUpload` is
    `IS_DEV` — dev builds skip the wait, preview/production never do. Needs `SENTRY_AUTH_TOKEN` in
    the build environment, which EAS injects from `eas env` automatically.
  - *EAS Update (OTA)*: an OTA bundle is **new JS**, so it needs its own upload or every crash on
    OTA'd code is unreadable — precisely the code shipped fastest and tested least. Each
    preview/production `eas:update:*` script is `export → upload → publish`:
    `APP_VARIANT=x npm run ota:export && npm run ota:sourcemaps:<preview|prod> && APP_VARIANT=x eas update --skip-bundler …`.
    **Upload BEFORE publish, never after** — a failed upload must abort the `&&` chain rather than
    leave a live update whose crashes are unreadable. **`expo export --source-maps` is mandatory —
    the flag defaults to `false`**, and without it the uploader finds nothing and silently succeeds.
    The upload step pulls the token via `eas env:exec` (see Known gaps); dev scripts omit it.
  - Symbolication itself rides **Debug IDs** injected by `getSentryExpoConfig` in `metro.config.js`,
    so it does not depend on `release`/`dist` strings matching the uploaded artifact — historically
    the commonest "maps uploaded, traces still minified" cause.
- **Releases.** `release` = `applicationId@nativeApplicationVersion`, `dist` = `nativeBuildVersion`
  (both from `expo-application`) — used for release health, not symbolication. The OTA identity rides
  **tags** (`ota_update_id`, `ota_channel`, `app_variant`) rather than being folded into `dist`,
  because `runtimeVersion` policy is `appVersion`: two devices on the same binary can run different
  JS, and without the tag an OTA-introduced crash is indistinguishable from a store-build crash.
- **Jest.** `@sentry/react-native` is mocked in `jest.setup.ts`. This is not a native-module
  convenience — `createUserSlice.ts` imports the monitoring seam, so an un-mocked SDK would make the
  **test suite send events to the production project**: CI noise indistinguishable from real user
  crashes, plus quota spent on it.
- **The boundary.** `eas env` secrets → `docs`/EAS (Phase 21.1–21.12); OTA rollback on a bad release
  → `useOTA` + `eas update` (see CLAUDE.md); store data-safety **declarations** for the new SDK →
  `docs/PUBLISHING_AUDIT.md` 24.6. This section instruments; the audit declares.

### Known gaps

- **Symbol upload: PROVEN 2026-07-29** (was listed here as unproven; corrected against Sentry's own
  records). All four builds off commit `44d62b18` uploaded successfully — verified in Sentry, not
  inferred from a build log:
  - **JS source maps** for every build, under releases `1.0.0 (4)`/`(6)`/`(7)`/`(10)` with matching
    `Dist`. That the release strings line up is the load-bearing part: it means the string the SDK
    reports and the string the artifacts were uploaded under **agree**, which is the "empty release"
    trap avoided (nothing errors when they disagree — the release just silently holds no events).
  - **iOS native dSYMs** (`RTSHTANI`, `RTSHTANIPreview`, plus `React`/`libavif`), ~133 MiB each —
    the dyld / OOM / ANR frames that never reach the JS handler.
  - Implies two things that could not be checked statically: `SENTRY_AUTH_TOKEN` does reach the EAS
    builders, and the **EU regional `url`** is correct. A wrong region would have produced an empty
    Source Maps page with no error anywhere.
- **Event delivery: PROVEN 2026-07-31** (this bullet previously read "STILL UNPROVEN: no real event
  has been confirmed to land" — that is now stale; corrected against Sentry's own records, not
  inferred). Two issues exist in `acsolutions-1a/react-native-rtsh-ott`:
  - `REACT-NATIVE-RTSH-OTT-1` — `Error: PROVE-RTSH-OBSERVABILITY: verifying Sentry pipeline`,
    first seen **2026-07-30**, culprit `TouchableOpacity.props.onPress (src/app/_layout.tsx)`. The
    deliberate proof throw.
  - `REACT-NATIVE-RTSH-OTT-2` — `Invariant Violation: 'new NativeEventEmitter()' requires a non-null
    argument`, first seen **2026-07-31**. An unsolicited real error, i.e. the pipeline catches
    things nobody planted.

  Both carry local `/Users/...` culprit paths, so both came from a **dev** build — which also
  confirms `Sentry.init` has no `__DEV__` gate and dev events send tagged `environment: development`.
  What this does **not** yet prove: a **release**-build event (native crashes, TTID, slow/frozen
  frames need a native build — never Expo Go), and symbolication actually resolving against the
  uploaded maps on a store or OTA build. Sentry's "Set up the SDK" onboarding banner is gone now
  that events have arrived; if it ever reappears it reflects an empty project, NOT a misconfigured
  SDK, and **running the suggested wizard would overwrite this setup** with its defaults
  (`sendDefaultPii: true`, `tracesSampleRate: 1.0`, no `beforeSend`/`beforeBreadcrumb`).
- **Alerting is the Sentry default only — but the default is live.** The project has one
  auto-created issue rule ("Send a notification for high priority issues", id `728141`), and it
  **fired on 2026-07-31T10:55Z** for `REACT-NATIVE-RTSH-OTT-2` — so the notify path works end to
  end, not just the ingest path. Still missing: **zero metric alert rules**, so the two floor rules
  — *a new issue in the latest release* and *a crash-rate / volume spike* — do not exist. The
  default rule only catches what Sentry independently scores high-priority; a slow bleed across a
  bad release stays under it. These are **dashboard-only** (the Sentry MCP exposes
  `find_alert_rules` / `get_alert_rule` but no create), so they must be added by hand at
  `https://acsolutions-1a.sentry.io/alerts/new/`.
- **`beforeSend` does not see native crashes.** dyld / OOM / ANR bypass the JS layer entirely. They
  are protected by what never reaches native context, not by that hook.
- **Commit association is not wired.** Without linking the repo in Sentry, a crash cannot point at a
  suspect commit — the single biggest cut in time-to-diagnosis, and one `sentry-cli` step in the
  release flow.
- **OTA bundles on the PUBLISHER'S MACHINE — this shipped a mock bundle to preview once
  (2026-08-01).** `eas update` bundles locally (that is what `--skip-bundler` skips), so the
  publishing laptop's `.env` **and Metro cache** decide what devices receive. This bullet previously
  read *"safe today because `EXPO_PUBLIC_API_MODE` is the only env var the app reads"* — that was
  wrong, and it is precisely the var that caused the incident.

  **What happened:** a mock-mode `expo export` earlier that day populated Metro's transform cache.
  A later publish ran with `.env = dev` but reused the cached result, so the **mock** bundle went to
  the `preview` channel. `rm -rf dist` did not help — it removes the output, not the cache.

  **Proven by content hash, not inference:** a `mock` export and the published bundle shared the
  filename hash `entry-14130fd4…` while `dev`/`prod` exports produced `entry-c240202b…`; the
  published bundle also carried the fixture strings (`Radio Studentore`, …) and was ~22KB larger.
  A fixed export contains **zero** fixture strings.

  **Two independent defects, both fixed in `ota:export`:**
  1. **Metro's transform cache does not invalidate on an `EXPO_PUBLIC_*` change** → `--clear`.
  2. **The export inherited the publisher's `.env`** → the value is pinned inline
     (`EXPO_PUBLIC_API_MODE=prod expo export …`), which wins because dotenv does not override an
     already-set variable.

  **Rule: `.env` is a LOCAL toggle for `expo start` only. It must never decide what a published
  bundle contains.** Note the mock gate IS eliminated at bundle time when the value is not `'mock'`
  (that is why the size differs), so the decision is frozen into the artifact — there is no runtime
  recovery from publishing the wrong one. EAS **Build** was never affected: it runs on a clean
  machine with no `.env` (gitignored) and no warm cache. **If an EAS-only `EXPO_PUBLIC_*` var is ever
  added, the local-bundling gap returns** — revisit the update scripts then.
- **OTA symbolication pulls the token from `eas env` at publish time (reworked 2026-07-31).** The OTA
  chain's first two steps (`expo export --source-maps`, `sentry-expo-upload-sourcemaps`) run **on the
  developer's machine before `eas update` is ever invoked**, so nothing injects an EAS-side variable
  into them automatically. `ota:sourcemaps:preview` / `:prod` therefore wrap the uploader in
  **`eas env:exec <environment> '<cmd>'`**, which fetches the environment's variables and runs the
  command with them. `url`/`organization`/`project` come from the `@sentry/react-native/expo` plugin
  entry in `app.config.ts`, so the token is the only value that has to travel.

  **This requires `sensitive` visibility, and that was the whole bug.** While the var was `secret`,
  `env:exec` delivered **nothing**; after re-creating it as `sensitive` it delivers. Both directions
  proven with the same one-liner, not assumed:

  ```
  # while secret:
  $ eas env:exec preview 'test -n "$SENTRY_AUTH_TOKEN" && echo PRESENT || echo ABSENT'
  ABSENT

  # after re-creating as sensitive (2026-07-31):
  $ eas env:exec preview    …   →  PRESENT
  $ eas env:exec production …   →  PRESENT
  $ eas env:exec development …  →  ABSENT   ← correct: dev has no token and its scripts skip upload
  ```

  EAS states the rule itself in `env:exec`'s own output: *"Environment variables with visibility
  **Plain text** and **Sensitive** loaded from the … environment on EAS"* — `secret` is excluded by
  construction, because it *"can only be accessed on EAS builder and can't be read in any UI,
  **including on the website and in EAS CLI**"*, and `env:exec` is the CLI running locally.
  `sensitive` stays masked in the dashboard and obfuscated in logs, but is CLI-readable.
  **A `secret` var cannot be downgraded in place** — EAS cannot decrypt it either;
  `eas env:update --visibility sensitive` fails with *"type == SECRET can't be decrypted in any UI
  outside of EAS build environment"*. It must be **deleted and re-created** (dashboard or
  `eas env:set`) with the value re-supplied — rotate at Sentry if the original wasn't kept.

  **`ota:preflight` was deleted as redundant.** It existed to hard-fail before publishing an
  unsymbolicated bundle, but `expo-upload-sourcemaps.js` already does exactly that — it
  `process.exit(1)`s on a missing token (`scripts/expo-upload-sourcemaps.js:188-191`), so the `&&`
  chain stops before `eas update` runs. Letting the real uploader be the guard is a stronger
  guarantee than a proxy check that could drift from it. **Dev OTA scripts skip the upload entirely**
  (no token in the `development` environment, by design — matches `disableAutoUpload: IS_DEV`).

  **Status: the full chain RAN END TO END and PASSED, 2026-08-01** — first real
  `npm run eas:update:preview:ios`, against the live backend. Every link verified from the command's
  own output, not inferred:
  - `expo export --source-maps` produced the Hermes bundle + `.hbc.map`.
  - `eas env:exec` delivered the credential: *"Environment variables with visibility Plain text and
    Sensitive loaded from the preview environment on EAS: SENTRY_AUTH_TOKEN."*
  - Sentry accepted the upload — *"✅ Uploaded bundles and sourcemaps to Sentry successfully"*,
    debug id `c900b8bf-8a58-4f27-bf07-ed3d99b486fd`, org `acsolutions-1a`, EU region.
  - `eas update` published to branch `preview`, runtime `1.0.0`, update id
    `019fbdc9-e639-77fb-9be5-3d5320937a62`, commit `7886429`.

  **`Release: None` / `Dist: None` in the upload report is CORRECT, not a misconfiguration** — per
  Sentry's docs, *"uploaded source maps for updates have no associated releases, which is expected as
  updates can apply to multiple releases."* Symbolication rides the **Debug ID**, which is why the
  release/dist strings are irrelevant on this path (see "Symbolication itself rides Debug IDs" above).
  Do not "fix" this by forcing a release string onto the OTA upload.

  **On-device verification** uses the Settings → Version row, which appends `Updates.updateId`'s
  first 8 chars (`settings.tsx`). It is empty on the embedded bundle and shows the id once an update
  is applied, so `RTSH TANI 1.0.0 (019fbdc9)` is direct proof of *which JS the device is running* —
  otherwise two bundles look identical and "the update worked" is a guess. `useOTA` checks on
  **mount** and prompts a confirmation modal (fetch + `reloadAsync`), so a full app **force-close** is
  required to re-trigger it; backgrounding does not.
- **No credential lives in the tree — the "commit the token" plan was WITHDRAWN (2026-07-31).** An
  earlier decision this same day was to track `.env.sentry-build-plugin` in git, so a fresh clone of
  the private repo could publish an OTA with zero setup (the project is to live only on GitHub, with
  no local working copy). `eas env:exec` reaches that same goal without the credential ever entering
  git — publishing already requires `eas login`, so a clone that can publish can also read the var.
  The file was never created; it is **gitignored**, and the risks that plan had accepted are simply
  gone: no permanent git history, no "repo read ⇒ Sentry publish rights" for every collaborator and
  authorized GitHub App, no silent transfer at the RTSH credentials handover (contract Shtojca 5 §1),
  no standing **ISO 27001** finding for credentials at rest in source, no GitHub push-protection
  fight. **Invariant restored: there are ZERO credentials in the tree.** Signing keys stay on EAS,
  the refresh token stays in the keychain, `SENTRY_AUTH_TOKEN` stays in `eas env`. Residual exposure
  is the intended one — anyone with EAS project access can read a `sensitive` var, which is a
  smaller, revocable blast radius than git history. A further hardening, if ever wanted: run OTA
  publishes from GitHub Actions with the token as a repo secret, so no human machine reads it at all.
- **A secret can NEVER live in `.env`** (verified 2026-07-31). `@expo/env.load()` exports
  `EXPO_PUBLIC_*` variables **only** — a `SENTRY_AUTH_TOKEN=` line there is silently not loaded, and
  the uploader (`@sentry/react-native/scripts/expo-upload-sourcemaps.js`) falls through to
  `.env.sentry-build-plugin` or the shell. `.env` is tracked, but by construction it can only ever
  hold `EXPO_PUBLIC_*` values, which are inlined into every shipped bundle and are therefore already
  public. A secret placed there would both fail to work and leak.
- **`react-native-tvos` alias.** Sentry installed and resolved cleanly against the alias, and Android
  TV is plain Android to the SDK. Not yet exercised on a TV/STB device.
- **Spike protection / quota alerts** not configured on the Sentry project (dashboard-side).

## Upgrade log

Append-only, dated record of SDK/dependency upgrades — what moved, whether the native layer changed
(and therefore whether a new binary was required), and which layers were re-verified.

- **2026-07-29: Expo SDK 57 patch realignment — `expo` 57.0.2 → 57.0.8** (`expo-modules-core`
  57.0.2 → 57.0.7, 26 `expo-*` packages realigned, `react-native-screens` 4.25.2 → ~4.26.0,
  `jest-expo` → ~57.0.2). **Not an SDK-major** — stayed on SDK 57 throughout, so none of the
  React 19 / New Architecture / native-tabs / `expo-av` migrations applied.
  - **Motivation:** a **dyld `Symbol not found` `SIGABRT` at launch** on iOS (both iPad Pro 11" M5
    and iPhone 17 Pro, reproduced pre-fix). `expo-video@57.0.2`'s **precompiled** xcframework calls
    `AnyModule._decorateModule(object:in:)` (2-param, introduced in core 57.0.3) while the pinned
    core 57.0.2 exported the 3-param `(object:in:appContext:)`. Root cause was a **lagging `expo`
    patch**, not expo-video (already latest). Full mechanism + `nm` diagnosis recipe + escape
    hatches: `CLAUDE.md → Player`.
  - **Also fixed in the same pass:** `ios.supportsTablet: true` added to `app.config.ts`. The app
    had been shipping iPhone-only (`UIDeviceFamily = [1]`), so iPad ran it in compatibility mode and
    the window never reported tablet size — meaning the 2026-07-28 tablet layout pass was
    **unverifiable on iPad**. This closes `docs/PUBLISHING_AUDIT.md` item 13, which had predicted
    exactly this trigger ("ship `true` once the large-screen pass lands").
  - **Native rebuild required: YES.** `prebuild --clean` regenerated both native projects.
    **New binary + submit needed: YES — an `eas update` CANNOT deliver this** (the JS bundle assumes
    a native runtime the installed app doesn't have). `runtimeVersion` policy is `appVersion`
    (`#3 eas-setup` owns it), so a version bump is owed before the next preview/production release.
  - **Re-VERIFY:** `expo-doctor` 20/20 · `tsc --noEmit` clean · `expo lint` clean · **97/97 tests**.
    Per-skill `verify.sh`: `#3 eas-setup` ✅, `#10 tv` ✅; `#1 project-setup`, `#2 core-arch`,
    `#6 realtime`, `#8 lists-animations`, `#11 i18n` fail **only** on `format:check` (two files —
    `components/empty/ErrorState.tsx`, `features/auth/errors.ts` — confirmed **already unformatted
    on `main` pre-upgrade**, formatter versions unchanged ⇒ pre-existing debt, not a regression).
    Two further failures are **false positives against this project's documented design**:
    `#2`'s "single-flight appears nowhere in the source" (it lives inside `refreshAccessToken`, see
    → Auth flow 3) and `#6`'s "no `src/lib/realtime` seam" (this project uses `src/realtime/`).
  - **Device-verified** (preview variant, Release config): iPad Pro 11" M5 ✅ (full-screen, form
    capped+centered, free rotation), iPhone 17 Pro ✅, Pixel 6 API 33 ✅, `RTSH_Tablet_API33` ✅
    (1280×800dp → 3 columns portrait / 4 landscape, matching `GRID_COLUMNS`), `RTSH_TV_API34` ✅.
    All five launch clean against the live backend; zero crash reports post-upgrade.
  - **Known non-issue observed:** on **iPadOS 26 every iPad app is windowed and resizable** and
    `UIRequiresFullScreen` is deprecated (Apple TN3192) — apps open in a floating window and are
    maximized via the `•••` → green control. This is OS behavior, not a layout fault, and cannot be
    opted out of. The app already declares all four orientations, which Apple has signalled will
    become mandatory.
  - **Deliberately NOT done** (kept out so the crash fix stays attributable): registering the
    `expo-image` / `expo-status-bar` / `expo-web-browser` config plugins that `expo install --fix`
    suggested (doctor passes without them); `npm audit`'s 13 findings (11 moderate / 2 high) are all
    in `@expo/config-plugins` / `prebuild-config` / `metro-config` — **build-time-only chains**,
    which `STANDARDS.md §11` permits accepting with a written note; re-check at the next SDK upgrade.
