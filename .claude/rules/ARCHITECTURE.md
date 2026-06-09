# ARCHITECTURE.md — RTSH-OTT

Current state of each cross-cutting flow + rationale + known gaps. Updated as plan steps land. Read before answering "how does X work" or proposing changes to X.

This file complements (does not duplicate) CLAUDE.md. CLAUDE.md describes *what the project is and where files live*; this file describes *how flows behave today and why*.

---

## Auth flow

### How it works today (post 5.5a + 5.8 + 11.X.8)

1. **Boot** — `useBootstrap` calls `useCheckToken`. Three states: **(a)** no refresh token → unauthenticated; **(b)** refresh token **AND** persisted `user` → store flips to `isAuthenticated: true` with no network (offline-first fast path), and a background `refreshAccessToken()` is fired-and-forgotten so it never blocks splash; **(c)** refresh token **but no** `user` (MMKV wiped while keychain survived — e.g. iOS "Clear data" / reinstall) → boot hydrates over the network *before* resolving: `refreshAccessToken()` (its response already carries the user) → falls back to `getMe()` (`GET /users/me`) only if the refresh lacked one. Splash waits only in case (c); offline/rejected there falls through to `(auth)`. The common path (a/b) still boots offline instantly.
2. **Login** — mutation POSTs `/auth/login` via `apiClient`. On success: refresh token → keychain (`expo-secure-store`), user + access token → store via `login(user, accessToken)`.
3. **In-flight 401** — response interceptor in `src/api/client.ts` single-flights refresh through a **bare axios instance** (`refreshClient` in `services/auth.ts`) — bypasses the interceptor to prevent refresh-loop deadlocks. On success: retries the original request. On failure: fires `store.logout()`.
4. **Refresh failure semantics** — only 401/403 wipes the keychain. Network / DNS / 5xx errors return `null` without logout, so flaky connectivity doesn't sign users out.
5. **Logout** — `useAppStore.logout()` is async, single chokepoint: removes refresh token from keychain, clears store auth state. The logout mutation also `queryClient.clear()`s cached data.

### Why these choices

- **Offline-first boot.** OTT users open the app on subways, planes, hotel WiFi captives. Blocking the splash on a network round-trip is unacceptable. Keychain-only check resolves in ~0ms.
- **Bare axios for refresh.** The interceptor blindly retries 401s through `inflightRefresh`. If the refresh call *itself* returns 401, awaiting `inflightRefresh` would deadlock the function on itself. Bare instance side-steps the trap entirely.
- **Narrow logout trigger.** Original code wiped the keychain on every error — a subway commute could log a user out. Now only confirmed auth failures (401/403) clear the token.
- **Access token in memory, refresh token in keychain.** Standard mobile pattern. Access token is short-lived and ephemeral; refresh token justifies hardware-backed storage.

### Known gaps (tracked in plan.md)

- **One wasted 401 round-trip per cold boot.** Between `useCheckToken` resolving and the background refresh completing, the store has `isAuthenticated: true` but `token: null`. First real query hits 401, interceptor refreshes-and-retries. Acceptable trade for instant splash. Tracked: **5.X.5**.
- **MMKV plaintext.** Persisted `user` blob is unencrypted on disk. Tracked: **5.X.10**.
- **iOS keychain accessibility = `WHEN_UNLOCKED`.** Background radio playback can't read the refresh token while device is locked. Tracked: **5.X.11**.
- **No Zod validation at API boundary.** A backend `AuthResponse` shape change silently stores `undefined` as the access token. Tracked: **5.X.2**.
- **No domain-distinguishable errors in `useCheckToken`.** Returns `{ authenticated }` only — UI can't differentiate "no session" from "network failure" for smart retry UI. Tracked: **5.X.5**.
- **Parental PIN feature entirely absent** from the store + keychain. Spec-mandated v1. Tracked: **5.X.15**.

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

### How it works today

`src/app/_layout.tsx` renders `<QueryClientProvider>` → `RootLayoutInner`. `RootLayoutInner`:

1. Calls `useBootstrap()` → returns `{ isReady, isAuthenticated, network, ota }`.
2. Calls `useFonts(...)` → returns `[loaded, error]`.
3. Returns `null` (splash stays up) until `(loaded || error) && isReady`.
4. Calls `SplashScreen.hideAsync()` once both gates pass.

### Why these choices

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
| Refresh token, parental PIN hash | Keychain (`expo-secure-store`) | Hardware-backed, never in JS heap |
| User profile (`user`), settings, theme mode, T&C timestamp | MMKV (Zustand persist, **plaintext today**) | Fast sync read; persistence survives reinstalls per-platform behavior |
| Access token | In-memory only (Zustand) | Short-lived; survives only this app session |
| Server data (channels, EPG, catch-up) | TanStack Query cache | Coming with `queries/` layer |
| Resume positions per program | MMKV (separate key) | Frequent writes, no sync needed |

### Known gaps

- **MMKV plaintext** — tracked: **5.X.10**.
- **`user` blob unbounded** — whitelist fields once API contract is firm. Tracked: **5.X.17**.
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

## Update log

- **2026-06-01** — Initial doc. Captures state after Phase 5.5a audit fixes + Phase 5.8 `useBootstrap` (offline-first boot).
- **2026-06-09** — Added **Radio audio** section: store-driven `RadioAudioHost` above the router (22.11) — playback now survives navigation; routes/mini-player only mutate `PlayerSlice`.
