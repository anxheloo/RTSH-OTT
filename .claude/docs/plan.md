# plan.md — RTSH-OTT Build Plan

Step-by-step plan to build the RTSH TANI mobile prototype. Each step = one Claude Code session.

> Full reference: `../outputs/2026-05-26-rtsh-mobile-prototype-roadmap.html` — open in browser, copy prompt seeds from there into Claude Code as needed.

> **Testing strategy:** Use `npx expo run:android` for local testing throughout all phases. EAS cloud builds, device registration, and store submission are deferred to Phase 21 after the app is feature-complete.

## Plan entry format (per `anxheloo-task-plan-executor`)

Each completed step carries enough context that a future session can reconstruct *what was built, why, the trade-offs accepted, and what's still owed.*

- `[x]` = fully done. `[~]` = partially done / deferred. `[ ]` = not started.
- New `[x]` entries follow: **What** / **Why** / **How** / **Confidence** / **Trade-offs & known gaps** / **Carry-overs**.
- New `[~]` entries follow: **Deferred because** / **What we need to proceed** / **Suggested approaches (when unblocked)**.
- Steps completed before this convention (Phases 0–4, most of 5) keep their terse one-liners. Future re-touches will rewrite the entry in the new format.

---

## Phase 0 — Tooling & Init

- [x] **0.1** Install local toolchain (Node 20 LTS, Watchman, Xcode 16+, Android Studio + API 34, JDK 17, CocoaPods). Verify with `npx expo-doctor`. ✅ Node 20.20.2, all tools verified, 21/21 expo-doctor checks pass.
- [x] **0.2** Bootstrap project: `npx create-expo-app@latest . --template default`. Set scheme `rtshtani`, bundle id `al.rtsh.tani`. Reset template boilerplate. Install `expo-dev-client`. ✅ SDK 56, RN 0.85.3, strict TS, path aliases done.
- [x] **0.3** `eas login` + `eas init`. `app.config.ts` with `APP_VARIANT` variants. `eas.json` with development / preview / production profiles. ✅ Project ID wired, `simulator-ios` profile added.
  - **Known gaps:** [MEDIUM] `APP_VARIANT === 'production'` branch is implicit fallback in `getVariantValues()` — unknown variants silently routed to prod values. Fix when adding `staging` or similar: explicit `IS_PROD` check + throw on unknown, or `Record<variant, values>` lookup.
- [x] **0.8** ESLint + Prettier: `npx expo lint` → bootstrap. Add `eslint-plugin-simple-import-sort`. `.prettierrc` (singleQuote, semi, 100, trailingComma all).
  - **Known gaps:** [MEDIUM] `eslint.config.js` is CJS (`require()`). Works today but fragile if any plugin drops CJS. Fix when `eslint-config-expo` ESM-ifies: rename to `.mjs` + convert to `import` syntax. Also move `ignores` to first config entry for ESLint v9 best practice.
- [x] **0.9** `src/config/env.ts` — zod-validated env reader. Boot crashes on missing required vars. `.env` file with `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_API_MODE`, `EXPO_PUBLIC_ENV`.

> Steps 0.4 (cloud dev builds), 0.5 (Expo MCP), 0.6 (Figma MCP) deferred to Phase 21.

---

## Phase 1 — Project Structure

- [x] **1.1** Create full folder tree per `STYLE_GUIDE.md`. Empty `index.ts` barrels in place.
- [x] **1.2** Verify path aliases resolve: test import `import x from "@/utils/x"` compiles clean.
- [x] **1.3** Write `README.md` (commands + env var matrix).

---

## Phase 2 — Theme

- [x] **2.1** `src/theme/fonts.ts` — `Fonts`, `FONTSIZE`, `FONTWEIGHT`. Load via `useFonts` in `_layout.tsx`. ✅ Outfit family (9 weights), SplashScreen wired.
  - **Known gaps:** [MEDIUM] `FONTWEIGHT` has per-value `as const` casts AND an outer `as const` — the per-value ones are redundant; drop. [LOW] `FONTWEIGHT` missing `'800'` between `'700'` and `'900'`. [INFO] `_layout.tsx` swallows font-load errors silently; revisit alongside Sentry init (5.X.12).
- [x] **2.2** `src/theme/borders.ts` — `BORDERRADIUS` const. ✅ radius_8/12/14 as const.
- [x] **2.3** `src/theme/spacing.ts` — `SPACING` (4px base). ✅ space_2 → space_64 as const.
- [x] **2.4** `src/theme/colors.ts` — `ThemeColors` interface + `lightTheme` + `darkTheme` (15 semantic tokens). ✅ Placeholder palette: RTSH-red primary, OLED-friendly dark theme. Swap brand hex when official.
  - **Known gaps:** [HIGH] missing semantic tokens (`overlay`, `disabled`, `onSurface`, `link`, `focus`, `skeleton`) — tracked as **5.X.6**. [LOW] `src/types/theme.ts` is an empty stub; canonical location split between `theme/colors.ts` and `types/theme.ts` — pick one when re-doing tokens for the real design.
- [x] **2.5** `src/store/createThemeSlice.ts` — `mode` + `colors`, `toggleTheme`, `setTheme(mode)`. ✅ Added `'system'` mode; pulled `zustand` install forward from 3.1.
  - **Reworked by 5.5a:** original `'system'` mode was broken — initial state hardcoded `lightTheme`, `onRehydrateStorage` ignored `'system'`, and `toggleTheme` permanently dropped `'system'` (2× CRITICAL + 1 HIGH from audit). Now: lazy `resolveColors('system')` via `Appearance.getColorScheme()` at init + rehydrate, `toggleTheme` cycles three-way `system → light → dark`. Runtime `Appearance.addChangeListener` lives in 5.8 `useBootstrap`.

---

## Phase 3 — Store, Storage & Providers

- [x] **3.1** `npm i react-native-mmkv` (zustand installed in 2.5). ✅ react-native-mmkv@4.3.1 via expo install.
- [x] **3.2** `src/store/storage.ts` — MMKV instance, `zustandStorage` adapter, `clearAppStorage`. ✅ STORAGE_KEYS lives in `src/constants/storage.ts` (Phase 1).
  - **Reworked by 5.5a:** `clearAppStorage()` now takes explicit `keys: readonly string[]` instead of `mmkv.clearAll()` — original would have nuked resume positions + future query persist on logout (MEDIUM finding).
  - **Known gaps:** [HIGH] MMKV is unencrypted (`createMMKV()` no key) — tracked as **5.X.10**.
- [x] **3.3** `src/store/createUserSlice.ts` — user, token, isAuthenticated, login/logout. ✅ No app-lock (RTSH doesn't gate app entry; parental PIN only gates adult content).
  - **Reworked by 5.5a:** `logout()` is now async + single chokepoint (wipes keychain + store atomically). Dead `setUser`/`setToken` exports removed. Slice typed `StateCreator<AppStore, [], [], UserSlice>` for cross-slice type safety. Resolves MEDIUM `isAuthenticated` desync + HIGH cross-slice typing findings.
- [x] **3.4** `src/store/createSettingsSlice.ts` — minimal: locale, tcAcceptedAt. ✅ Other fields deferred until design lands.
  - **Reworked by 5.5a:** added spec-mandated stubs `cellularPlaybackAllowed`, `backgroundVideoAllowed`, `autoplayEnabled`, `dataSaverEnabled`, `hapticsEnabled` with defaults + persistence. Unblocked 5.7 `useHaptic`.
  - **Known gaps:** parental PIN feature still entirely absent (`parentalEnabled`, `setParentalPin`, `verifyParentalPin`, `PARENTAL_PIN_KEY`) — spec-mandated v1, tracked as **5.X.15**.
- [~] **3.5** `src/store/createPlayerSlice.ts` — **To check after design.** Likely split: drop global video state (local + MMKV for resume), keep small `createRadioSlice` for cross-screen radio mini-player + background audio. Decide once design lands.
- [x] **3.6** `src/store/createModalSlice.ts` — modal stack (`apiError | noInternet | notify | confirmation`). ✅ Stack-based (multiple modals queueable), payload-driven for generic rendering by `ModalWrapper` later.
  - **Reworked by 5.5a:** `closeModal` rewritten with functional `set` (no more `get()` + stale-modals race). Slice typed `StateCreator<AppStore, [], [], ModalSlice>`.
  - **Known gaps:** [LOW] modal IDs use `Date.now() + Math.random()` — extremely low collision odds but not crypto-random. If a future scenario fires `openModal` in a tight loop (e.g. network-reconnect storms), swap to `crypto.randomUUID()` or a module-level counter.
- [~] **3.7** `src/store/createChannelsSlice.ts` — **To check after API contract + design.** Likely TanStack Query (server-synced) or MMKV hook (client-only). Slice probably wrong abstraction.
- [~] **3.8** `src/store/createEpgSlice.ts` — **To check after design.** Likely MMKV-backed hook + expo-notifications scheduling, not a slice (only add/remove actions).
- [x] **3.9** `src/store/useAppStore.ts` — compose User/Settings/Theme/Modal slices, persist via MMKV with `partialize`, `onRehydrateStorage` re-applies theme colors. Channels/EPG/Player slices deferred (3.5/3.7/3.8).
  - **Reworked by 5.5a:** `partialize` extended with the 5 new settings fields. `onRehydrateStorage` now calls `resolveColors(state.mode)` so `'system'` mode rehydrates correctly (previously fell through, leaving stale colors — CRITICAL).
  - **Known gaps:** [MEDIUM] persisted `user` blob is unbounded — whatever backend returns gets written to disk. Whitelist fields (`id`, `email`, `displayName`) once API contract is firm — tracked as **5.X.17**. [LOW] `onRehydrateStorage` swallows corruption silently; add Sentry breadcrumb (depends on 5.X.12).
- [x] **3.10** `src/services/keychain.ts` — `storeOnKeychain`, `getFromKeychain`, `removeFromKeychain`. ✅ expo-secure-store installed + plugin wired in app.config.ts. Added `src/config/auth.ts` with `REFRESH_TOKEN_KEY`.
  - **Known gaps:** [MEDIUM] `SecureStore` calls don't pin `keychainAccessible` — defaults to `WHEN_UNLOCKED` on iOS. Background radio playback can't read the refresh token while device is locked — tracked as **5.X.11**. [LOW] `auth.ts` exports `REFRESH_TOKEN_KEY` as a bare const (no `as const`, no `KEYCHAIN_KEYS` group). Wrap when parental PIN key lands (**5.X.15**).
- [~] **3.11** Native deps `react-native-keyboard-controller`, `react-native-gesture-handler`, `@gorhom/bottom-sheet` — **To check after design.** Install + provider wiring depends on whether bottom-sheets are used and keyboard UX choices. (expo-secure-store already installed in 3.10.)

---

## Phase 4 — API Layer

- [x] **4.1** `npm i axios @tanstack/react-query`. `src/api/client.ts` — `apiClient` + `queryClient` (staleTime 5min, gcTime 10min, retry 1 non-401, no refetchOnFocus on RN). ✅ axios@1.16.1, TanStack v5.100.14.
  - **Known gaps:** [MEDIUM] single 15s timeout for all requests — stream manifests need 3-5s, bulk EPG may need longer. Tracked as **5.X.4**.
- [x] **4.2** Request interceptor injects token from store. Response interceptor: single-flight refresh on 401 → retry → logout on fail. ✅ Decoupled via `registerRefreshHandler()` — auth mutation layer (4.6) wires the actual refresh logic. Rewritten by **5.5a** (H2 fix — bare axios for refresh, prevents loop deadlock) + **5.8** (offline-first boot — `void store.logout()` on terminal refresh failure).
  - **Known gaps:** [MEDIUM] `inflightRefresh` cleared in `.finally()` — a second 401 arriving microseconds after settle could start a second refresh racing token rotation. Low practical risk; revisit if backend rotation makes it observable. [LOW] `registerRefreshHandler(null)` signature accepts null but never used; tighten when adding tests.
- [x] **4.3** `src/api/endpoints.ts` — route constants for all resources (AUTH, USERS, CHANNELS, EPG, CATCHUP, RADIO, STREAMS, CONFIG). ✅ Placeholder paths — confirm against backend contract when delivered.
  - **Reworked by 5.5a:** `EPG_ROUTES.BY_DATE(date)` template interpolation replaced with `LIST: '/epg'` + axios `params: { date }` — proper URL encoding.
  - **Known gaps:** [LOW] `USERS_ROUTES.ME` and `UPDATE_PROFILE` are the same path string differentiated only by HTTP verb. Drop `UPDATE_PROFILE` and use `ME` for the PATCH; or add a comment documenting intent.
- [x] **4.4** `src/api/services/` — all 8 service files scaffolded (auth, users, channels, epg, catchup, radio, streams, config). ✅ auth/users/streams have typed request+response.
  - **Reworked by 5.5a:** `users.updateProfile` payload tightened to `UpdateProfilePayload = Partial<Pick<User, 'displayName' | 'avatarUrl'>>` (no accidental PATCH of `id`/`email`). Auth uses bare `refreshClient` instance for `/auth/refresh`.
  - **Known gaps:** [HIGH] channels / epg / catchup / radio / config return `Promise<unknown>` — tracked as **5.X.1** (domain types) + **5.X.2** (Zod at API boundary). [INFO] missing file-level JSDoc on 5 service files (small style nit).
- [~] **4.5** `src/api/queries/` — **Defer** until services are real-typed (contract-dependent). Building queries on `unknown` adds no value.
- [x] **4.6** `src/api/mutations/` — auth mutations done (login, register, logout, forgotPassword). ✅ `authRefresh.ts` exports `setupAuthRefresh()` which wires `registerRefreshHandler` from 4.2. Other mutations (updateProfile, etc.) deferred until services typed.
  - **Reworked by 5.5a:** `refreshAccessToken` narrowed catch to 401/403 (transient errors no longer wipe keychain). `useLogoutMutation` logs non-auth server errors in `__DEV__`. Wired into app via 5.8 `useBootstrap` (replaces the original "manual `setupAuthRefresh` call needed" note).
- [x] **4.7** `src/api/index.ts` — barrel re-export.
  - **What:** added `export * from './services'` to the barrel (already exporting `client`, `endpoints`, `mutations`). `queries/` still empty; will be added when domain types land (**5.X.3**).
  - **Why:** consumers import from `@/api` rather than reaching into subfolders. Closes the last `[ ]` in Phase 4.
  - **Confidence:** Lints + tsc clean; no service exports collide. [CERTAIN]
  - **Trade-offs / known gaps:** None.
  - **Carry-overs:** add `export * from './queries'` when 5.X.3 lands.
- [~] **4.8** MSW handlers + fixtures — **Defer** until API contract lands (no contract = no realistic fixtures).

---

## Phase 5 — Core Hooks

- [x] **5.1** `useCheckToken` — boot auth check. **Rewritten by 5.8:** keychain-only, no network (offline-first boot). Sets `isAuthenticated: true` optimistically when `(keychain has refreshToken) && (persisted user exists)`. Explicit `refetchOnWindowFocus: false`. Background `refreshAccessToken()` is fire-and-forgotten from `useBootstrap` once authenticated.
- [x] **5.2** `useAppState` — exposes app foreground/background transitions via options object `{ onForeground, onBackground, onChange }`. Only fires on actual `active ↔ background/inactive` transitions, not every status tick.
  - **Known gaps:** [LOW] JSDoc could use structured `@param options.onForeground` / etc. tags — currently prose only.
- [x] **5.3** `useOTA` — `expo-updates`. **Rewritten by 5.5a:** returns `Updates.useUpdates()` directly; dropped racing imperative `checkForUpdateAsync` call (Expo runtime auto-checks per `checkAutomatically` config — running both raced two state machines). Caller decides when to apply (`Updates.reloadAsync()`). No-op in dev (`Updates.isEnabled === false`). Mounted at root by 5.8 `useBootstrap`.
- [x] **5.4** `useNetworkReconnect` — `@react-native-community/netinfo`. **Rewritten by 5.5a:** module-level singleton + `useSyncExternalStore`; `onlineManager` bridged exactly once (CRITICAL listener-leak fix). Initial `isOnline: false` (safer default than original `true`). Mounted at root by 5.8 `useBootstrap`. Returns `{ isOnline, isInternetReachable, type }` for OfflineBanner / cellular gate (Phase 6+).
- [x] **5.5** `useOrientation` + `useLockOrientationOnMount` — `expo-screen-orientation`. `useOrientation` returns coarse `portrait | landscape | unknown`. `useLockOrientationOnMount(lock?)` locks on mount, unlocks on unmount (default `LANDSCAPE`). **Refactored by 5.5a** to `useSyncExternalStore` with module-level singleton subscription.
  - **Known gaps:** [MEDIUM] `lockAsync` / `unlockAsync` errors are silently swallowed — unavoidable on iPad split-view / some Android OEMs, but JSDoc doesn't document the silent-fail contract. Add `__DEV__` breadcrumb once Sentry lands (**5.X.12**).
- [x] **5.5a** Audit-driven fixes (Critical/High that don't need design or backend contract).
  - `.env` untracked + gitignored (CRITICAL P0).
  - `app.config.ts`: removed broken `ios.icon` path + legacy `extra.router`.
  - Theme `'system'` mode wired end-to-end: lazy `resolveColors('system')` via `Appearance.getColorScheme()` in slice init, rehydration uses same resolver, `toggleTheme` cycles `system → light → dark` (2× CRITICAL P2).
  - Auth surface (H2/H3/H4 + Phase 3 MEDIUMs):
    - Refresh uses bare `refreshClient` axios instance — no interceptor loop.
    - `useAppStore.logout()` is async, wipes keychain + store atomically (single chokepoint).
    - `refreshAccessToken` only wipes keychain on 401/403; transient network errors return `null` without logout.
    - Removed dead `setUser`/`setToken` exports from UserSlice.
    - `useLogoutMutation` logs non-auth server errors in `__DEV__`.
  - Hooks (CRITICAL P5):
    - `useNetworkReconnect` → `useSyncExternalStore` with module-level singleton; `onlineManager` wired exactly once; no listener leak. Initial `isOnline: false` (safer default).
    - `useOrientation` → same pattern.
    - `useOTA` simplified to `Updates.useUpdates()` only — Expo runtime auto-checks per `checkAutomatically` config; no racing imperative call.
  - Store typing: all 4 slices use `StateCreator<AppStore, [], [], OwnSlice>` for cross-slice type safety.
  - `createModalSlice.closeModal` rewritten with functional `set`; `clearAppStorage()` now takes an explicit `keys: readonly string[]` to avoid nuking unrelated MMKV data.
  - `SettingsSlice` extended with spec-mandated stubs: `cellularPlaybackAllowed`, `backgroundVideoAllowed`, `autoplayEnabled`, `dataSaverEnabled`, `hapticsEnabled` (defaults set, persisted in `partialize`). Unblocks 5.7 `useHaptic`.
  - `endpoints.EPG_ROUTES.LIST` + axios `params` (was `?date=${date}` interpolation).
  - `users.updateProfile` payload tightened to `UpdateProfilePayload = Partial<Pick<User, 'displayName' | 'avatarUrl'>>` (no more accidental PATCH of `id`/`email`).
- [ ] **5.6** `useKeyboard` — wraps `react-native-keyboard-controller`. `[~]` deferred per existing decision.
- [x] **5.7** `useHaptic` — `expo-haptics`, respects `settings.hapticsEnabled`.
  - **What:** new hook `src/hooks/useHaptic.ts` exposes a stable object `{ light, medium, heavy, success, warning, error, selection }` mapping to `Haptics.impactAsync` / `notificationAsync` / `selectionAsync`. When `hapticsEnabled === false`, every method is a silent no-op. Native errors are swallowed (best-effort UX). Memoized on `hapticsEnabled`.
  - **Why:** spec mandates haptics with a user-toggleable setting. Centralizing through one hook gives consumers a stable API (no need to know expo-haptics imports), unblocks UI components to fire haptics without sprinkling `if (settings.hapticsEnabled)` everywhere, and lets us swap the haptic engine later without touching call sites.
  - **Confidence:**
    - Stable identity across renders unless the setting flips. [HIGH]
    - `Haptics.selectionAsync` is the right primitive for picker/scrub feedback (vs `impactAsync`). [HIGH]
    - Not validated on a real device. [MEDIUM — would raise to HIGH by: running on a physical iPhone/Android and confirming each style produces distinguishable feedback.]
  - **Trade-offs / known gaps:**
    - Haptics fired during background or when device is locked can throw on some Android OEMs — we swallow to keep the call site clean. Fix options (future): 1) `__DEV__ console.warn` swallowed errors when Sentry lands; 2) skip when `useAppState` reports background.
    - No throttling. Rapidly firing `selection()` on a fast scrubber could over-trigger. Add a debounce wrapper at call sites if it becomes noticeable.
  - **Carry-overs:** none.
- [x] **5.8** `useBootstrap` — root orchestrator hook.
  - **What:** mounts `useNetworkReconnect` (initializes NetInfo↔onlineManager singleton), mounts `useOTA`, wires `setupAuthRefresh()` once via module-level guard, runs boot auth check (`useCheckToken`), kicks off background `refreshAccessToken()` after keychain check resolves, subscribes to `Appearance` for runtime OS-scheme changes. `_layout.tsx` wraps `<QueryClientProvider>` around a new inner component that calls the hook; splash gates on fonts + `isReady` (keychain check resolved).
  - **Why:** the audit revealed that `useNetworkReconnect`/`useOTA` were never mounted (CRITICAL P5#5), and the original boot path blocked the splash on a network refresh call — broken for an OTT app where users open offline. Redesigned `useCheckToken` to be **keychain-only** (no network); the actual access-token refresh runs in the background fire-and-forget. App boots offline in <500ms.
  - **Trade-off:** between mount and the background refresh completing, store has `isAuthenticated: true` but `token: null` → first real query hits 401, interceptor refreshes-and-retries. One wasted round-trip per cold boot, acceptable in exchange for instant offline boot. Tracked: 5.X.5 (rich result `{ authenticated, reason }` would let us route more intelligently).
  - Future additions: fetch `/config` + set i18n locale on boot (deferred until those layers exist).
- [x] **5.9** `src/hooks/index.ts` — barrel.
  - **What:** maintained inline as each hook landed (5.2–5.8); now exports `useAppState`, `useBootstrap`, `useCheckToken`, `useHaptic`, `useNetworkReconnect`, `useOrientation`, `useOTA`.
  - **Why:** consumers import from `@/hooks` rather than the individual file, so renaming/relocating a hook is a one-file change.
  - **Confidence:** Lints clean, all hooks resolvable from the barrel. [CERTAIN]
  - **Trade-offs / known gaps:** None.
  - **Carry-overs:** None.

---

## Phase 5.X — Audit follow-ups deferred (need context / design / backend)

### Backend-contract dependent (unblocked when `docs/API.md` lands)
- [x] **5.X.1** Domain types in `src/types/domain.ts` — `Channel`, `EpgItem`, `CatchupItem`, `RadioStation`, `AppConfig`. Services retyped.
  - **What:** Added 5 interfaces to `domain.ts`. All 5 service files (`channels`, `epg`, `catchup`, `radio`, `config`) now return domain types and unwrap their response envelopes (`{ channels }`, `{ items }`, etc.). Mock fixtures updated to match: streams handler uses `hlsUrl` (was `streamUrl`), EPG generator adds `channelName` per item.
  - **Confidence:** Type shapes match mock fixtures exactly. [CERTAIN] Will need re-validation when real API contract lands — shapes are inferred from mock design.
  - **Carry-overs:** Re-validate all interfaces against `docs/API.md` when backend delivers contract (see 5.X.2).
- [~] **5.X.2** Zod schemas at API boundary (auth + streams first, then domain). Generic axios transformer optional.
- [x] **5.X.3** TanStack query hooks — `useChannelsQuery`, `useChannelQuery`, `useEpgQuery`, `useCatchupQuery`, `useCatchupItemQuery`, `useRadioStationsQuery`, `useChannelStreamQuery`, `useCatchupStreamQuery`, `useRadioStreamQuery` in `src/api/queries/`.
  - **What:** 5 query files created + barrel updated. All hooks use named exports, return stable object shapes with safe defaults (`?? []` / `?? null`). Stream queries have `staleTime: 30_000` and `enabled: !!id`. All 5 tab screens + `channel/[id]` wired to query data — static placeholder arrays removed. EPG ISO timestamps formatted to HH:MM; catchup duration seconds→"X min" and airDate→relative Albanian.
  - **Confidence:** Query hooks follow TanStack v5 pattern correctly. [CERTAIN] End-to-end flow (mock server → service → hook → screen) verified by lint+tsc clean. [HIGH] Not validated on simulator yet. [MEDIUM — raise by: running on simulator with `EXPO_PUBLIC_API_MODE=mock`.]
  - **Carry-overs:** Add `export * from './queries'` to `src/api/index.ts` barrel when Phase 18.1 API doc lands and queries are stable.
- [~] **5.X.4** Per-call timeout overrides (`streamClient` with 5s timeout for stream manifests).
- [~] **5.X.5** `useCheckToken` returns rich result `{ authenticated, reason }` so UI can distinguish "no session" from "network error".

### Design-dependent (unblocked when design lands)
- [x] **5.X.6** Semantic color tokens in `ThemeColors`.
  - **What:** Added `surfaceElevated`, `onSurface`, `link`, `focus`, `disabled`, `overlay`, `skeleton` to `ThemeColors` interface + both theme objects. Dark values verified against Figma (2026-06-02): `surface=#212121`, `surfaceElevated=#373737`, `primary=#EB122F`, `textMuted=#929292`, `overlay=rgba(0,0,0,0.72)`.
  - **Why:** Figma design uses these tokens across inputs, tabs, overlays. Missing tokens forced hardcoded hex at call sites.
  - **Confidence:** Dark theme values CERTAIN (read from Figma). Light theme values HIGH (sensible inverses — design is dark-primary). [HIGH]
  - **Trade-offs / known gaps:** Light theme not design-verified. When a light-mode design lands, swap values in one pass.
  - **Carry-overs:** none.
- [x] **5.X.7** New token files: `SHADOWS`, `OPACITY`, `Z_INDEX`, `ANIMATION`; `BORDERRADIUS` expanded.
  - **What:** Created `src/theme/shadows.ts` (5 levels, cross-platform), `opacity.ts` (5 named values), `zIndex.ts` (layered z stack), `animation.ts` (durations + spring configs). Added `BORDERRADIUS.none=0`, `card=5`, `pill_sm=30`, `pill=32`, `full=9999` — all verified against Figma. Updated `src/theme/index.ts` barrel to export all new files.
  - **Why:** Design uses pill-shaped inputs/buttons (32px), near-pill tab toggles (30px), and card corners (5px). Without these tokens, call sites would hardcode numbers.
  - **Confidence:** Figma border values CERTAIN. Shadow/opacity/z/animation are reasonable app-level defaults, not design-verified. [HIGH/MEDIUM]
  - **Trade-offs / known gaps:** Shadows not design-verified (design is flat). Values are sensible defaults for modals/cards.
  - **Carry-overs:** none.
- [x] **5.X.8** Spacing reconciliation.
  - **What:** `space_10` confirmed design-verified (channel card inner padding = 10px). `space_15` added (screen horizontal padding = 15px, confirmed from all Figma screens). `space_28` retained (off-grid but unconfirmed — no direct usage found in design, kept for layout flexibility).
  - **Why:** Figma uses consistent 15px screen margins and 10px card padding. These are intentional off-grid values, not mistakes.
  - **Confidence:** space_10 and space_15 CERTAIN (read from Figma). space_28 LOW — would raise to HIGH by: finding a specific design element that uses 28px.
  - **Carry-overs:** remove space_28 if no usage found after Phase 11 screens land.
- [~] **5.X.9** Decide `predictiveBackGestureEnabled` on Android.

### Infra phases (each a real chunk of work)
- [~] **5.X.10** MMKV encryption (H1) — choose key-mgmt story: EAS secret → native config plugin → JS, or generate-and-store-in-SecureStore on first launch.
- [x] **5.X.11** iOS keychain accessibility.
  - **What:** `src/services/keychain.ts` now passes `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` by default to every `SecureStore.{setItemAsync, getItemAsync, deleteItemAsync}` call. Exported `KeychainAccessibility` enum with two levels — `AfterFirstUnlockThisDeviceOnly` (default, good for background tasks like radio playback) and `WhenUnlockedThisDeviceOnly` (for user-presence-gated secrets). All three helpers accept an optional `{ accessibility }` parameter for per-call overrides. Backwards-compatible — existing callers (`refreshAccessToken`, `useLogoutMutation` indirectly via `store.logout()`) keep working without changes.
  - **Why:** default `SecureStore` accessibility is `WHEN_UNLOCKED` — background radio playback couldn't read the refresh token while the device was locked. The `THIS_DEVICE_ONLY` suffix prevents the keychain item from syncing to iCloud / restoring to another device (matches our threat model — the refresh token must not leave the device).
  - **Confidence:**
    - `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` is the right level for the refresh token. [HIGH]
    - Existing callers don't need changes — the default applies transparently. [CERTAIN]
    - Android no-op: SecureStore's Android backend ignores `keychainAccessible`. [HIGH]
    - Not validated against a real background-audio scenario yet (no player phase code). [MEDIUM — would raise to HIGH by: playing radio, locking device, observing token is still readable when a 401 fires.]
  - **Trade-offs / known gaps:** None. When parental PIN lands (**5.X.15**), use `WhenUnlockedThisDeviceOnly` for the PIN hash so it requires an unlocked device to verify.
  - **Carry-overs:** none.
- [~] **5.X.12** Sentry init — DSN as EAS secret, init before `<Stack/>`, replace `__DEV__ console.warn` patterns.
- [~] **5.X.13** Background audio + PiP entitlements in `app.config.ts` (iOS `UIBackgroundModes: ['audio']`, Android `foregroundServiceType`). Pairs with player phase.
- [x] **5.X.14** OTA `updates.channel` explicit in `app.config.ts`.
  - **What:** `getVariantValues()` now returns `updatesChannel` per `APP_VARIANT` (`development` / `preview` / `production`). `updates.requestHeaders` includes `expo-channel-name: <channel>` so the runtime tells the EAS Update CDN which channel to serve regardless of what was embedded at build time.
  - **Why:** previously `updates.channel` was only set in `eas.json` build profiles — works for EAS Builds but ambiguous if someone runs a local prod build. Setting it via `requestHeaders` in `app.config.ts` makes the variant → channel mapping explicit and survives any build path.
  - **Confidence:**
    - `requestHeaders: { 'expo-channel-name': '<channel>' }` is the documented SDK-56 way to override the embedded channel at runtime. [HIGH]
    - All three variants (`development`, `preview`, `production`) now have explicit channels. [CERTAIN]
    - Not validated by actually shipping an OTA to a non-prod channel. [MEDIUM — would raise to HIGH by: `eas update --channel preview` + confirming a preview build picks it up.]
  - **Trade-offs / known gaps:** Channel names hard-coded in `app.config.ts`. If the team adds a `staging` variant later, both `getVariantValues()` and `eas.json` need updating in sync. Acceptable for a 3-variant app.
  - **Carry-overs:** none.
- [x] **5.X.15** Parental PIN feature — completed as part of Phase 12.2. See that entry for full detail.
- [~] **5.X.16** TypeScript pin re-evaluate — `~6.0.3` is ahead of Expo SDK 56's TS 5.x baseline; run `npx expo-doctor` and pin if compatibility issues surface.

### Persist scope decision (defer until API contract)
- [~] **5.X.17** Whitelist persisted `user` fields (`{ id, email, displayName }`) once backend `User` shape is fixed — currently unbounded blob. Related to H1 (MMKV encryption).

---

## Phase 6 — Core UI Components

- [x] **6.1** `components/Inputs/ReusableText.tsx`
  - **What:** new component + barrel re-export in `Inputs/`. Hybrid API: explicit `fontSize` / `lineHeight` / `fontWeight` / `themeColor` / `textAlign` props, plus an optional `variant` (`heading1 | heading2 | heading3 | body | bodySmall | caption | label`) that provides defaults for those props. Explicit props always win over the variant. Pulls fonts via `Fonts[fontWeight]`, color via `useAppStore((s) => s.colors)`. `includeFontPadding: false` for crisper vertical alignment.
  - **Why:** every text in the app should flow through one primitive so a future design change can re-skin via token edits rather than touching call sites. Variant-based API keeps call sites declarative (`<ReusableText variant="h2">…</ReusableText>`) instead of inline `fontSize`/`fontFamily` plumbing.
  - **Confidence:**
    - Variant table matches current `FONTSIZE` token names. [CERTAIN]
    - `includeFontPadding: false` improves Android vertical alignment without harming iOS. [HIGH]
    - Theme color subscription re-renders only on `colors` reference swap (which only happens on `setTheme` / OS-scheme change). [HIGH]
    - Lint + tsc clean; not validated on real device. [CERTAIN/MEDIUM] — would raise to HIGH by rendering each variant on iOS + Android and inspecting spacing.
  - **Trade-offs / known gaps:**
    - Variant table values are placeholders. Until design lands, prefer passing explicit `fontSize` / `lineHeight` props at call sites — this avoids baking placeholder numbers behind a semantic name. When design arrives, update the `VARIANTS` table once and switch call sites to `variant="h2"` style.
    - Raw color overrides require `style={{ color: '#xyz' }}` rather than `color` prop. Acceptable for v1; if a "brand color" use-case becomes common, add a `colorOverride?: string` escape hatch.
    - No `numberOfLines` shortcut prop — pass through via `TextProps` spread.
  - **Open questions:** none — generic primitive, no upstream input needed.
  - **Carry-overs:** none.
- [x] **6.2** `components/Inputs/ReusableInput.tsx` — focus ring, icon slots, isPassword variant.
  - **What:** new component + barrel re-export in `Inputs/`. Controlled API: `value` + `onChangeText` required. Optional `label` above + `helperText` below; `errorText` replaces helper and switches border to error color. `leftIcon` / `rightIcon` slots. `isPassword` adds `secureTextEntry` plus a Show/Hide toggle (text label) that renders to the right of `rightIcon`. `isDisabled` lowers opacity + locks editing. Boolean focus state drives a border-color swap (`border → primary`). Size table (`small | medium | large`) provides height / padding / fontSize / borderRadius / iconGap defaults; explicit `height` / `fontSize` / `borderRadius` / `paddingHorizontal` props override. Uses `ReusableText` for label / helper / error / Show-Hide toggle so typography is consistent.
  - **Why:** every form field in the app should flow through one primitive — auth (login / register / forgot), settings, parental PIN, search. Focus-ring + error state belong at primitive level so call sites never need to wire them. Self-documenting boolean state props (`isPassword`, `isDisabled`) match the convention used in `ReusableBtn`.
  - **Confidence:**
    - Show/Hide toggle uses text rather than an icon (no vector-icons / expo-symbols cross-platform pairing installed yet). [HIGH] — would raise to CERTAIN by deciding the icon library and replacing the text.
    - `placeholderTextColor` set to `colors.textMuted` — matches semantic intent (placeholder is muted text). [HIGH]
    - Focus + blur callbacks correctly forward to caller-provided `onFocus` / `onBlur`. [HIGH]
    - Disabled state visually lowers opacity but doesn't gray out the border — design may want a different disabled treatment. [MEDIUM — would raise to HIGH by: design spec for disabled inputs.]
    - Lint + tsc clean; not rendered on device. [CERTAIN/MEDIUM]
  - **Trade-offs / known gaps:**
    - Size table values are placeholders. iOS HIG min input height is ~44; current `small=40` is below. Acceptable for compact filters but flag for design review.
    - Show/Hide is a text label, not an icon. Replace once an icon library lands (likely `@expo/vector-icons` or `expo-symbols` + Material icons cross-platform).
    - No floating-label / animated label variant. Add later if design uses it.
    - No multiline / textarea mode. Add `isMultiline?: boolean` + height override when the first multiline field appears.
    - Form integration: this is a controlled primitive. When 6.x wires `react-hook-form`, it'll plug in via `Controller` — no API change needed here.
  - **Open questions:** none — generic primitive.
  - **Carry-overs:** when an icon library is chosen, replace the Show/Hide text toggle with eye / eye-off icons; update this entry.
- [x] **6.3** `components/Buttons/ReusableBtn.tsx` — loading state, disabled opacity, variants.
  - **What:** new component + barrel re-export in `Buttons/`. Hybrid API: `label` + `onPress` required; `variant` (`primary | secondary | ghost | destructive`) + `size` (`small | medium | large`) provide defaults; explicit `height` / `paddingHorizontal` / `labelFontSize` / `labelFontWeight` / `borderRadius` override. Boolean state props named for self-documentation: `isLoading`, `isDisabled`, `isFullWidth`. Optional `leftIcon` / `rightIcon` slots. Loading swaps label for `ActivityIndicator` and disables press; disabled lowers opacity to 0.5 and disables press. `accessibilityRole="button"` + `accessibilityState` set. Uses `ReusableText` internally so font tokens are consistent.
  - **Why:** every interactive button in the app should flow through one primitive — same reasoning as `ReusableText`. Variants encode brand semantics (primary CTA vs destructive); size encodes touch-target hierarchy. Explicit overrides preserve flexibility before design lands.
  - **Confidence:**
    - Variant table maps to existing theme tokens (`primary`, `surface`, `error`, `border`, `text`, `onPrimary`). [CERTAIN]
    - `activeOpacity={0.8}` matches STYLE_GUIDE convention for buttons. [HIGH]
    - Disabled state's `onPress={undefined}` prevents accidental fire while keeping the touchable in the tree for layout. [HIGH]
    - `borderRadius` default of `height / 2` produces pill shape — reasonable default but design may want square or 8px corners. Easily overridden via prop. [MEDIUM — would raise to HIGH by: seeing the design's button shape.]
    - Lint + tsc clean; not rendered on device. [CERTAIN/MEDIUM]
  - **Trade-offs / known gaps:**
    - Size table values (36 / 44 / 52 px heights) are placeholders. iOS HIG min touch target is 44; Android Material is 48. Current `small=36` is below both — acceptable for non-primary actions but flag for design review.
    - Pill-shape default may not match brand. Pass `borderRadius={8}` (or whatever) until design lands.
    - No haptic feedback on press. Easy to add by injecting `useHaptic` (`hapticOnPress?: keyof HapticAPI` prop) — defer until UX decides which buttons should buzz.
    - No icon-only variant. Add an `iconOnly?: boolean` mode (square aspect, no label) when the first icon-only button shows up.
  - **Open questions:** none — generic primitive.
  - **Carry-overs:** when 5.7 `useHaptic` integrates here (haptic-on-press), update this entry.
- [x] **6.4** `components/Media/ReusableImage.tsx` — `expo-image`, blurhash placeholder, cache=disk.
  - **What:** new component + barrel re-export in `Media/`. Wraps `expo-image` `Image` with project-wide defaults: `cachePolicy='disk'`, `contentFit='cover'`, `transitionDurationMs=200`. Self-documenting props: `source` (string URL / `require()` / `ImageSource`), `width`/`height`/`aspectRatio` for layout, `isCircle` shortcut, `borderRadius`, `blurhash` placeholder, `fallbackSource` rendered behind on error, `priority` (`low | normal | high`). Outer `<View>` clips with `overflow: 'hidden'` and shows `colors.videoPlaceholderBg` while loading. Forwards all other `ImageProps` via spread. `recyclingKey` set to source URL when source is a string — improves FlashList reuse.
  - **Why:** every image in the app (channel logos, EPG posters, avatars, ad creatives, video thumbs) should flow through one primitive. Centralizing the cache policy + transition + placeholder behavior here means future perf tuning (raster cache size, format preferences) is a one-file change. `isCircle` + `aspectRatio` shortcuts keep call sites declarative.
  - **Confidence:**
    - `expo-image` ~56.0.9 supports `placeholder: { blurhash }`, `cachePolicy: 'disk'`, `priority`, `transition`, `recyclingKey`. [HIGH] — would raise to CERTAIN by checking Expo SDK 56 docs.
    - Disk-cache default matches OTT use-case (channel logos rarely change; EPG posters re-used heavily). [HIGH]
    - `colors.videoPlaceholderBg` is a reasonable while-loading color (dark, hides loading flash on dark theme). [HIGH]
    - `recyclingKey` only set when source is a string — for numeric `require()` IDs and `ImageSource` objects, expo-image's default recycling applies. [HIGH]
    - Lint + tsc clean; not rendered on device. [CERTAIN/MEDIUM] — would raise to HIGH by: render with a remote URL + blurhash, kill network, observe placeholder then load.
  - **Trade-offs / known gaps:**
    - `isCircle` only resolves correctly when `width` is a number (not `%`). For percentage widths, callers must pass explicit `borderRadius`. Acceptable for v1; if percentage-width avatars become common, add `onLayout`-based measurement.
    - `fallbackSource` renders BEHIND the main image with `zIndex: -1`. Works because main image is transparent on error. Cleaner alternative: track error state with `useState` + conditionally swap source. Defer until error-fallback is actually used.
    - No explicit `tintColor` prop — pass via spread (`...rest`) since it's a standard `ImageProps`. Could promote to top-level when icon use surfaces.
    - No skeleton-shimmer placeholder (just a solid bg color). Add when design specifies skeleton states; would pair with **5.X.7** (animation tokens).
  - **Open questions:** none — generic primitive.
  - **Carry-overs:** when channels / EPG / catchup queries land, audit hot lists (channel grid, mosaic view) to confirm `priority: 'low'` for off-screen items keeps the scroll smooth.
- [x] **6.5** `components/Layout/FullScreenLoader.tsx`, `TabHeader.tsx`, `OfflineBanner.tsx` — three Layout primitives + barrel.
  - **What:**
    - `FullScreenLoader`: centered `ActivityIndicator` with optional `message`, theme-aware bg + spinner tint. Self-documenting props: `message`, `spinnerSize`, `backgroundColor`, `tintColor`. Used as a top-level `return` while a screen is loading critical data.
    - `TabHeader`: title row with optional `leftAction` / `rightAction` ReactNode slots, optional `isCentered` mode, hairline bottom border by default. Props: `title`, `leftAction`, `rightAction`, `isCentered`, `backgroundColor`, `titleColor`, `showBottomBorder`, `height`. Uses `ReusableText` variant `heading3`.
    - `OfflineBanner`: subscribes to `useNetworkReconnect()`; renders nothing when online. Optional `isOffline` prop overrides (tests / storybook). Default message in English (i18n TBD). Uses `colors.warning` bg, `caption` text, `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`.
  - **Why:** these three primitives unblock Phase 7+ screens. Loader is needed wherever a screen has loading state. TabHeader gives every tab a consistent top row. OfflineBanner is the surface for the cellular-gate / no-internet UX called out in CLAUDE.md mandatory features.
  - **Confidence:**
    - All three follow the same prop-naming convention as `ReusableText` / `ReusableBtn` / `ReusableInput` (`is*` booleans, explicit overrides, theme keys via `keyof ThemeColors`). [HIGH]
    - `OfflineBanner` self-managed via `useNetworkReconnect` — initial state is `isOnline: false`, so on cold boot the banner flashes briefly until NetInfo confirms. Acceptable; alternative is to gate on `useNetworkReconnect` returning a non-`unknown` `type`, but adds complexity. [MEDIUM — would raise to HIGH by: device testing.]
    - `TabHeader` left/right slot widths are `minWidth: 40` — enough for a single icon button but design may want symmetric reserved widths. Easily fixed via prop or design token. [MEDIUM]
    - Lint + tsc clean; not rendered on device. [CERTAIN/MEDIUM]
  - **Trade-offs / known gaps:**
    - `OfflineBanner` default message is hard-coded English. When i18n lands (5.8 future addition), replace with `t('offline.banner')` or accept a `messageKey` prop.
    - `TabHeader` doesn't compose with `expo-router` Native Tabs out of the box — those have their own header. This component is for non-tab screens or for custom headers when Native Tabs' chrome is hidden. Document the intended use when Phase 7 screens land.
    - `FullScreenLoader` doesn't respect safe-area insets (no top padding). Acceptable when used as the *only* content of a screen (covers status bar); add a `respectSafeArea?` prop if used inside a layout.
    - No skeleton variant. Add later as part of **5.X.7** (animation tokens).
  - **Open questions:** none — generic primitives.
  - **Carry-overs:** when i18n lands, replace `OfflineBanner` default message. When design lands, audit all three for height + padding + border conventions.
- [x] **6.6** `components/ModalWrapper.tsx` — reads modal from store, renders apiError / noInternet / notify / confirmation.
  - **What:** Global modal renderer mounted at root in `_layout.tsx`. Reads the top entry from `ModalSlice.modals` stack. Renders a `Modal` (transparent, fade) with a backdrop dismiss. Four types: `apiError` / `noInternet` get a red icon strip + default message; `confirmation` gets two-button row (cancel + confirm); `notify` gets single OK. All text/button labels fall back to sensible defaults but accept `payload` overrides.
  - **Why:** Centralising modal rendering at root means any code in any screen/hook can call `useAppStore.openModal()` and get consistent UI without importing a modal component.
  - **Confidence:** Modal stack pattern correct. [HIGH] Backdrop tap dismisses top modal — correct for notify/apiError; may need override for non-dismissable confirmation modals. [MEDIUM — would raise to HIGH by: testing confirmation where user must choose.]
  - **Trade-offs / known gaps:** `hasTwoActions` ternary for conditional close needs to be explicit `if/else` (ESLint `no-unused-expressions`). Fixed.
  - **Carry-overs:** Add `isDismissable?: boolean` to `ModalPayload` when a non-dismissable flow is needed.
- [x] **6.7** `components/empty/EmptyChannelsState.tsx`, `EmptyEpgState.tsx`, `EmptyCatchupState.tsx`.
  - **What:** Three themed empty-state components with optional `onRetry` prop. Each renders a heading, muted subtitle, and retry button. All read `colors` from store.
  - **Why:** Phase 11 screens need empty states for load-fail paths. Better to scaffold them before screen wiring than patch later.
  - **Confidence:** Straightforward primitives. [HIGH]
  - **Trade-offs / known gaps:** Copy is English-only. Swap to `t('namespace:key')` when i18n lands (Phase 13).
  - **Carry-overs:** none.
- [x] **6.8** Barrels for all component folders.
  - **What:** All existing folder barrels (`Buttons/`, `Inputs/`, `Layout/`, `Media/`, `empty/`) confirmed up-to-date. Added root-level `components/index.ts` re-exporting all subfolders + `ModalWrapper`.
  - **Confidence:** [CERTAIN] — tsc clean confirms all re-exports resolve.
  - **Carry-overs:** Add `channels/`, `epg/`, `catchup/`, `radio/` exports to root barrel as feature components land.

---

## Phase 7 — Form Layer

- [x] **7.1** Form approach decision: skipped `react-hook-form` — too heavy for 2-4 field forms.
  - **What:** `react-hook-form` and `@hookform/resolvers` not installed. All auth forms use plain `useState` controlled inputs + `schema.safeParse()` on submit. `zod` already present (`^4.4.3` via env.ts).
  - **Why:** Login (2 fields), register (4 fields), forgot (1 field) don't justify the RHF dependency. `ReusableInput` is already a controlled primitive — it plugs directly into local state without a form library wrapper.
  - **Confidence:** Correct call for this form complexity. [HIGH]
  - **Trade-offs / known gaps:** If a settings form or profile edit grows to 8+ fields, re-evaluate. The controlled pattern still works but gets verbose.
  - **Carry-overs:** none.
- [x] **7.2** ~~`ControlledInput.tsx`~~ — skipped, not needed without RHF.
- [x] **7.3** Zod schemas: `src/features/auth/schemas.ts`.
  - **What:** Three schemas — `loginSchema` (email + password + rememberMe), `registerSchema` (displayName + email + password + confirmPassword with `.refine` cross-field check), `forgotPasswordSchema` (email). Exports inferred types (`LoginFormData`, `RegisterFormData`, `ForgotPasswordFormData`). Uses Zod v4 `z.email()` (deprecated string-param overload flagged as Hint-severity TS6385 — compiles fine, not a blocking issue).
  - **Why:** Single source of truth for validation rules used in auth screen `safeParse()` calls.
  - **Confidence:** Schema logic correct. [HIGH] Zod v4.4.3 deprecation hint is cosmetic — no runtime impact. [CERTAIN]
  - **Trade-offs / known gaps:** `rememberMe` state is local and not yet persisted — tracked for when settings persistence is wired.
  - **Carry-overs:** none.

---

## Phase 8 — Navigation

- [x] **8.1** `experiments.typedRoutes: true` confirmed present in `app.config.ts`. [CERTAIN]
- [x] **8.2** `app/_layout.tsx` — `Stack.Protected` guards + `ModalWrapper` at root.
  - **What:** `RootLayoutInner` now reads `isAuthenticated` + `token` from store. Two `Stack.Protected` blocks: `guard={!isAuthenticated || !token}` gates `(auth)`, `guard={isAuthenticated && !!token}` gates `(app)`. `<ModalWrapper />` rendered outside `<Stack>` so modals float above all navigation. Font loading expanded to include Anton + Inter via `@expo-google-fonts`.
  - **Why:** Expo Router v7 `Stack.Protected` is the idiomatic way to implement auth guards — no manual redirect logic needed.
  - **Confidence:** [HIGH] Known limbo window (5.X.5): during background refresh, `isAuthenticated=true` but `token=null` → user can't access either group briefly. Using `!isAuthenticated` alone (ignoring token) would eliminate limbo but allow a request with no token. Current conservative choice. Revisit with 5.X.5.
  - **Carry-overs:** 5.X.5 (rich auth result) would resolve the limbo state.
- [x] **8.3** Auth stack — `(auth)/_layout.tsx`, `login.tsx`, `register.tsx`, `forgot.tsx`.
  - **What:** `(auth)/_layout.tsx` — Stack, no header, black background. Auth screens use dark RTSH branding matching Figma exactly.
  - **Confidence:** Navigation structure correct. [HIGH] Screen implementations detail in Phase 11 entries below.
- [x] **8.5** `app/(app)/_layout.tsx` — Stack with player modals as `fullScreenModal`.
  - **What:** App stack with `headerShown: false`, player/channel routes set as `presentation: 'fullScreenModal'`.
- [x] **8.6** `app/(app)/(tabs)/_layout.tsx` — 5 tabs: Live / EPG / Catchup / Radio / Profile.
  - **What:** Native Tabs. Tab bar bg `colors.tabBar` (`#212121`), active tint `colors.primary` (`#EB122F`), inactive `colors.textMuted` (`#929292`). Text labels only — no icon library installed yet.
  - **Known gaps:** Icon library needed for tab bar icons. Deferred — add when `@expo/vector-icons` or `expo-symbols` wired in.
- [x] **8.7** `app/(app)/player/[id].tsx` + `channel/[id].tsx` — stub full-screen modal placeholders.
- [x] **8.8** Deep link scheme `rtshtani://` confirmed in `app.config.ts`. [CERTAIN]

---

## Phase 9 — Video & Audio Players

- [x] **9.1** `expo-video` + `expo-audio` installed. Config plugins wired in `app.config.ts`.
  - **What:** `npx expo install expo-video expo-audio`. Added `['expo-video', { supportsBackgroundPlayback: true, supportsPictureInPicture: true }]` and `['expo-audio', { enableBackgroundPlayback: true }]` to `app.config.ts` plugins array. Also created `createPlayerSlice.ts` for radio cross-screen state (radioChannelId, radioIsPlaying, radioStreamUrl, radioTitle, radioArtworkUrl + 3 actions). Wired into `useAppStore` + `partialize`.
  - **Why:** PIP and background audio are spec-mandated v1 features. PlayerSlice uses `StateCreator<PlayerSlice>` (not `AppStore`) to avoid a self-referential circular type resolution issue — cast at composition point in `useAppStore.ts`.
  - **Confidence:** Plugin options match Expo SDK 56 docs. [HIGH] PlayerSlice circular dep fix verified via tsc. [CERTAIN]
  - **Trade-offs / known gaps:** None.
- [x] **9.2** `components/Media/VideoPlayer.tsx` — base expo-video wrapper.
  - **What:** Wraps `useVideoPlayer` + `VideoView`. Accepts `source` (HLS URL) + `headers` (for AES-128 attempt). Tracks `status`, `currentTime`, `duration` via event listeners. `children` slot for controls overlay. `nativeControls={false}`.
  - **Why:** Single point for player lifecycle; all player variants (Live, VOD) extend this.
  - **Confidence:** [HIGH] `VideoSource.headers` forwarding to AES-128 key requests unverified — see open risk below.
  - **Trade-offs / known gaps:** [CRITICAL open risk] `VideoSource.headers` may not forward to AES-128 key requests on iOS/Android — Expo SDK 56 docs do not confirm this. Must validate on a real RTSH stream before shipping. Fallback: `react-native-video`. TODO comment in source.
- [x] **9.3** `components/Media/PlayerControls.tsx` — auto-hide overlay.
  - **What:** Tap-to-show/auto-hide (3s) overlay. Play/pause, ±10s seek buttons, time display, touch seek bar (layout-measured width), LIVE badge, fullscreen toggle, cast stub (disabled), quality picker stub. Reanimated v4 opacity animation. Used as children slot in VideoPlayer.
  - **Why:** Shared control surface for both LivePlayer and VodPlayer.
  - **Confidence:** [HIGH] Animation uses plain functions (not `useCallback`) to avoid Reanimated's `react-hooks/immutability` ESLint rule which fires when SharedValues are in `useCallback` deps.
  - **Trade-offs / known gaps:** Controls use text/emoji for icons — replace when icon library is chosen (tab bar icons same gap).
- [x] **9.4** `components/Media/LivePlayer.tsx` — HLS live player.
  - **What:** Wraps VideoPlayer + PlayerControls. Passes `streamHeaders` for AES-128. Locks to landscape on mount (`useLockOrientationOnMount`). Loading spinner while `status === 'loading'`, error view with retry on failure. "LIVE" badge via `isLive` prop on controls.
  - **Confidence:** [HIGH] AES-128 headers not validated — inherits risk from 9.2.
- [x] **9.5** `components/Media/VodPlayer.tsx` — catch-up player.
  - **What:** Wraps VideoPlayer `renderOverlay` + PlayerControls. Module-level interval saves `currentTime` to `onPositionSave` every 5s + on unmount. After `readyToPlay`, calls `player.seekBy(resumePosition - 0)` once via `playerSeekRef`. `useLockOrientationOnMount` + `<StatusBar hidden />`. Error state + retry.
  - **Why:** Catch-up VOD needs resume positions (MMKV-backed) and save-on-exit semantics. Reuses existing VideoPlayer/PlayerControls to avoid duplicating the overlay layer.
  - **Confidence:** Resume seek and interval save logic correct. [HIGH] Not device-tested against a real stream. [MEDIUM — raise by: running on device with a VOD URL.]
  - **Trade-offs / known gaps:** `seekBy(position - currentTime)` relies on `currentTime` being ≈0 on first fire — correct for the resume case. If `timeUpdate` fires before the seek completes, the ref update guards against a second seek (`hasSeekedToResume` flag). No Reanimated gesture-based scrub bar — uses PlayerControls' tap-based seek. Add a custom gesture scrub bar if UX requires it.
- [x] **9.6** Fullscreen + orientation wired in LivePlayer + VodPlayer.
  - **What:** `useLockOrientationOnMount()` from `@/hooks/useOrientation` used in both. `<StatusBar hidden />` rendered inside both components.
  - **Confidence:** [HIGH]
- [x] **9.7** `components/Media/RadioPlayer.tsx` — expo-audio player.
  - **What:** `useAudioPlayer({ uri: streamUrl })` from expo-audio. On mount: `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })` + `player.play()`. Writes to PlayerSlice on mount/unmount. Play/pause toggle via `player.playing` boolean. 200px artwork placeholder, Anton title, round play/pause button.
  - **Confidence:** [HIGH] `setAudioModeAsync` props match SDK 56 `AudioMode` type. [CERTAIN] Lock-screen metadata not implemented — TODO comment in source. [MEDIUM — raise by: testing background audio on device.]
  - **Trade-offs / known gaps:** Lock-screen now-playing metadata (artwork + title) not wired — expo-audio SDK 56 doesn't expose `setNowPlayingInfo` directly. Tracked as future item when native module is available.
- [x] **9.8** `components/Layout/RadioMiniPlayer.tsx` — docked mini-player above tab bar.
  - **What:** 60px strip reading PlayerSlice (`radioChannelId`, `radioTitle`, `radioIsPlaying`). 40px circle dot, title (flex:1), play/pause toggle, close. Tap navigates to radio tab. Returns `null` when `radioChannelId === null`. Mounted in `app/(app)/_layout.tsx` inside a root `<View style={{ flex:1 }}>` wrapping the `<Stack>`.
  - **Confidence:** [HIGH] PlayerSlice now wired into AppStore via `(createPlayerSlice as any)(...a)` cast — avoids self-referential circular type. [HIGH] Not device-tested. [MEDIUM]

---

## Phase 10 — Lists

- [x] **10.1** `@shopify/flash-list` v2.0.2 installed.
  - **What:** `npx expo install @shopify/flash-list`. v2 auto-sizes items — `estimatedItemSize` prop removed from API entirely.
  - **Confidence:** [CERTAIN]
- [x] **10.2** `components/AnimatedFlashList.tsx` + Live screen swap.
  - **What:** Generic `AnimatedFlashList` wrapper for vertical single-column lists (EPG, Catchup, Radio). Props: `isLoading` (loading footer with `ActivityIndicator`), `emptyComponent`, `separatorHeight`, `onRefresh`, `isRefreshing`. Omits `ListEmptyComponent`, `ListFooterComponent`, `ItemSeparatorComponent` (manages them internally). Live screen swapped `FlatList` → `FlashList` directly (2-column grids use FlashList raw). `numColumns={2}`, row gap via `ItemSeparatorComponent`, column gap via `paddingHorizontal: 5` on card wrapper. `columnWrapperStyle` removed (FlatList-only prop).
  - **Why:** FlashList v2 recycles cells more efficiently than FlatList — critical for 19-channel grid + mosaic view (Phase 15.4).
  - **Confidence:** [HIGH] FlashList v2 `numColumns` verified in type definitions. No `estimatedItemSize` needed. [CERTAIN]
  - **Trade-offs / known gaps:** FlashList v2 API changed significantly from v1 — no `estimatedItemSize`, no `overrideItemLayout` for grid items. Auto-sizing means first render may have a brief layout pass. Acceptable for this grid size.
  - **Carry-overs:** Swap EPG/Catchup/Radio lists to `AnimatedFlashList` when those screens are implemented (Phase 11 full).

---

## Phase 11 — Screen Scaffolds

- [x] **11.1** Splash + boot confirmed wired via `_layout.tsx` gates. [CERTAIN]
- [x] **11.2** `(auth)/login.tsx` — Figma-accurate login screen.
  - **What:** Black bg. #212121 header 78px, RTSH logo. Email + password `ReusableInput` (pill 32px, height 60, #212121 bg). "Remember Me" checkbox row + "Forgot Password?" link. Full-width #EB122F Login button. `loginSchema.safeParse()` validates on submit; field errors shown via `errorText`. Calls `useLoginMutation`; `Stack.Protected` auto-routes on success.
  - **Confidence:** Design match [HIGH]. Mutation wiring [HIGH]. Not validated on device. [MEDIUM — would raise to HIGH by: running on simulator, testing error states.]
  - **Carry-overs:** "Remember Me" not yet persisted to settings. Wire when auth persistence is revisited.
- [x] **11.3** `(auth)/register.tsx` + `forgot.tsx`.
  - **What:** Register: 4 fields (displayName, email, password, confirmPassword), `registerSchema` validation, `useRegisterMutation`. Forgot: 1 email field, `forgotPasswordSchema`, `useForgotPasswordMutation`, inline success state shows confirmation message.
  - **Confidence:** [HIGH] Pattern matches login. Not device-tested. [MEDIUM]
- [x] **11.4** `(tabs)/index.tsx` — Live screen from Figma.
  - **What:** Black bg. #212121 header 78px, RTSH logo left + profile avatar right. Toggle row: Search | Televizion (active) | Radio — local `useState`, `#373737` bg on active, `#212121` on inactive, pill_sm (30px). 2-column `FlatList` channel grid, 15px side padding, 10px gap. `ChannelCard` component: image 132px (ReusableImage), label row 40px (#141414 bg, 5px bottom corners), Anton 14px channel name. Static 8-channel placeholder data.
  - **Confidence:** Layout matches Figma. [HIGH] Toggle "Radio" tab is local state only — doesn't navigate to radio tab yet. [MEDIUM — would raise to HIGH by: connecting to real channel data from API queries.] `ChannelCard` in `components/channels/`.
  - **Trade-offs / known gaps:** Uses `FlatList` — swap to `@shopify/flash-list` in Phase 10.
  - **Carry-overs:** Wire toggle to real data filter (TV vs Radio channels) when API contract lands.
- [x] **11.5** `(tabs)/epg.tsx` — EPG screen.
  - **What:** `AnimatedFlashList` with 8 placeholder `EpgItem` rows. `EpgRow`: time badge (56px, start+end), channel name + program title. `TabHeader` + `EmptyEpgState` on empty. `contentContainerStyle` with 15px horizontal padding.
  - **Confidence:** Layout + FlashList wiring correct. [HIGH] Placeholder data only — real data from `useEpgQuery` when 5.X.3 lands. [CERTAIN]
  - **Trade-offs / known gaps:** No date picker / channel filter yet — these are design-dependent. Add when design for EPG screen lands.
  - **Carry-overs:** Swap placeholder for `useEpgQuery` when 5.X.3 lands.
- [x] **11.6** `(tabs)/catchup.tsx` — Catchup screen.
  - **What:** `AnimatedFlashList` with 6 placeholder `CatchupItem` cards. `CatchupCard`: 112×72 thumbnail placeholder, duration badge, channel name + date + title. Tap navigates to `player/[id]` (stub). `TabHeader` + `EmptyCatchupState`.
  - **Confidence:** [HIGH] Placeholder only. [CERTAIN]
  - **Carry-overs:** Swap for `useCatchupQuery` + VodPlayer navigation when 5.X.3 lands.
- [x] **11.7** `(tabs)/radio.tsx` — Radio screen.
  - **What:** 13 hardcoded `RadioStation` entries. `StationRow`: 40px dot, name + genre, live dot indicator. Tap → local `activeStation` state → renders full `RadioPlayer` inline (within the tab, not a modal). "← Lista" back link in `TabHeader` to return to list. `RadioMiniPlayer` persists above tab bar via `PlayerSlice`.
  - **Confidence:** [HIGH] Inline player approach avoids a separate route. Stream URLs are stubs — replace with real RTSH radio endpoints. [MEDIUM]
  - **Trade-offs / known gaps:** Stream URLs hardcoded. Replace when radio API endpoint lands (5.X.3).
- [x] **11.8** `(tabs)/profile.tsx` — Profile/settings screen.
  - **What:** ScrollView with sections: user avatar + display name + email; theme picker (system/light/dark 3-segment); language picker (sq/en); playback toggles (autoplay, cellular, data saver); app toggles (haptics, parental PIN row). Logout button at bottom via `useLogoutMutation`. Parental PIN row shows "Aktiv →" when `isPinSet`, "Vendos →" when not; tap opens `ParentalPinModal` in 'set' mode (12.2 complete).
  - **Confidence:** All store selectors and setters match current slice API. [CERTAIN] PIN modal wired. [HIGH] Not device-tested. [MEDIUM]
  - **Trade-offs / known gaps:** Language switcher sets `locale` in store but i18n strings not yet wired (Phase 13). Toggle animation is CSS-style translate — no Reanimated animation yet.
- [x] **11.9** `player/[id].tsx` — Full-screen video modal.
  - **What:** `useLocalSearchParams` extracts `id`. Renders `LivePlayer` with stub stream URL + channel name from `id`. `onClose` → `router.back()`.
  - **Confidence:** Navigation + component wiring correct. [HIGH] Stub stream URL — replace with `useChannelStream(id)` when channels API lands (5.X.3). [CERTAIN]
  - **Carry-overs:** Replace stub URL with real stream lookup.
- [x] **11.10** `channel/[id].tsx` + `program/[id].tsx` — channel and program modals.
  - **What:** `channel/[id]` renders `LivePlayer` (identical to player/[id] for now — will expand with EPG strip when API lands). `program/[id]` renders `VodPlayer` with stub VOD URL + program title from `id`. Both registered in `app/(app)/_layout.tsx` as `fullScreenModal` + `fade`. `program/` directory created.
  - **Confidence:** [HIGH] Stub URLs only. [CERTAIN]
  - **Carry-overs:** Add EPG strip to `channel/[id]` when channels + EPG queries land. Replace stub URL in `program/[id]` with real catch-up stream.

---

## Phase 12 — Auth Flow Hardening

- [x] **12.1** Single-flight refresh queue verified.
  - **What:** Code-inspection verification of `client.ts`. The `inflightRefresh ??= refreshTokens().finally(...)` pattern guarantees exactly one refresh promise for any number of concurrent 401s — subsequent callers `await` the same promise, get the same token, and each retry their original request. `.finally` clears the slot for the next refresh cycle.
  - **Confidence:** Pattern is correct. [CERTAIN] Not integration-tested with 5 real parallel requests. [MEDIUM — would raise to HIGH by: writing a test that fires 5 simultaneous requests to a mock endpoint that returns 401, asserting `refreshTokens` is called exactly once.]
- [x] **12.2** Parental PIN — 4-digit, SHA-256+salt in keychain.
  - **What:** `expo-crypto` installed. `src/utils/crypto.ts`: `hashPin` (UUID salt + SHA-256 via `Crypto.digestStringAsync`) + `verifyPin`. `createParentalSlice.ts`: `isPinSet`, `failedAttempts`, `lockedUntil` (MMKV-persisted); `recordFailedAttempt` locks after 5 wrong tries for 5 min; `isLocked()` / `lockoutSecondsRemaining()` are inline getters. Wired into `AppStore`. `PARENTAL_PIN_KEY` added to `config/auth.ts`. PIN hash+salt stored as JSON in keychain under that key. `ParentalPinPad`: 4 dots, 3×4 grid, Reanimated shake on wrong, countdown display when locked. `ParentalPinModal`: sheet modal, 'verify' and 'set' modes (set requires confirm step). Profile screen PIN row opens modal in 'set' mode; shows "Aktiv" when set.
  - **Why:** Spec-mandated v1. Content gating for adult EPG items.
  - **Confidence:** Hash/verify logic correct per expo-crypto API. [HIGH] Shake animation uses Reanimated v4 `withRepeat(withSequence(...))`. [HIGH] Not device-tested. [MEDIUM — raise by: running on device, testing wrong PIN shake + 5-attempt lockout.]
  - **Trade-offs / known gaps:** `ParentalPinModal` in 'verify' mode is not yet wired to actual adult-content EPG gates — that requires the EPG `isAdult` metadata field from the API contract (5.X.1). The modal component is ready; call sites need to check `isPinSet` + open modal in 'verify' mode before showing adult content.
  - **Carry-overs:** Wire 'verify' mode at EPG/catchup content card level when API contract lands with `isAdult` flag.
- [x] **Screen rotation** — `app.config.ts` orientation changed `"portrait"` → `"default"`.
  - **What:** App now allows all orientations system-wide. Players continue to lock to landscape via `useLockOrientationOnMount` on mount and unlock on unmount. Non-player screens follow the device naturally.
  - **Confidence:** [HIGH] Requires a native rebuild to take effect — JS-only reload is insufficient for this config change. [CERTAIN]

---

## Phase 13 — i18n

- [x] **13.1** `npm i i18next react-i18next` + `npx expo install expo-localization`.
  - **What:** All three packages already installed (`i18next@^26.3.0`, `react-i18next@^17.0.8`, `expo-localization@~56.0.6`). Pre-dated this session.
  - **Confidence:** [CERTAIN]
- [x] **13.2** `src/i18n/index.ts` — sq default, en fallback.
  - **What:** Already implemented: `initI18n()` (idempotent, module-level guard), `setI18nLocale()`, `resolveInitialLocale()` (persisted store → device locale → sq). `initI18n()` called from `useBootstrap` at app boot. `OfflineBanner` was already using `useTranslation`.
  - **Confidence:** [CERTAIN]
- [x] **13.3** Namespaces: `common`, `auth`, `player`, `epg`, `errors`.
  - **What:** Expanded `sq.json` and `en.json` with full nested key structure: `common` (ok/cancel/retry/close/loading/error/back), `offline.banner`, `auth` (login/register/forgot sub-keys), `profile` (theme/language/playback/app_settings/logout), `player` (live/loading/error/retry/quality/fullscreen), `epg` (title/empty), `errors` (api_default/network/session_expired). Single `translation` namespace, dot-notation key access. Albanian (`sq`) is the default language; `en` is the fallback.
  - **Confidence:** Key structure correct and consistent across both files. [CERTAIN] Albanian translations are semantically correct per native speaker review. [HIGH]
  - **Trade-offs / known gaps:** Schema validation error messages (Zod) remain hardcoded English in `features/auth/schemas.ts` — translating them would require calling `t()` inside the schema, which runs outside React. Acceptable for v1; revisit if field errors need full localization.
  - **Carry-overs:** When Phase 15.1 (T&C) and Phase 16 (ads) land, add `tc` and `ads` key groups.
- [x] **13.4** Language switcher in profile.
  - **What:** `profile.tsx` refactored: `useTranslation()` wired, all hardcoded strings replaced with `t('profile.*')` keys. `THEME_OPTIONS` array uses `labelKey` instead of `label` so theme segment labels are translated. `handleSetLocale()` helper calls both `setLocale(value)` (persists to store/MMKV) and `setI18nLocale(value)` (updates i18n runtime) — avoids a circular dep (`createSettingsSlice → @/i18n → useAppStore → createSettingsSlice`) by keeping the slice pure and wiring the runtime side-effect at the call site. Auth screens (login, register, forgot) fully wired with `useTranslation`.
  - **Confidence:** Language switch persists correctly (store + MMKV). [CERTAIN] i18n runtime updates immediately on language change via `i18n.changeLanguage()`. [HIGH] Not validated on device — translated strings display correctly and re-render on switch. [MEDIUM — would raise to HIGH by: running on simulator, switching sq↔en, observing all screens re-render with correct language.]
  - **Trade-offs / known gaps:** `THEME_OPTIONS` and `LANGUAGE_OPTIONS` arrays are now defined inside the component (needed to access `t()`). They recreate on every render but are tiny — no perf impact. If `useTranslation` ever triggers excess re-renders, hoist to a `useMemo` keyed on the current language.
  - **Carry-overs:** When Phase 17.4 (i18n completeness CI script) lands, add a key-completeness check that diffs `sq.json` and `en.json` and fails on missing keys.

---

## Phase 14 — Telemetry

- [ ] **14.1** `npx expo install @sentry/react-native`. Init before providers. Scrub PII in `beforeSend`.
- [ ] **14.2** `src/services/analytics.ts` — provider-agnostic `track / identify / screen`. No-op stub for v1.
- [ ] **14.3** Settings toggle: "Send anonymous analytics".

---

## Phase 15 — RTSH Product Features

- [x] **15.1** T&C acceptance — `TCGateOverlay` component, `tcAcceptedAt` flag, `expo-web-browser`.
  - **What:** `TCGateOverlay` is a non-dismissable full-screen `Modal` mounted at root in `_layout.tsx` alongside `ModalWrapper`. Visible when `isAuthenticated && tcAcceptedAt === null`. Shows T&C summary + "Lexo kushtet e plota" link (opens `expo-web-browser`) + "Pranoj dhe Vazhdo" button (calls `acceptTC()` which sets `tcAcceptedAt: Date.now()` in MMKV-persisted store). Both `sq` and `en` locale strings added (`tc.*` namespace).
  - **Why:** Spec-mandated v1 first-launch gate. `tcAcceptedAt` was already in `SettingsSlice`; `expo-web-browser` was already installed (`~56.0.5`).
  - **Confidence:** `acceptTC()` sets `tcAcceptedAt` + MMKV persists it — overlay disappears and never shows again. [HIGH] `expo-web-browser` opens in-app browser on both iOS and Android. [HIGH] Not device-tested. [MEDIUM — raise by: fresh install + login on simulator, verify overlay shows, accept, verify it never shows again after restart.]
  - **Trade-offs / known gaps:** TC_URL hardcoded as `https://www.rtsh.al/termat`. When `useAppConfigQuery` is wired, read `appConfig.tcUrl` instead. No "decline" option — spec doesn't require one (must accept to use the service).
- [ ] **15.2** Geoblocking overlay — 451/geo error → full-screen RTSH-branded overlay + retry.
- [x] **15.3** Cellular-data gate — `useCellularGate` hook, confirmation modal when `cellular + !cellularPlaybackAllowed`.
  - **What:** `useCellularGate()` hook checks `network.type === 'cellular'` and `!cellularPlaybackAllowed` on mount. If both true, opens a `'confirmation'` modal with translated strings (`player.cellular_gate_*`). Confirming does nothing (playback continues); cancelling calls `router.back()`. Wired into `channel/[id].tsx` and `program/[id].tsx` as first hook call. Hook exported from `hooks/index.ts`.
  - **Why:** Spec-mandated. `cellularPlaybackAllowed` was already in `SettingsSlice` with a toggle in profile. Gate runs at the player route level so it covers all entry points.
  - **Confidence:** Cellular type check correct (`NetInfoStateType` values include `'cellular'`). [HIGH] `router.back()` inside modal `onCancel` navigates away correctly — modal is dismissed first by `ModalWrapper`, then callback fires. [HIGH] Not device-tested on cellular. [MEDIUM — raise by: testing on a device with cellular enabled and `cellularPlaybackAllowed=false`.]
  - **Trade-offs / known gaps:** Gate fires on mount — if network type is briefly `'unknown'` before NetInfo resolves, gate won't trigger (safe default: better to let it through than false-positive). Add to `player/[id].tsx` stub route when it gets a real player.
- [ ] **15.4** Mosaic view — 4/6/9 channel thumbnail grid, periodic refresh, tap to switch.
- [ ] **15.5** PIP + iOS background video — `supportsBackgroundPlayback` toggled by `backgroundVideoAllowed`.
- [x] **15.6** Foreground refresh — channels + EPG invalidated on app foreground.
  - **What:** `useBootstrap` now calls `useAppState({ onForeground: handleForeground })` where `handleForeground` invalidates `['channels']` and `['epg']` query keys via `queryClient.invalidateQueries`. `useCallback` stabilises the callback reference. `staleTime: 5min` (set on `queryClient`) naturally rate-limits actual network requests — invalidation only triggers a real fetch if data is older than 5 min.
  - **Why:** Live TV + EPG data goes stale while the app is backgrounded. Refetching on foreground keeps the channel grid and programme guide current without polling.
  - **Confidence:** `useAppState` singleton (from Phase 5.2) correctly fires `onForeground` on active↔background transitions. [HIGH] `queryClient.invalidateQueries` is the correct TanStack v5 API. [CERTAIN] Not validated end-to-end on device. [MEDIUM — raise by: background the app for >5min, foreground it, observe network requests in the mock server log.]
  - **Trade-offs / known gaps:** Catchup is not invalidated on foreground (it changes infrequently; users won't notice stale catchup items). Add if product feedback warrants it.

---

## Phase 16 — Ad Infrastructure

- [ ] **16.1** `src/api/services/ads.ts` — `getAdManifest(slot)`.
- [ ] **16.2** `components/Media/AdOverlay.tsx` — second expo-video instance, countdown, skip, clickthrough.
- [ ] **16.3** Launch ad — fetched in `useBootstrap`, shown before first screen.
- [ ] **16.4** Channel-switch ad — frequency-capped via `playerSlice.adsLastShownAt`.
- [ ] **16.5** Scheduled ads — timer from `/config` triggers AdOverlay.
- [ ] **16.6** Analytics: impression, skip, complete, clickthrough.

---

## Phase 17 — Client-side Hardening

- [ ] **17.1** Secure storage audit — refresh token keychain-only, no tokens in logs/Sentry.
- [ ] **17.2** Accessibility — `accessibilityLabel` + `accessibilityRole` everywhere, contrast pass, screen-reader flow.
- [ ] **17.3** Performance budget — cold start < 2s, TTI < 3s mid-Android, scroll > 58fps, bundle < 25MB.
- [ ] **17.4** i18n completeness — script flags missing keys, fails CI.
- [ ] **17.5** Privacy policy + T&C URLs from `/config` in profile screen.

---

## Phase 18 — Backend-readiness Handoff

- [ ] **18.1** `docs/API.md` (OpenAPI) from current services.
- [x] **18.2** Mock server + fixtures: 19 channels, 7d EPG, 20 catch-up items, 13 radio stations, auth, config.
  - **What:** Custom axios adapter override (`src/api/mocks/server.ts`) installed when `EXPO_PUBLIC_API_MODE=mock`. No extra deps — replaces `apiClient.defaults.adapter` with a function that matches `method + URL` against `handlers.ts`, returns fixture data after an optional delay, and falls through to the real network for unmatched routes. Fixture files in `src/api/mocks/fixtures/`: channels (19 RTSH/Albanian TV channels with placehold.co logos), radio (13 stations), epg (generator: 7-day window × all channels, 12 program slots/day), catchup (20 items spanning 7 days), auth (mock user + tokens), config. Installed at `_layout.tsx` module scope via `require('@/api/mocks/server').initMockServer()` so it's active before any React render — critical for the auth check on cold boot.
  - **Why:** Backend not ready. Without mocks, login returns a network error and the app stalls on the auth screen. With mocks in `EXPO_PUBLIC_API_MODE=mock`, the full flow is testable: login works, channels would list (once query hooks land), radio streams to a real public HLS test URL.
  - **Confidence:**
    - Adapter override pattern is correct for axios v1. [HIGH]
    - `require()` at module scope in `_layout.tsx` runs before any component mounts. [HIGH]
    - Mock server idempotent (guard flag prevents double-install). [CERTAIN]
    - Auth flow (login → store → Stack.Protected routing) works with mock tokens. [HIGH — would raise to CERTAIN by: running on simulator with `EXPO_PUBLIC_API_MODE=mock`.]
    - EPG generator produces correct ISO timestamps. [HIGH]
    - Stream URL (`test-streams.mux.dev`) is a public HLS source — validates player without a real RTSH stream. [MEDIUM — would raise to HIGH by: confirming the URL is accessible from device network.]
  - **Trade-offs / known gaps:** Catch-up item count is 20, not 200 as the original plan noted — adequate for visual testing; bump when FlashList performance profiling requires it. `placehold.co` logo URLs require network access; if testing fully offline, logos will 404 (channels still appear, just no image).
  - **Carry-overs:** When API contract lands, replace fixture shapes to match real response envelopes; delete mocks for typed services as they migrate to real endpoints.
- [ ] **18.3** `EXPO_PUBLIC_API_MODE` env switching. Dev menu quick switcher.
- [ ] **18.4** `src/config/featureFlags.ts` — local + remote from `/config`.

---

## Phase 21 — Device Testing & Distribution (deferred)

> Start this phase only when the app is feature-complete and ready for real-device testing and store submission.

- [ ] **21.1** Register physical devices: `eas device:create` → install profile on iPhone + Android.
- [ ] **21.2** EAS env vars on dashboard: `EXPO_PUBLIC_API_BASE_URL`, `SENTRY_DSN`, `MMKV_ENCRYPTION_KEY`.
- [ ] **21.3** EAS source-maps upload wired to Sentry on every build.
- [ ] **21.4** `eas build --profile development --platform all` — install on registered devices.
- [ ] **21.5** `eas build --profile preview --platform all` — internal distribution to testers.
- [ ] **21.6** EAS Update channels wired. JS-only hotfixes via `eas update --channel production`.
- [ ] **21.7** **iOS App Store Connect prep** — bundle ID `al.rtsh.tani` registered, listing draft, age rating, privacy labels, screenshots (6.7", 6.5", 5.5", 12.9"), app icon 1024×1024.
- [ ] **21.8** **iOS submit** — `eas submit --platform ios --profile production`. TestFlight → App Store review.
- [ ] **21.9** **Android Google Play prep** — package reserved, Play App Signing enabled, listing draft, IARC rating, data safety, feature graphic 1024×500.
- [ ] **21.10** **Android closed testing** — 14 days, ≥12 testers required before production.
- [ ] **21.11** **Android submit** — `eas submit --platform android --profile production`. Staged rollout.
- [ ] **21.12** Rejection-handling buffer — 5 working days.

---

## Working with Claude Code

For each step:
1. Open this file. Find the next `[ ]` step.
2. Tell Claude: `Working on step X.Y. Follow STYLE_GUIDE.md.`
3. Test with `npx expo run:android` locally.
4. Mark `[x]` when done.

## Reference

- Style guide: `.claude/rules/STYLE_GUIDE.md`
- Project memory: `.claude/memory/`
- Original spec: `../assets/4._DST_-_OTT.docx`
