# ARCHITECTURE.md — RTSH-OTT

Current state of each cross-cutting flow + rationale + known gaps. Updated as plan steps land. Read before answering "how does X work" or proposing changes to X.

This file complements (does not duplicate) CLAUDE.md. CLAUDE.md describes *what the project is and where files live*; this file describes *how flows behave today and why*.

---

## Auth flow

### How it works today (post 5.5a + 5.8)

1. **Boot** — `useBootstrap` calls `useCheckToken` (keychain-only, no network). If keychain has refresh token AND persisted `user`, store flips to `isAuthenticated: true`. Background `refreshAccessToken()` is fired-and-forgotten — never blocks splash. App boots offline.
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

- **Module-level singleton:** `cached` state + `subscribers` Set + lazy `initialize()`. First subscriber kicks off:
  - `onlineManager.setEventListener` — bridges NetInfo into TanStack so queries pause offline and refetch on reconnect.
  - `NetInfo.addEventListener` — keeps `cached` state in sync, notifies React subscribers via `useSyncExternalStore`.
  - `NetInfo.fetch()` — primes the cache.
- Initial state: `isOnline: false`. Conservative default — prevents UI firing requests before NetInfo confirms.
- Mounted at root via `useBootstrap`.

### Why these choices

- **Module-level singleton.** Multiple component mounts share one NetInfo subscription + one `onlineManager` listener. Eliminates the leak from the original `useEffect`-per-mount pattern (CRITICAL P5#4 from audit).
- **`useSyncExternalStore`.** Correct React 19 primitive for external sources. Concurrent-mode safe, no tear between render and effect.

### Known gaps

- No offline banner UI yet (planned in Phase 6). Hook exposes state; component consumer pending.
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

## Update log

- **2026-06-01** — Initial doc. Captures state after Phase 5.5a audit fixes + Phase 5.8 `useBootstrap` (offline-first boot).
