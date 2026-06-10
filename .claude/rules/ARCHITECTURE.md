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
- **Why two tokens at all, when the user never logs out?** (Decided 2026-06-10.) Session length is set by the *refresh* token's lifetime (~30–60 d), not by having two tokens — a single token could live as long. The split buys two things that a long session makes *more* valuable, not less: **(1) blast radius** — the access token rides every API + stream request, so it's the one most likely to leak (logs, Sentry, a proxy, a CDN edge); keeping it short-lived (~15–30 min) makes a leaked copy near-worthless, whereas a single long-lived token on every wire stays valid for weeks if leaked once. **(2) revocation** — a stateless access JWT is validated by signature alone (no DB hit) but cannot be un-issued; you revoke the *refresh* token (opaque, server-side, rotating on use) to kill a session on logout-all / password-change / fraud, and the session dies at the next access expiry. A single token forces a choice between statelessness and revocability. The refresh rotates on every use (`authRefresh.ts`), so a replayed old token signals theft. Net: dual = stateless fast-path (access) + revocable cold-path (refresh). We'd only collapse to one token if the backend insisted on stateful DB-checked sessions anyway — and the backend is ours to define, so we keep dual.
- **Zod at the auth boundary (22.14d).** `login` / `refresh` / `getMe` / `updateProfile` / register-completion parse their response through `authResponseSchema` / `userSchema` (`types/domain.ts`) before any token reaches the keychain or the store. A malformed payload (missing token, wrong envelope) is rejected at the edge instead of silently persisting `undefined`. The users endpoints return `{ user }` while the auth endpoints return the bare shape — the services unwrap accordingly (a prior `getMe` envelope bug had broken the manual-wipe recovery path).

### Known gaps (tracked in plan.md)

- **One wasted 401 round-trip per cold boot.** Between `useCheckToken` resolving and the background refresh completing, the store has `isAuthenticated: true` but `token: null`. First real query hits 401, interceptor refreshes-and-retries. Acceptable trade for instant splash. Tracked: **5.X.5**.
- **MMKV plaintext — accepted risk (5.X.10, decided 2026-06-10).** Not encrypting: real secrets are keychain/memory-only; the blob is low-sensitivity PII. See Persistence boundaries → Known gaps for the full rationale + invariant.
- **iOS keychain accessibility = `WHEN_UNLOCKED`.** Background radio playback can't read the refresh token while device is locked. Tracked: **5.X.11**.
- ~~**No Zod validation at API boundary.**~~ **Resolved for auth in 22.14d** (`authResponseSchema`/`userSchema`). Remaining for the other domain services + envelope unification. Tracked: **5.X.2 / 11.Y.5**.
- **No domain-distinguishable errors in `useCheckToken`.** Returns `{ authenticated }` only — UI can't differentiate "no session" from "network failure" for smart retry UI. Tracked: **5.X.5**.
- ~~**Parental PIN feature entirely absent.**~~ **Built (22.14 / 22.14b):** per-account, backend source-of-truth + keychain cache. See the **Parental control** section below.

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
| User profile (`user`), settings, theme mode, T&C timestamp | MMKV (Zustand persist, **plaintext by design** — see decision below) | Fast sync read; persistence survives reinstalls per-platform behavior |
| Access token | In-memory only (Zustand) | Short-lived; survives only this app session |
| Server data (channels, EPG, catch-up) | TanStack Query cache | Coming with `queries/` layer |
| Resume positions per program | MMKV (separate key) | Frequent writes, no sync needed |

### Known gaps

- **MMKV plaintext — accepted risk, won't encrypt (decided 2026-06-10, 5.X.10).** All real secrets are keychain-only (refresh token, parental PIN verifier) or memory-only (access token); the MMKV blob holds only low-sensitivity PII (email / displayName / subscription tier) + boolean settings, and the OS sandbox blocks other apps from reading it. Encryption would only defend a physical-device-compromise + file-extraction scenario, leaking non-credential data — not worth the async-boot refactor. **Invariant:** never persist a real secret into this plaintext blob (keep tokens/PIN in keychain). The lightweight guard is the `user` field-whitelist (5.X.17), not encryption.
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

### How it works today (post 22.14 / 22.14b / 22.14d)

- **Per-account, backend is the source of truth.** The PIN belongs to the account, not the device, so the same login on a second device is already gated. `setParentalPin` → `POST /users/parental-pin`; `clearParentalPin` → `DELETE`. The backend stores it under a slow KDF + per-user salt and owns server-side attempt lockout. The raw 4-digit PIN travels only over TLS — correct for a low-entropy secret (10⁴), since shipping a fast hash to new devices would be trivially crackable.
- **Keychain is a local cache, never MMKV.** After the first successful verify on a device, the PIN verifier (`SHA-256 + salt`, `hashPin`) is cached in keychain (`PARENTAL_PIN_KEY`) so the frequent live re-checks (22.14c) and offline gating don't round-trip. The PIN value is **never** put in the MMKV `user` blob (plaintext on disk).
- **Verify is local-first.** `ParentalPinModal` checks the keychain cache first; only a *fresh* device with no cache hits the backend verify once, then caches. The store (`ParentalSlice`) holds only `isPinSet` + failed-attempt/lockout UX state (5-try client lockout layered on the authoritative server one).
- **`isPinSet` hydration.** The backend returns `parentalPinSet: boolean` on the auth/`getMe` payload; `login()` seeds `ParentalSlice.isPinSet` from it, and `isPinSet` is itself persisted — so the gate is known before any network on a warm boot, and accurate on a fresh device.
- **Disabling requires the PIN (22.14d).** Turning the gate off in Settings launches `ParentalPinModal mode="verify"`; only a correct PIN runs `clearParentalPin()` + keychain wipe + `clearPin()`. Otherwise a child could bypass the control by flipping the switch. Turning it on uses `mode="set"` (enter + confirm).
- **Live program-level re-check (22.14c).** A clean live channel can roll into an 18+ programme mid-watch, so `useLiveParentalGuard(channelId)` watches today's EPG and re-gates on the transition. It derives the airing adult programme from a `nowTs` timestamp held in state (render stays pure), arms a single `setTimeout` to the next programme edge that chains boundary→boundary, and re-evaluates on app-foreground (RN timers throttle while backgrounded). On entry to an `isAdult` programme the player unmounts (no A/V leak) and the verify modal shows; cancel stays blocked with a re-unlock affordance; resolution is once-per-`programId`. Verification is local against the keychain cache (no network per boundary). The guard is disabled for already-adult channels (the channel-level gate covers those). VOD/catch-up keeps a single open-time check.

### Why these choices

- **Backend-authoritative, not local-only.** The user requirement is cross-device: a PIN set on a phone must already gate the tablet. Local-only keychain can't sync, so the backend owns the truth and the keychain is a performance/offline cache on top.
- **Content-level, not app-entry.** The PIN gates adult-flagged content (channel/program `isAdult`), not app launch — the `(auth)`/`(app)` guard is separate and keys on `isAuthenticated` only. A FaceID/PIN app-lock is a deliberately deferred, separate gate.

### Known gaps

- **Geo trigger is the `geoBlocked` flag**, not the live CDN `451` — tracked **15.2 / 11.X.9**.
- **Catch-up/VOD program-level gate** — `program/[id]` gates at channel level (22.14) but not yet on a recorded programme's own `isAdult`. Live is covered (22.14c); a single open-time check for VOD is a small follow-up.
- **Backend KDF + lockout policy** are backend-owned; the client only needs the typed verify result + `parentalPinSet`. Reconcile endpoint shapes at **11.X.9**.

---

## Update log

- **2026-06-01** — Initial doc. Captures state after Phase 5.5a audit fixes + Phase 5.8 `useBootstrap` (offline-first boot).
- **2026-06-09** — Added **Radio audio** section: store-driven `RadioAudioHost` above the router (22.11) — playback now survives navigation; routes/mini-player only mutate `PlayerSlice`.
- **2026-06-10** — Auth-flow review (22.14d): documented the **dual-token rationale** (why access+refresh even with always-on sessions), added **Zod at the auth boundary** + the `getMe` envelope fix, and added the **Parental control** section. Refreshed the stale "PIN absent" / "no Zod" gaps. **Decided 5.X.10: MMKV encryption is an accepted risk (won't encrypt)** — secrets are keychain/memory-only; field-whitelist (5.X.17) is the chosen lightweight guard.
- **2026-06-10** — Parental **live re-check (22.14c)**: added `useLiveParentalGuard` (boundary-timer + foreground re-eval) to the Parental control section; live programme transitions now re-gate. Closed the "live re-check" gap; added a VOD-program-gate follow-up note.
