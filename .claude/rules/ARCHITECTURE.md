# ARCHITECTURE.md — RTSH-OTT

Current state of each cross-cutting flow + rationale + known gaps. Updated as plan steps land. Read before answering "how does X work" or proposing changes to X.

This file complements (does not duplicate) CLAUDE.md. CLAUDE.md describes *what the project is and where files live*; this file describes *how flows behave today and why*.

---

## Auth flow

### How it works today (post 5.5a + 5.8 + 11.X.8 + swagger reconciliation 2026-06-12)

All routes live under `/api/v1` (prefix on the axios `baseURL`, route constants stay bare). Full endpoint contract: `docs/API.md → Authentication`.

1. **Boot** — `useBootstrap` calls `useCheckToken`. Three states: **(a)** no refresh token → unauthenticated; **(b)** refresh token **AND** persisted `user` → store flips to `isAuthenticated: true` with no network (offline-first fast path), and a background `refreshAccessToken()` is fired-and-forgotten so it never blocks splash (skipped when the store already holds a token — i.e. after case (c), which refreshed before resolving); **(c)** refresh token **but no** `user` (MMKV wiped while keychain survived — e.g. iOS "Clear data" / reinstall) → boot hydrates over the network *before* resolving: `refreshAccessToken()` for the access token, then `getMe()` (`GET /users/me`) for the user — the refresh response carries **no user** on the real contract. Splash waits only in case (c); offline/rejected there falls through to `(auth)`. The common path (a/b) still boots offline instantly.
2. **Login** — mutation POSTs `/auth/login { email, password }` via `apiClient` (the swagger accepts an optional `device` in the body; backend confirmed 2026-06-12 the client skips it — the separate `PUT /users/me/device` upsert fired by `useDeviceIdentity` when `isAuthenticated` flips true is enough). On success: refresh token → keychain (`expo-secure-store`), user + access token → store via `login(user, accessToken)`.
3. **In-flight 401** — response interceptor in `src/api/client.ts` calls `refreshAccessToken()` through a **bare axios instance** (`refreshClient` in `services/auth.ts`) — bypasses the interceptor to prevent refresh-loop deadlocks. The single-flight promise lives **inside `refreshAccessToken`** (2026-06-12, moved out of the interceptor) so every caller — interceptor and boot background refresh — shares one in-flight request; concurrent refreshes would become logout bugs the day the backend rotates tokens. On success: retries the original request. On failure: the interceptor **only rejects** — it never logs out. Logout fires solely inside `refreshAccessToken` on a confirmed 401/403, so a transient refresh failure (offline, timeout, 5xx) mid-session can't wipe the keychain.
4. **Refresh — NO rotation (backend decision 2026-06-12).** `POST /auth/refresh { refreshToken }` returns `{ accessToken }` only; the refresh token is static until expiry, so the keychain copy is never rewritten and on success only the in-memory access token updates (`useAppStore.setState({ token })`). Trade-off accepted: replay of a stolen refresh token is undetectable (rotation would catch it); revocation still works via logout / logout-others. Failure semantics unchanged: only 401/403 wipes the keychain; network / DNS / 5xx errors return `null` without logout, so flaky connectivity doesn't sign users out.
5. **Logout** — the mutation reads the keychain refresh token and POSTs `/auth/logout { refreshToken, logoutOtherDevices? }` best-effort (the refresh token identifies *which session* to revoke; `logoutOtherDevices: true` revokes all; defaults `false`). `useAppStore.logout()` stays the async single chokepoint for the local wipe: removes refresh token + PIN cache from keychain, clears store auth state; the mutation also `queryClient.clear()`s cached data.
5b. **Change password** — `POST /users/me/change-password { oldPassword, newPassword, logoutOtherDevices? }` (authenticated screen, opened from Settings → Account). Unlike `/auth/refresh`, this **ROTATES the refresh token** and returns a fresh `{ accessToken, refreshToken }`, so `useChangePasswordMutation` rewrites the keychain copy + swaps the in-memory access token (`updateUserSlice({ token })`); `user` is unchanged. `logoutOtherDevices` folds the "sign out everywhere else" option into the same call — there is no separate logout-others endpoint. Errors map by stable `code` (`auth.invalid_old_password`, `auth.password_unchanged`) via `authErrorMessage(err, _, codeMap)`.
5c. **Profile sync (cross-device)** — `useMeQuery` (mounted once in `useBootstrap`) refetches `GET /users/me` on **app foreground** (`refetchOnWindowFocus` + the `setupFocusManager` AppState→`focusManager` bridge), **reconnect**, and a **5-min active-only poll** (`refetchIntervalInBackground: false`), mirroring the bare `UserDTO` into the store. This is how a parental change (or any profile change) made on one device reaches the others without sockets. Deliberately **not** tied to access-token refresh: the 401 interceptor refreshes on a hot path, and a profile GET there would couple auth to a needless round-trip. Real-time enforcement during active playback is a server concern (playback decision / heartbeat), not this advisory sync.
6. **Register** — single-shot: `POST /auth/register` carries ALL profile data (email, username, password, birthDate, city, country, gender, `termsAccepted` — wire name; the client's form keeps `acceptTerms`, mapped at the service boundary) and emails an OTP; `POST /auth/register/verify { email, code }` activates the account and returns tokens → **auto-login** (same persistence path as login). `confirmPassword` never leaves the client.
7. **Password reset** — `POST /auth/forgot-password { email }` (always 202) → `POST /auth/reset-password/verify { email, code }` → `{ resetToken }` (one-time) → `POST /auth/reset-password { resetToken, newPassword }` → success `notify` modal + `router.replace` to login (no stale wizard in the back stack). No reset-resend endpoint: re-firing forgot-password replaces the live code.

### Why these choices

- **Offline-first boot.** OTT users open the app on subways, planes, hotel WiFi captives. Blocking the splash on a network round-trip is unacceptable. Keychain-only check resolves in ~0ms.
- **Bare axios for refresh.** The interceptor blindly retries 401s through the shared refresh promise. If the refresh call *itself* returned 401 through `apiClient`, the interceptor would await its own refresh and deadlock. Bare instance side-steps the trap entirely.
- **Narrow logout trigger — enforced in ONE layer.** Original code wiped the keychain on every error — a subway commute could log a user out. Now only confirmed auth failures (401/403) clear the token, and that decision lives exclusively inside `refreshAccessToken`. (Fixed 2026-06-12: the interceptor used to `logout()` on *any* null refresh result, which re-introduced the subway bug for transient failures during a 401-retry cycle — callers must treat `null` as "no token this attempt", never as a logout signal.)
- **Access token in memory, refresh token in keychain.** Standard mobile pattern. Access token is short-lived and ephemeral; refresh token justifies hardware-backed storage.
- **Why two tokens at all, when the user never logs out?** (Decided 2026-06-10.) Session length is set by the *refresh* token's lifetime (~30–60 d), not by having two tokens — a single token could live as long. The split buys two things that a long session makes *more* valuable, not less: **(1) blast radius** — the access token rides every API + stream request, so it's the one most likely to leak (logs, Sentry, a proxy, a CDN edge); keeping it short-lived (~15–30 min) makes a leaked copy near-worthless, whereas a single long-lived token on every wire stays valid for weeks if leaked once. **(2) revocation** — a stateless access JWT is validated by signature alone (no DB hit) but cannot be un-issued; you revoke the *refresh* token (opaque, server-side) to kill a session on logout-all / password-change / fraud, and the session dies at the next access expiry. A single token forces a choice between statelessness and revocability. Net: dual = stateless fast-path (access) + revocable cold-path (refresh). ~~The refresh rotates on every use~~ — **superseded 2026-06-12:** the backend chose a static refresh token (no rotation; see "Refresh — NO rotation" above), so replay detection is off the table; revocation remains.
- **Zod at the auth boundary (22.14d, reshaped 2026-06-12).** `login` / `register-verify` parse through `authResponseSchema`, `refresh` through `refreshResponseSchema`, `getMe` / `updateProfile` through `userDtoSchema` (`types/domain.ts`) before any token reaches the keychain or the store. `userDtoSchema` validates the wire `UserDTO` **and transforms it to the domain `User`** in one parse (int64 id → string, `username` → `displayName`, `birthDate`/`city`+`country` → `age`/`location`, enums lowercased). All user-bearing endpoints now return the **bare** shape (no `{ user }` envelope) — the old envelope-mismatch trap is gone.

### Known gaps (tracked in plan.md)

- **One wasted 401 round-trip per cold boot.** Between `useCheckToken` resolving and the background refresh completing, the store has `isAuthenticated: true` but `token: null`. First real query hits 401, interceptor refreshes-and-retries. Acceptable trade for instant splash. Tracked: **5.X.5**.
- **MMKV plaintext — accepted risk (5.X.10, decided 2026-06-10).** Not encrypting: real secrets are keychain/memory-only; the blob is low-sensitivity PII. See Persistence boundaries → Known gaps for the full rationale + invariant.
- **iOS keychain accessibility = `WHEN_UNLOCKED`.** Background radio playback can't read the refresh token while device is locked. Tracked: **5.X.11**.
- ~~**No Zod validation at API boundary.**~~ **Resolved for auth in 22.14d** (`authResponseSchema`/`userDtoSchema`). Remaining for the other domain services. Tracked: **5.X.2 / 11.Y.5**.
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
  - `Appearance.addChangeListener` in `useBootstrap` for runtime OS toggles.
- **Toggle:** `toggleTheme` cycles `system → light → dark → system`. Direct mode selection via `setTheme(mode)`.

### Why these choices

- **No ThemeProvider.** Zustand selector subscription is already O(1) and skips re-renders that don't touch `colors`. Adding a Context provider would duplicate that mechanism.
- **Full `colors` object on the slice (not just `mode`).** Lets components access `s.colors.background` directly without going through a derived selector. Toggle swaps the object reference, triggering re-renders only for subscribers that read `colors`.
- **`Appearance.addChangeListener` lives in `useBootstrap`.** Single mount point with cleanup. Slice can't subscribe to RN APIs without coupling the store to platform.

### Known gaps

- Missing semantic tokens (`overlay`, `disabled`, `onSurface`, `link`, `focus`, `skeleton`) — **5.X.6**.
- Missing `SHADOWS`, `OPACITY`, `Z_INDEX`, `ANIMATION` token files — **5.X.7**.
- `BORDERRADIUS` missing `pill`, `full`, `none` — **5.X.7**.
- `SPACING.space_10` + `space_28` off the 4px grid — **5.X.8**.
- Current `lightTheme` / `darkTheme` values are reasonable defaults but will need full replacement when design lands.

---

## Boot / Splash gate

### How it works today (post splash redesign 2026-06-12)

Three visual phases, all brand-black:

1. **Native splash** (`expo-splash-screen` config in `app.config.ts`) — shows the logo from frame zero. iOS: full lockup at `imageWidth: 160` (same size/position as the JS clone → invisible handoff). Android: the square RTSH mark at 128dp, because Android 12+ constrains the splash icon to a ~192dp circle that would butcher the wide lockup (128dp square → ~181dp diagonal, fits uncropped). Android's handoff is a deliberate mark → lockup swap.
2. **`BrandedSplash`** (JS) — lockup + red progress bar. `RootLayoutInner` renders it instead of the router until boot completes; its first `onLayout` fires `SplashScreen.hideAsync()` so the native → JS swap has no gap. The bar is indeterminate (eases to ~90%) while booting; when `(fontsLoaded || fontError) && isReady` it fills to 100% and fires `onComplete`.
3. **Router** — mounts only after the 100% fill lands (`splashDone`).

Boot gates: `useBootstrap()` (`isReady` — keychain check) + `useFonts` (Inter). Native rebuild required when the splash config changes (config-plugin output).

### Why these choices

- **Logo at frame zero (2026-06-12, supersedes the 2026-06-11 transparent-icon decision).** The previous setup showed pure black natively and the logo only once JS mounted; the user chose to surface the brand immediately, accepting the Android mark → lockup swap.
- **Two gates only — fonts + keychain check.** Both essentially instant. No network blocking.
- **`QueryClientProvider` wraps the inner layout** so `useBootstrap` (which uses `useCheckToken` → TanStack Query) has a client in scope.
- **OTA does NOT gate splash.** OTA failures must never block boot. Updates apply on next foreground via `Updates.reloadAsync()`.
- **Network does NOT gate splash.** Offline-first.

### Known gaps

- Font load failure is silently swallowed (`(loaded || error)` gates equally on success and failure). With no Sentry, font load failures are invisible. Tracked: **5.X.12** (Sentry init).
- No error boundary at root. A render-time exception in any tab crashes the whole app. To bake into Phase 6 UI work.

---

## Network state

### How it works today (post 5.5a + 5.8)

`src/hooks/useNetworkReconnect.ts`:

- **`useNetworkMonitor`** — one NetInfo listener for the whole app, mounted once at root via `useBootstrap` (RTSH `useNetworkMonitor` pattern). On each change it:
  - bridges NetInfo into TanStack `onlineManager` (queries pause offline, refetch on reconnect),
  - mirrors connectivity into the store via `updateNetworkSlice({ isOnline, connectionType })` — components read `useAppStore((s) => s.isOnline)`; the cellular gate reads `connectionType`,
  - opens the `noInternet` modal on disconnect and closes it on reconnect.
- **Online = `isConnected && (isInternetReachable ?? true)`** — captive-portal safe.
- **Modal copy owned by `ModalWrapper`** (i18n), so the listener passes no text. Auto-close on reconnect is an improvement over RTSH (which leaves the modal up).
- **Store default `isOnline: true`** (optimistic) — avoids a false "offline" flash before NetInfo's first report.
- **Why not a singleton + `useSyncExternalStore`?** Earlier this was a module-level singleton so it could be mounted by many components without leaking. But it's mounted once at root and the Zustand store is already a shared subscribable source — so `isOnline` lives in `NetworkSlice` and the singleton machinery was removed as over-engineering (2026-06-05).

### Why these choices

- **Mounted once at root, not per-component.** A single NetInfo subscription + one `onlineManager` listener, owned by `useBootstrap`. This eliminates the leak from the original `useEffect`-per-mount pattern (CRITICAL P5#4 from audit) without needing module-level singleton machinery — root is the only mount, so there is nothing to deduplicate.
- **Store as the shared source.** Connectivity lives in `NetworkSlice`; any component reads it via `useAppStore((s) => s.isOnline)`. Zustand is already a concurrent-safe subscribable store, so a hand-rolled singleton + `useSyncExternalStore` would only duplicate what the store provides (removed 2026-06-05).

### Known gaps

- No offline **banner** UI (the unused `OfflineBanner` component exists). Currently offline is surfaced via the `noInternet` modal triggered from the listener; a persistent banner is optional/future.
- Data screens show an empty list offline (no skeletons yet). The live screen no longer spins forever offline (loader gated on `isOnline`); skeleton loaders are tracked for the data-screen polish pass.
- No cellular-data gate UI (spec mandates a confirmation modal before playback over cellular when `cellularPlaybackAllowed === false`). Setting field exists; gate UI tracked for the player phase.

---

## Persistence boundaries

| Data | Storage | Why |
|---|---|---|
| Refresh token | Keychain (`expo-secure-store`) | Hardware-backed, never in JS heap |
| User profile (`user`), settings, theme mode, T&C timestamp, **device parental config (`parentalEnabled` + `parentalPin`)** | MMKV (Zustand persist, **plaintext by design** — see decision below) | Fast sync read; persistence survives reinstalls per-platform behavior |
| Access token | In-memory only (Zustand) | Short-lived; survives only this app session |
| Server data (channels, EPG, catch-up) | TanStack Query cache | Coming with `queries/` layer |
| Resume positions per program | MMKV (separate key) | Frequent writes, no sync needed |

### Known gaps

- **MMKV plaintext — accepted risk, won't encrypt (decided 2026-06-10, 5.X.10).** Real secrets are keychain-only (refresh token) or memory-only (access token); the MMKV blob holds only low-sensitivity PII (email / displayName / subscription tier) + boolean settings, and the OS sandbox blocks other apps from reading it. Encryption would only defend a physical-device-compromise + file-extraction scenario, leaking non-credential data — not worth the async-boot refactor. **Invariant (amended 2026-06-15):** never persist a real *credential* into this plaintext blob (keep auth tokens in keychain). The device parental `pin` (in `ParentalSlice`) is a deliberate exception — it's content gating, not a credential (see Parental control), so plaintext persistence is acceptable for it specifically. The lightweight guard is the `user` field-whitelist (5.X.17), not encryption.
- **`user` blob unbounded** — whitelist persisted fields (`{ id, email, displayName, … }`) once the API contract is firm, so a future sensitive `User` field can't silently land in plaintext. Tracked: **5.X.17** (this is the chosen mitigation in place of encryption).
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

- **Background-while-locked needs entitlements** (iOS `UIBackgroundModes:['audio']`, Android `foregroundServiceType`) — the JS is ready; tracked **5.X.13** (+ dev-client rebuild).
- **No lock-screen now-playing metadata** (expo-audio SDK 56 doesn't expose `NowPlayingInfo`) — tracked on `RadioPlayer` history.
- **No radio-EPG source** — the player's programme section shows only a live-now row until a schedule endpoint lands.

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
- **Verify is a local compare.** `ParentalPinModal mode="verify"` checks `pin === parentalPin` — no network, no hashing. This is what makes the frequent live re-checks (22.14c) free.
- **Gating keys on `parentalEnabled`.** Adult content (`channel/program.isAdult`) is gated **only when `parentalEnabled` is true** — a user who never set a PIN sees adult content ungated (their choice). `needsPin` and `useLiveParentalGuard`'s `enabled` both AND-in `parentalEnabled`. Settings/Profile/channel read `useAppStore((s) => s.parentalEnabled)`.
- **Hydration is automatic.** `parentalEnabled` + `parentalPin` are in the persist `partialize`, so the gate is known before any network on warm boot — no separate flag to seed, no dependency on a user payload.
- **Live program-level re-check (22.14c).** A clean live channel can roll into an 18+ programme mid-watch, so `useLiveParentalGuard(channelId)` watches today's EPG and re-gates on the transition. It derives the airing adult programme from a `nowTs` timestamp held in state (render stays pure), arms a single `setTimeout` to the next programme edge that chains boundary→boundary, and re-evaluates on app-foreground (RN timers throttle while backgrounded). On entry to an `isAdult` programme the player unmounts (no A/V leak) and the verify modal shows; cancel stays blocked with a re-unlock affordance; resolution is once-per-`programId`. Verification is the local compare (no network per boundary). The guard is disabled for already-adult channels (the channel-level gate covers those). VOD/catch-up keeps a single open-time check.

### Why these choices

- **Content gating, not a credential.** A 4–6 digit PIN that only blocks adult-flagged content isn't a real secret; the threat model is a curious child on a shared device, not an attacker. So it lives entirely client-side, verification is a local compare, and there's no keychain cache, no hashing, and no server round-trip. **Boundary:** never reuse this PIN to gate anything that matters (purchases, account changes).
- **Device-level, not account-level (2026-06-16).** The gate protects *this device's* viewing, regardless of who is signed in — so it's owned by the device (MMKV), not the account. It persists across logout/login and is intentionally NOT synced across a user's devices (each device sets its own PIN). Simpler than the account model and matches how a shared living-room device is actually used.
- **Content-level, not app-entry.** The PIN gates adult-flagged content (channel/program `isAdult`), not app launch — the `(auth)`/`(app)` guard is separate and keys on `isAuthenticated` only. A FaceID/PIN app-lock is a deliberately deferred, separate gate.

### Known gaps

- **Change-PIN / forgot-PIN deferred.** Change-PIN would extend `ParentalPinModal` (verify old → set new); forgot-PIN on a device-level client-only PIN means a local reset flow (UI not built). No backend involvement either way.
- **Per-device by design — no sync.** A user with multiple devices sets the PIN separately on each. Intentional (device-level), not a defect, but worth stating: a change on one device does not propagate.
- **Geo trigger is the `geoBlocked` flag**, not the live CDN `451` — tracked **15.2 / 11.X.9**.
- **Catch-up/VOD program-level gate** — `program/[id]` gates at channel level (22.14) but not yet on a recorded programme's own `isAdult`. Live is covered (22.14c); a single open-time check for VOD is a small follow-up.

---

## Device identity & request headers

### How it works today (11.X.10)

- **Pure module + one-shot hook.** `utils/device.ts` (no React) owns all "what device is this" facts; `useDeviceIdentity()` is the single wiring point, mounted once in `useBootstrap` next to `useNetworkMonitor` — removing that mount disables the feature. The hook resolves `buildDeviceHeaders()` and stamps them onto `apiClient.defaults.headers.common`.
- **Headers on every API request:**
  - `X-Device-Id` — app-generated `Crypto.randomUUID()`, persisted in **keychain** (`rtsh.device_id`), module-cached after first read. Keychain (not MMKV) because on iOS it survives reinstall — a reinstalled device keeps its identity instead of leaving a ghost entry in the backend's device registry. Android: keychain wipes on uninstall → reinstall = new ID (accepted; the spec only requires per-install stability).
  - `X-Device-Platform` — `getDevicePlatform()`: build-time `extra.devicePlatform` override first (`APP_PLATFORM=androidstb` — operator STBs are runtime-indistinguishable from retail Android TV), else `Platform.isTV` → `androidtv`, else `Platform.OS`. `tizen`/`webos` exist in the contract but are separate web apps.
  - `X-App-Version` — `Application.nativeApplicationVersion` (expo-application). The **native binary** version, not the OTA/JS version — 426 drives a store update, so the binary is what the backend compares.
  - `Authorization` + `Accept-Language` — dynamic pair, set per-request in the interceptor (`client.ts`). Accept-Language reads the **store locale** (user-switchable in settings), never the device locale.
- **426 Upgrade Required** — response-interceptor branch ahead of the 401 logic: opens the blocking `forceUpdate` modal (new `ModalSlice` type; `ModalWrapper` owns the `update.*` copy + default CTA `openStoreListing()` — Android `market://details?id=<applicationId>`; iOS pending store ID). The modal never dismisses: backdrop + Android back are disabled and the CTA doesn't close it.
- **`GET /app/version?platform=…`** — unauthenticated version gate (`getAppVersion`, `services/config.ts`). Store builds rely on 426 instead; sideloaded `androidstb` builds poll it on boot and self-update via `downloadUrl`.
- **Device registration (`PUT /users/me/device`, 11.X.11; route/method reconciled against the swagger 2026-06-12)** — `useDeviceIdentity` also watches `isAuthenticated`; whenever it flips true (login, register completion, or cold boot with an existing session) it fire-and-forgets `registerDevice(buildDeviceRegistration())` — body is the **bare** `DeviceInfoDTO` `{ deviceKey, type, model, operatingSystem, appVersion }` (no `{ device }` envelope). One send per app session — `isAuthenticated` flips true exactly once (at boot *or* at login, never both). `deviceKey` is **the same keychain UUID as `X-Device-Id`** (one identity everywhere); `type` is the form-factor enum (`PHONE_ANDROID`, …) from `getDeviceType()` (expo-device `deviceType` + `Platform.OS`, STB build-flag wins first); failures are swallowed (metadata, never auth). Backend upserts on `(userId, deviceKey)`, so re-sends are harmless and app/OS updates refresh the registry on the next boot. Not re-sent on foreground resume — device facts can't change while the process is alive.

### Why these choices

- **Identity is static; layout is not.** Platform, version, and device ID never change at runtime — so this is a pure module + a one-shot boot stamp, not reactive state. Screen-size/form-factor *layout* decisions stay on `useWindowDimensions` per-component (22.18) and are deliberately outside this module.
- **Headers at the API layer only.** The backend picks the stream manifest/ABR ladder at the `/streams` call, where the headers are present. CDN segment/key requests carry no app headers by design (see gaps).

### Known gaps

- **Boot race:** a request fired before the keychain read resolves (~ms) lacks the `X-Device-*` headers; backend must treat them as optional metadata, not auth. Fix if ever needed: async request interceptor awaiting a memoized `buildDeviceHeaders()` promise.
- **iOS store URL placeholder** — `IOS_APP_STORE_ID` is empty until the App Store listing exists (Phase 24); the iOS 426 CTA is a no-op until then.
- **STB self-update orchestration not built** — endpoint + service exist; the boot check/download/install flow lands with the TV pass (22.18) on the `androidstb` build.
- **CDN requests carry no device headers** — if edge-level per-device enforcement is ever needed, it rides signed playback URLs (15.2 geo contract), not headers.
- **`DeviceType` enum ✅ confirmed** from the OpenAPI `DeviceInfoDTO` (2026-06-12) — client values match exactly. **No device cap** (confirmed 2026-06-12): neither the PUT nor `PlaybackDecisionDTO` carries a device-limit error — the registry is metadata only.

---

## Update log

- **2026-06-01** — Initial doc. Captures state after Phase 5.5a audit fixes + Phase 5.8 `useBootstrap` (offline-first boot).
- **2026-06-09** — Added **Radio audio** section: store-driven `RadioAudioHost` above the router (22.11) — playback now survives navigation; routes/mini-player only mutate `PlayerSlice`.
- **2026-06-10** — Auth-flow review (22.14d): documented the **dual-token rationale** (why access+refresh even with always-on sessions), added **Zod at the auth boundary** + the `getMe` envelope fix, and added the **Parental control** section. Refreshed the stale "PIN absent" / "no Zod" gaps. **Decided 5.X.10: MMKV encryption is an accepted risk (won't encrypt)** — secrets are keychain/memory-only; field-whitelist (5.X.17) is the chosen lightweight guard.
- **2026-06-10** — Parental **live re-check (22.14c)**: added `useLiveParentalGuard` (boundary-timer + foreground re-eval) to the Parental control section; live programme transitions now re-gate. Closed the "live re-check" gap; added a VOD-program-gate follow-up note.
- **2026-06-12** — Added **Device identity & request headers** section (11.X.10, backend header spec 2026-06-11): keychain `X-Device-Id`, build-time STB platform override, 426 `forceUpdate` blocking modal, unauthenticated `/app/version` gate. Contract seeded into `docs/API.md`.
- **2026-06-12** — **Device registration (11.X.11):** `POST /devices` upsert (`deviceKey` = `X-Device-Id` UUID, expo-device form-factor enum) fired from `useDeviceIdentity` whenever `isAuthenticated` flips true — login, register completion, cold boot with session. Fire-and-forget, failures swallowed. Contract + open questions added to `docs/API.md`.
- **2026-06-12** — **Splash redesign:** native splash now shows the logo from frame zero (iOS lockup / Android square mark per the 12+ circle constraint), superseding the transparent-icon decision of 2026-06-11; `splash-transparent.png` removed. Rewrote the Boot/Splash section with the three-phase handoff (native → `BrandedSplash` → router).
- **2026-06-12** — **Auth reconciled against the live swagger** (`/v3/api-docs/end-user`; decisions agreed with backend): `/api/v1` base prefix; refresh returns access token only (**no rotation** — superseded the rotating-refresh rationale; no user in the response → manual-wipe recovery always hits `getMe`); logout POSTs `{ refreshToken }`; register is single-shot (all profile data + `acceptTerms`) → OTP verify auto-login; password reset rides a one-time `resetToken`, success replaces the route to login; `UserDTO` validated+mapped via `userDtoSchema` transform; `/users/me` is bare (no envelope); `DeviceType` enum confirmed from `DeviceInfoDTO`; mock server now mirrors the wire contract, also intercepts `refreshClient`, and rejects 4xx like real axios. Contract table: `docs/API.md → Authentication`.
- **2026-06-12** — **Refresh hardening (auth-flow trace review):** single-flight promise moved from the 401 interceptor into `refreshAccessToken` itself, so the interceptor and the boot background refresh share one in-flight request (concurrent refreshes were harmless only because the token is static). Fixed the interceptor logging out on *any* null refresh result — transient failures (offline/5xx) during a 401-retry no longer wipe the session; logout fires only inside `refreshAccessToken` on confirmed 401/403. Boot background refresh is now skipped when the manual-wipe recovery path already hydrated the token (was a duplicate round-trip).
- **2026-06-12** — **Second swagger pass (auth scope):** register wire field is `termsAccepted` (client keeps `acceptTerms` in the form/schema; mapped at the service boundary next to the gender transform). Device registration moved to **`PUT /users/me/device`** with a **bare `DeviceInfoDTO`** body (was `POST /devices` + `{ device }` envelope) — backend confirmed the optional `device` field in the login/register-verify bodies is unnecessary for this client. `DeviceType` enum confirmed to match the client exactly. Mock handler + `docs/API.md` synced.
- **2026-06-15** — **Parental control simplified (product decision):** the PIN is content gating, not a credential, so it now rides on the **user object** (`user.parentalPin = { enabled, pin }`, persisted in plaintext MMKV) instead of a keychain `SHA-256` verifier + server KDF. Verify is a local string compare; gating keys on `enabled`; the keychain cache, `hashPin`/`verifyPin` usage, `verify-pin`/`DELETE` endpoints, and the `isPinSet`/`setIsPinSet` slice state were removed. v1 wires **`POST /parental` only** — disable / change-PIN / forgot-PIN are deferred (Settings switch locks once enabled). Persistence-boundary invariant amended to allow the `pin` as a documented plaintext exception. `userDtoSchema`, mock handlers, and `docs/API.md` synced. `utils/crypto.ts` (`hashPin`/`verifyPin`) deleted — no consumer left. `parentalPin.pin` is `string | null` (enabled-but-unset case).
- **2026-06-15** — **Account self-service + cross-device sync (auth/parental/`/me`/device scope, swagger reconciliation):** (1) **Change password** — `POST /users/me/change-password` returns a **rotated** `{ accessToken, refreshToken }`; `useChangePasswordMutation` rewrites the keychain + access token; new authenticated screen `app/(app)/change-password.tsx` (RHF+zod) opened from Settings → Account; `logoutOtherDevices` flag folds in "sign out everywhere" (no separate endpoint). `authErrorMessage` extended with a `code`-keyed map. (2) **Parental disable/toggle built** — Settings switch now drives `POST /parental { enabled, pin }` (create) and `PATCH /parental { enabled }` (toggle, no `currentPin` — local verify before disable); supersedes the "switch locks once enabled" gap. (3) **Cross-device profile sync** — new `useMeQuery` + `setupFocusManager` (AppState→`focusManager`) refetch `GET /users/me` on foreground / reconnect / 5-min active poll → store, so one device's change reaches others without sockets; explicitly NOT bolted onto the 401-refresh hot path. (4) `logout` now sends `{ refreshToken, logoutOtherDevices }`; `educationLevel` mapped in `userDtoSchema`; `tokenPairSchema` added. Mocks + `docs/API.md` + `CLAUDE.md` synced. Playback/EPG/channels/ads reconciliation deferred to a later pass.
- **2026-06-16** — **Parental control → device-level, client-only (product decision):** the PIN is no longer account-level / backend-synced. It moved off the user object into `ParentalSlice` (`parentalEnabled` + `parentalPin`, MMKV-persisted via `partialize`), and **all backend involvement was removed**: deleted `setParentalPin`/`updateParental` services, `useParentalMutations`, the `PARENTAL` endpoint, the `/parental` mock handlers + `fixtures/parental.ts` + `userWithPin`, and `parentalPin` from `User`/`userDtoSchema` (the `ParentalPin` type too). `setParentalConfig` moved from `UserSlice` to `ParentalSlice`; `ParentalPinModal` set-mode now stores locally; Settings/Profile/channel read `s.parentalEnabled`; verify is `pin === parentalPin`. The PIN now survives logout/login and is intentionally **not** synced across devices (per-device by design). Supersedes the 2026-06-15 user-object model. `CLAUDE.md`, this file, and `docs/API.md` synced.
