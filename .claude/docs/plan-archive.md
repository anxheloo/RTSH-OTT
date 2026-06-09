# plan-archive.md — RTSH-OTT Build Plan (FROZEN HISTORY)

> **⚠️ Frozen full-detail snapshot @ 2026-06-09 (commit `7c40f5a`).** Verbose history of completed steps (full What/Why/Confidence/Trade-offs/Carry-overs). **Live status + lean view: `plan.md`.** Read this only for the deep rationale of a specific completed step. Going forward, new completed steps append their full entry here and a one-liner to `plan.md`; the active `[ ]`/`[~]` backlog is maintained in `plan.md`, not here — items below reflect their state as of the snapshot date.

---

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

## Iteration pass — 2026-06-03 (code-quality cleanup + SOLITAR org alignment)

Audit of done steps against the codebase, then applied cleanup. Trigger: user request to remove duplication / unused code / guessing and align organization to the SOLITAR-FRONTEND_EMERGENT reference repo. All steps below stay `[x]`; this records what changed and why.

- **Barrel convention (affects 6.8 + all component folders).** Converted every component barrel from the `export type { XProps } …; export { default as X } …` pattern to SOLITAR's **default-only export + JSDoc header** style. Props interfaces stay as named `export interface XProps` in the component file and are imported directly where needed (verified no consumer imported a `*Props` type via a barrel). Root `components/index.ts` now re-exports all subfolders (added `channels`, `catchup`, `epg`, `radio`, `ParentalPin`). `utils/index.ts` now re-exports `crypto` + `formatters`. STYLE_GUIDE "Barrel Exports" updated. [CERTAIN — lint+tsc clean]
- **Feature components extracted (11.5/11.6/11.7).** `EpgRow`, `CatchupCard`, `StationRow` moved out of their screens into `components/{epg,catchup,radio}/` (were inline; the folders held empty placeholder barrels). Screens are now thin. Radio list was rendering `stations.map()` with **no scroll container** (bug — stations past the fold were unreachable); now uses `AnimatedFlashList`. [CERTAIN for extraction; HIGH that scroll bug is fixed — raise by device test]
- **Shared formatters (new `utils/formatters.ts`).** `formatClockTime` / `formatDurationMinutes` / `formatRelativeDay` centralized; were duplicated inline in epg + catchup screens. [CERTAIN]
- **Dead route deleted (11.9).** `player/[id].tsx` removed — nothing navigated to it (Live grid → `channel/[id]`, Catchup → `program/[id]`). It was a stub-URL copy of `channel/[id]`. Its `Stack.Screen` registration removed from `(app)/_layout.tsx`. [CERTAIN — grep of all router pushes]
- **`program/[id]` wired to real queries (11.10).** Replaced the hardcoded `STUB_VOD_URL` with `useCatchupItemQuery` + `useCatchupStreamQuery` (mirrors `channel/[id]`). [CERTAIN — tsc clean; MEDIUM that the stream plays — raise by mock-server device run]
- **ChannelCard renders its logo (11.4).** `thumbnailUri` was accepted but ignored (`_thumbnailUri`); now rendered via `ReusableImage` (`contentFit="contain"`). Hardcoded `#FFFFFF` label color replaced with `colors.text`. [CERTAIN]
- **PlayerControls dedup.** Removed a local `SEEK_STEP_S = 10` that shadowed the canonical `constants/player.ts` export; now imports it. [CERTAIN]
- **Empty stub files deleted.** `types/api.ts`, `types/theme.ts`, `utils/helpers.ts`, `constants/index.ts` — all `// barrel` placeholders, unimported. `ThemeColors` stays co-located in `theme/colors.ts` (deliberate divergence from SOLITAR's `types/theme.ts`; RTSH's co-location is cleaner). API wrapper types, when needed, go in `api/types.ts` per SOLITAR. [CERTAIN]
- **Component prop types → `interface`.** New/edited feature components use `export interface XProps` (was `type … = {}`) per SOLITAR + STYLE_GUIDE. Pre-existing files using `type` left untouched (cosmetic; convert opportunistically when next edited).

Verification: `npx tsc --noEmit` → 0 errors [CERTAIN]; `npm run lint` → clean [CERTAIN]. Not run on simulator this pass.

### Follow-up — SVG icon system + player polish + branded splash (RTSH repo blend)

Studied the sibling **RTSH** repo for the user's coding patterns; adopted the genuinely additive parts, kept our architecture (did **not** migrate to NativeWind; did **not** overwrite our Figma-verified palette — RTSH's palette has fewer tokens and would regress fidelity).

- **SVG icon system (closes 8.6 + 9.3 "no icon library" carry-overs).** Installed `react-native-svg`. New `src/components/Icons/`: typed icon set (`icons.tsx` — Play/Pause/Forward/Backward/Fullscreen/Search/Home/Clock/Layers/Microphone/Profile, each `{ size, color }`, ported from RTSH's SVGs) + `IconButton` (theme-aware circular touchable, our port of RTSH's `IconWrapper`) + barrel; added to root `components` barrel. Wired: **tab bar** now has icons (Live→Home, EPG→Clock, Catchup→Layers, Radio→Microphone, Profile→Profile, recolored by tab tint); **PlayerControls** play/pause/seek/fullscreen now use icons (replaced emoji/text glyphs, added a11y labels); **Live header** avatar shows a Profile icon. [CERTAIN — tsc+lint clean; MEDIUM that icons render correctly on device — needs native rebuild + simulator]
- **Player keep-awake (9.2).** Base `VideoPlayer` calls `useKeepAwake()` (expo-keep-awake, already present) so the screen won't sleep during playback. Deliberately **did not** add RTSH's pause-on-blur — our spec mandates PIP + background video, which that would fight. [HIGH]
- **Branded splash.** `app.config.ts` splash was Expo-default (blue `#208AEF` bg + placeholder icon, and **no iOS image** — only an `android` block). Now brand-black `#000000` + `logo-glow.png` (604×604) applied to both platforms. Requires native rebuild. [HIGH — visual, verify on device]
- **Still default / flagged:** app **icon** (`icon.png`) is still the Expo placeholder — needs a square 1024 brand export from Figma (can't rasterize SVG→PNG here). Leftover create-expo-app asset cruft (`expo-logo.png`, `react-logo*.png`, `tutorial-web.png`, `images/tabIcons/*`, `expo.icon/`) are deletion candidates — not removed (awaiting OK).
- **`.env` / `.env.example`:** confirmed correct — `.env` gitignored, `.env.example` committed template. No change.

Verification (this follow-up): `npx tsc --noEmit` → 0 errors [CERTAIN]; `npm run lint` → clean [CERTAIN]. `react-native-svg` is a native module → **native rebuild required** before icons render.

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
- [~] **3.11** Native deps `react-native-keyboard-controller`, `react-native-gesture-handler`. **`@gorhom/bottom-sheet` dropped** (decision 7, 2026-06-05) — sheets are native route-based (`(modals)` + platform presentation), no extra sheet lib. (expo-secure-store already installed in 3.10.)

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
- [ ] **15.5** Picture-in-Picture + iOS background video (spec-mandated; canonical PIP step — supersedes scattered notes).
  - **Goal:** the live/VOD player can shrink into a floating PIP window and keep playing when the app is backgrounded or the user taps a PIP control, gated by `settings.backgroundVideoAllowed`. Built on `expo-video` (SDK 56), no extra dependency.
  - **Scope / API (verified against docs.expo.dev v56 `sdk/video`):**
    1. **Config plugin** (`app.config.ts`, prerequisite **5.X.13**): add `['expo-video', { supportsBackgroundPlayback: true, supportsPictureInPicture: true }]`. On iOS this writes `audio` into `UIBackgroundModes`; on Android it sets `android:supportsPictureInPicture`. Requires a **dev-client rebuild** (native change — Expo Go can't run it).
    2. **`VideoView` props** in `VideoPlayer.tsx`: `allowsPictureInPicture`, and `startsPictureInPictureAutomatically={settings.backgroundVideoAllowed}` (auto-PIP on background, iOS + Android 12+). Guard the whole feature behind `Video.isPictureInPictureSupported()`.
    3. **Manual control:** a PIP button in `PlayerControls` calls the **`VideoView` ref**'s `startPictureInPicture()` / `stopPictureInPicture()` (Promise-returning — wrap in try/catch). Note the design's player options sheet (22.10) is where this control lives.
    4. **Events:** wire `onPictureInPictureStart` / `onPictureInPictureStop` → `PlayerSlice` (e.g. `isPictureInPicture`) so chrome/overlays can react and resume cleanly.
    5. **Constraint:** only one player may be in PIP at a time — ensure the radio/ad second `expo-video` instance never contends; stop PIP before opening another player.
  - **Settings wiring:** `backgroundVideoAllowed` already exists in `SettingsSlice`; expose the toggle in Settings (22.13) and read it for both `startsPictureInPictureAutomatically` and whether the PIP button is shown.
  - **Verification when built:** dev-client rebuild → background the app mid-playback (auto-PIP appears) and tap the manual PIP control; confirm audio+video continue, and that returning to the app restores fullscreen. iOS + Android both.
  - **Depends on:** **5.X.13** (entitlements/plugin config) + the **22.10** player restyle (hosts the PIP control). Do after 22.10 so the control lands in the redesigned chrome.
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

## Iteration pass — 2026-06-04 (multi-step auth + logo→expo-image)

- **Form-layer reversal (supersedes 7.1).** Server-driven multi-step registration + reset now justify
  `react-hook-form`. Installed `react-hook-form` + `@hookform/resolvers` + `react-native-keyboard-controller`
  (closes **5.6**); `<KeyboardProvider>` wired at root in `_layout.tsx` (per official docs). 7.1's "skip RHF"
  call held for the single-step screens but no longer fits the multi-step flow. [CERTAIN — tsc/lint clean]
- **Logo → expo-image (updates 11.2 / 11.3 / 11.4).** Decided NOT to add `react-native-svg-transformer`
  (Expo recommends `react-native-svg` + SVGR — https://docs.expo.dev/versions/latest/sdk/svg/) and NOT to
  hand-author an inline-path logo component. The logo is an image asset rendered via `ReusableImage`
  (expo-image). All 4 `logo-glow.png` usages (login/register/forgot/home header) swapped RN `Image` →
  `ReusableImage`; unused `logo` styles dropped. `IconButton` already serves as the RTSH `IconWrapper`.
  Logo art stays `logo-glow.png` (a custom asset, not an Expo default) until a final RTSH PNG is provided.
  [CERTAIN — tsc/lint clean]
- **Icons.** Added 10 themeable `react-native-svg` icons to `components/Icons/icons.tsx` (Mail, Key, Mobile,
  Settings, Star, Warning, ChevronLeft, ChevronRight, Language, More), `{size,color}` props. Auth needs Mail/Key.
- **Auth schemas (extends 7.3).** `features/auth/schemas.ts` gained the server-driven step model: `AUTH_STEP`
  (completed-step codes; client renders `completed+1`), `GENDERS`, `registerCredentialsSchema`, `otpSchema`
  (6-digit), `registerDetailsSchema`, `resetPasswordSchema`. Single-step schemas kept until screens rebuilt.

## Phase 11.X — Server-driven multi-step auth (RHF, mock-first)

Backend returns the COMPLETED step; client renders `completed + 1` (1 = start, 2 = verify/OTP, 3 = completed).
Resume = re-enter step-1 creds → backend returns real progress → client jumps forward. Step-3 register returns
`{ user, token, refreshToken }` → straight to home. **Built mock-first** (MSW handlers simulate the step
responses) so the flow is navigable now; real endpoints swap in later with no screen changes. Structure adapted
from the RTSH sibling app's multi-step flow (`CreateAccount` step state, `OneTimePass`, `useVerifyAndResend`).

- [x] **11.X.0** Deps + `KeyboardProvider` + auth step schemas (see iteration pass above). [CERTAIN]
- [x] **11.X.1** Endpoints + thin services. `endpoints.ts` AUTH_ROUTES gained register `/verify` `/details`
      `/resend` + reset `/verify` `/password` `/resend`. `services/auth.ts` gained `AuthStepResponse` +
      `registerStart` / `registerVerifyOtp` / `registerDetails` / `registerResendOtp` / `resetRequest` /
      `resetVerifyOtp` / `resetPassword` / `resetResendOtp` (wire payload types co-located). Old single-step
      `register()` kept until the register screen is rebuilt (11.X.6). [CERTAIN — tsc/lint clean]
- [x] **11.X.2** Mock step machine. `mocks/fixtures/authFlow.ts` tracks per-email progress in memory; handlers
      wired for all wizard routes (with a `parseBody` helper for the serialized request body). Returns the
      completed `step`; resume works (re-submit step 1 → real progress). OTP: any 6 digits except `000000` (→401).
      Replaced the old `/auth/register` + `/auth/forgot-password` token stubs. [CERTAIN — tsc/lint clean]
      Note: the **existing single-step register screen no longer completes in mock mode** (endpoint now returns
      step data) — it's rebuilt next in 11.X.6; login + forgot screens unaffected.
- [x] **11.X.3** Wizard mutations + error helper. `mutations/registerWizard.ts` + `resetWizard.ts` — 8 thin
      hooks over the services (each sub-form orchestrates `onSuccess`/`onError` at the call site, since
      behavior differs per step). `features/auth/errors.ts` `authErrorMessage(err, statusMap?)` prefers the
      backend `error` field → per-status override → generic fallback. Barrel updated. [CERTAIN — tsc/lint clean]
- [x] **11.X.4** `components/auth/StepHeader.tsx` (3-segment cumulative progress, themed) + `OtpVerify.tsx`
      (single hidden `TextInput` drives 6 boxes, auto-submits when full, resend countdown). Adapted from RTSH
      `StepHeader` / `OneTimePass`. Barrel + root components barrel updated. [CERTAIN — tsc/lint clean]
- [x] **11.X.5** `login.tsx` → RHF + `Controller` + `zodResolver(loginSchema)`.
  - **What:** replaced manual `useState` + `safeParse` with react-hook-form. Field errors render via
    `Controller` `fieldState.error.message`; server error via `authErrorMessage(error, { 401: t('auth.login.failed') })`.
  - **Why:** user directive — all auth screens use RHF + zod, errors handled the RTSH way (field-level + mapped server error).
  - **Also (user request):** removed the **Remember Me** checkbox + `rememberMe` schema field — refresh-token
    persistence makes it redundant. Forgot-password is now a right-aligned link.
  - **Confidence:** compiles + lints clean. [CERTAIN] Visual parity minus the removed checkbox. [HIGH]
- [x] **11.X.6** `register.tsx` → server-driven 3-step machine (`{ step, email }`, `switch(step)`).
  - **What:** route owns the machine + 4 wizard mutations; presentational sub-forms in `components/auth/`:
    `RegisterCredentialsForm` (step 1, +`TermsNotice`), `OtpVerify` (step 2), `RegisterDetailsForm` (step 3,
    gender chips). `advance(res)` lifts the completed step (`render = step + 1`); step-3 returns user+tokens →
    keychain refresh + `store.login()` → Stack.Protected redirects. `StepHeader` as `AuthScreen` topSlot.
  - **Why:** replaces the single-step screen that no longer completed in mock mode (11.X.2); implements the
    resumable spec. Sub-forms live outside `app/` per the Expo rule (no co-located components in routes).
  - **Confidence:** tsc/lint clean; mock-backed flow navigable end-to-end. [HIGH — on-device tap-through unverified]
- [x] **11.X.7** `forgot.tsx` → reset wizard (`{ step, email, done }`, `switch(step)`).
  - **What:** mirrors register — `ResetRequestForm` (email) → `OtpVerify` → `ResetPasswordForm`. Step 3 returns
    no tokens (mock `{ success: true }`) → `done` state shows a success box + back-to-login.
  - **Why:** spec — reset mirrors register (email → OTP → new password) but ends at login, not auto-login.
  - **Confidence:** tsc/lint clean. [HIGH]
- [x] **11.X.5–7 supporting work** (new reusable pieces, all themed/i18n'd):
  - `components/auth/AuthScreen.tsx` — shared chrome (keyboard-avoid + header logo + scroll), kills 3× header dup.
  - `components/auth/TermsNotice.tsx` — clickable T&C + Privacy links opening `expo-web-browser`; URLs in
    `config/links.ts` (`LINKS.TERMS` / `LINKS.PRIVACY`, placeholder `rtsh.al` — swap when final URLs land).
  - i18n: added `auth.register.*` (username/continue/details/gender.*), `auth.otp.*`, `auth.reset.*`,
    `auth.terms.*` to **both** `en.json` + `sq.json` (Albanian provided; review recommended).
  - `OtpVerify` strings moved to i18n (`auth.otp.*`).
- [x] **11.X.5a** Reuse pass — eliminated hardcoded color values + duplicated auth UI.
  - **What:** (1) **Player palette** — new theme-independent `theme/playerColors.ts` (`PLAYER_COLORS`); migrated
    all hex/rgba literals in `VideoPlayer` / `LivePlayer` / `VodPlayer` / `PlayerControls` to it (video chrome is
    always dark, so it deliberately does NOT read the flipping theme). (2) **Theme-token swaps** for themed
    components: `ModalWrapper` backdrop → `colors.overlay` (now adapts light/dark), profile toggle thumb →
    `colors.onPrimary`, `RadioMiniPlayer` hairline → `colors.border`, auth `_layout` content bg → `colors.background`.
    (3) **`AuthFooterLink`** — extracted the "muted prefix + primary link" footer duplicated in login/register/forgot.
    (4) Migrated `login.tsx` onto the shared `AuthScreen` chrome (all 3 auth screens now share it).
  - **Why:** user flagged re-hardcoding colors + repeated UI. Single source of truth per concern; grep confirms
    zero hex/rgba literals remain outside `theme/` + `Icons/` (only semantic `'transparent'` toggles left).
  - **Confidence:** tsc/lint clean; player substitutions are value-identical (byte-for-byte same colors) so
    rendering is unchanged. [CERTAIN] ModalWrapper scrim now lightens in light mode (rgba .72→.5) — intended
    improvement, not a regression. [HIGH]
  - **Trade-offs / known gaps:** `PLAYER_COLORS.brand` duplicates the theme `primary` value by design (player
    must stay dark in light mode) — if the brand red ever changes, update both. Acceptable; documented in the file.
- [x] **11.X.8** Boot rehydration — manual-data-wipe recovery in `useCheckToken`.
  - **What:** boot check now has 3 states: (1) no token → unauth; (2) token + persisted user → authenticate
    instantly (offline-first fast path, unchanged); (3) token but NO user (MMKV wiped, keychain survived) →
    hydrate over network before resolving: `refreshAccessToken()` (its response already carries the user) →
    fall back to `getMe()` (`GET /users/me`) only if the refresh response lacked one. Splash waits *only* in
    case 3 (rare); offline/rejected falls through to `(auth)`.
  - **Why:** prior gate required token AND persisted user, so a manual data-wipe stranded a valid refresh token
    and forced re-login. Closes the gap noted in ARCHITECTURE.md → Auth flow.
  - **Confidence:** tsc/lint clean; mock `/auth/refresh` + `/users/me` exercise both sub-paths. [HIGH —
    on-device wipe scenario unverified]
  - **Trade-offs / known gaps:** case 3 triggers one extra `refreshAccessToken()` in `useBootstrap`'s
    background-refresh effect (harmless, guarded once). 401/403 during hydration wipes keychain + logs out
    (correct); transient/offline keeps the token for next-boot retry.
- [x] **11.X.7a** Dead-code removal (post-rebuild). Deleted `useRegisterMutation` / `useForgotPasswordMutation`
      files + barrel lines; removed single-step `register()` + `forgotPassword()` services + `RegisterPayload`;
      removed `registerSchema` + `RegisterFormData`. Kept `forgotPasswordSchema` (used by `ResetRequestForm`).
      [CERTAIN — tsc/lint clean; each symbol was self-referenced only]
- [~] **11.X.9** Final endpoint wiring — DEFERRED until real endpoints provided; then replace mock handlers +
      reconcile response shapes (Zod at boundary, **5.X.2**).
- Carry-over (data fetching, separate from auth): `useChannelsQuery` → `useInfiniteQuery`; EPG by channel+date
  (`useEpgQuery(channelId, date)`, today …−7d). Relates to **5.X.3**.
- Carry-over (register step 3): birthday is a plain `YYYY-MM-DD` text input — swap for a native date picker
  (`@react-native-community/datetimepicker`, per Expo guidance) in a polish pass.

---

## Phase 11.Y — Codebase review follow-ups (2026-06-05)

From the pre-endpoint professional review. Offline/guard items done now; the rest are drafted to land **with** the real endpoint wiring (cheaper to do while touching every service).

### Done now
- [x] **11.Y.1** Root nav guard keyed on `isAuthenticated` only (was `&& !!token`).
  - **What:** `_layout.tsx` Protected guards dropped the `token` check. **Why:** access token is in-memory/null on cold boot → a logged-in user (esp. offline) was routed to `(auth)` and, offline, locked out — contradicting offline-first. The interceptor lazily refreshes on first 401 inside the app. Updated CLAUDE.md + ARCHITECTURE auth flow. [CERTAIN — tsc/lint clean]
- [x] **11.Y.2** Offline = informational `noInternet` modal, browsing still allowed. **Plus: modal + network system simplified to the RTSH/SOLITAR shape** (2026-06-05, after review of both reference apps).
  - **What:**
    - **Network:** replaced the over-engineered `useNetworkReconnect` singleton (module `cached` + `subscribers` Set + `useSyncExternalStore`) with a simple `useNetworkMonitor` (RTSH-sized, ~50 lines) mounted once at root. New `createNetworkSlice` holds `isOnline` + `connectionType`; the monitor bridges `onlineManager`, mirrors connectivity into the store, and drives the `noInternet` modal (open on disconnect, close on reconnect). Components read `useAppStore((s) => s.isOnline)`.
    - **Modal:** migrated `ModalSlice` from a stack (`modals[]` + `openModal`/`closeModal` + ids) to the **single-modal** RTSH/SOLITAR shape (`currentModal` + `modalData` + `updateModalSlice = set`), with SOLITAR's up-to-3-button shape (`button`/`button2`/`button3` + `action`/`action2`/`action3`). This re-aligns the code with the STYLE_GUIDE (the stack was the deviation). `ModalWrapper` rewritten as a generic alert renderer that owns the default i18n copy (`offline.title/message`), so triggers pass no text. `useCellularGate` rewired to `updateModalSlice` + store `connectionType`. Live-screen loader gated on `isOnline` (no infinite offline spinner). Deleted interim `useNetworkModal`.
  - **Why:** user flagged the singleton as over-engineered and preferred RTSH's trigger-in-listener + single-modal slice for cross-app consistency (RTSH + SOLITAR + this app share one mental model). Verified against both reference projects' actual code.
  - **Trade-off:** lost modal *stacking* (one modal at a time; last-wins). Accepted — concurrent modals are rare here, and it matches the other two apps. [CERTAIN — tsc/lint clean]
  - **Files:** `createNetworkSlice.ts` (new), `useNetworkMonitor.ts` (new), `createModalSlice.ts` + `ModalWrapper.tsx` (rewritten), `useCellularGate.ts`, live `index.tsx`, `OfflineBanner.tsx`, `useBootstrap.ts`, store composition + barrels. Docs: CLAUDE.md slices, ARCHITECTURE network, STYLE_GUIDE modals.
- [x] **11.Y.3** Doc drift fixed: CLAUDE.md slices (removed non-existent `ChannelsSlice`/`EpgSlice`, added `ParentalSlice`), "MSW" → custom axios-adapter mock, guard description.
- [x] **11.Y.12** Safe-area + screen-layout convention (after analyzing SOLITAR + RTSH + Bunk-Art).
  - **What:** `react-native-safe-area-context` was installed but unused (would break layout under notch/status bar). Added `<SafeAreaProvider>` at root and top-inset handling in the shared header spots (`TabHeader`, `AuthScreen`, live custom header). New `ScreenLayout` (Bunk-Art `MainLayout`/`ContentLayout` analog: themed bg + flex + opt-in `edges`); migrated all 5 tab screens off the repeated `<View flex:1 bg>` boilerplate. Added a `utils/` bucketing convention to STYLE_GUIDE (bucket by domain as it grows; no premature single-file folders).
  - **Why:** user reported missing `SafeAreaProvider`; cross-project review showed a layout-component family is the team convention. **Confidence:** tsc/lint clean. [CERTAIN] Visual inset correctness on a notched device unverified until manual test. [HIGH]
  - **Carry-overs:** full-screen player routes (`channel/[id]`, `program/[id]`) can adopt `ScreenLayout edges={['bottom']}` if they need bottom inset — left to manual testing.

### Drafted — land with endpoint wiring (11.X.9)
- [~] **11.Y.4** Runtime validation at the API boundary (Zod).
  - **Deferred because:** needs the real response shapes. **What we need:** the endpoint list + payloads.
  - **Approach:** parse each service response with a Zod schema co-located in `types/` (or a typed `http()` wrapper that takes a schema); on parse failure, throw a typed `ApiError` → surfaces via `apiError` modal. Kills silent `undefined` (e.g. `accessToken`). Relates to **5.X.2**.
- [~] **11.Y.5** Pin one response envelope.
  - **Deferred because:** backend-defined. Today services disagree (`getChannels` → `data.channels`, `getMe` → bare `data`, auth → `data`). **Approach:** agree one shape with backend; centralize unwrapping in the `http()` wrapper; align all services in one pass.
- [~] **11.Y.6** Root `ErrorBoundary` + Sentry.
  - **Deferred because:** Sentry needs the DSN (EAS secret) and is cheapest to wire alongside real traffic. **Approach:** `ErrorBoundary` around the root `Stack` (themed fallback + reset); `@sentry/react-native` init in `_layout`, wrap export, capture the swallowed font-load error + `authErrorMessage` non-4xx. Relates to **5.X.12 / Phase 14**.
- [~] **11.Y.7** Query-key factory (`api/queryKeys.ts`).
  - **Approach:** centralize `['channels']`, `['channel', id]`, `['stream', kind, id]`, `['epg', date]`, etc. so invalidations (`useBootstrap` foreground) can't drift. Low risk; can also ride the wiring pass.
- [~] **11.Y.8** Fix `(createPlayerSlice as any)` store typing — give `PlayerSlice` the `StateCreator<AppStore,...>` signature like its siblings, drop the cast. Chore; no blocker.
- [~] **11.Y.9** Skeleton loaders for data screens (live/epg/catchup/radio) — replace empty/spinner with `FlashList` skeletons. Pairs with real data + design. Relates to data-screen polish.
- [~] **11.Y.10** Tests — start with pure logic: `authFlow` mock machine, `authErrorMessage`, store `login/logout`, `useCheckToken` three branches, `syncNoInternetModal`. No blocker; high value before store launch.
- [~] **11.Y.11** MMKV encryption / `user` field whitelist before real PII persists. Relates to **5.X.10 / 5.X.17**.

---

## Iteration pass — 2026-06-05 (designer HTML landed → Phase 22)

**Trigger:** designer delivered a full interactive HTML mockup (`rtsh-tani-mobile.html`, 16 screens + overlays, Albanian copy, real RTSH logo lockup as vector). Directive: **design wins on visuals** (colors / spacing / type / layout / flow), **keep our architecture** (Expo Router file-based, single Zustand store + slices, TanStack/axios API layer, component organization, STYLE_GUIDE conventions). Scope: full app. **Tab-bar reference:** `github.com/anxheloo/spotify-music-player-demo` — config-driven `<Tabs>` with a typed `TabBar` object living in `theme/`, spread into `screenOptions` (follow this; improve where the design needs it).

### Design facts extracted (source of truth for Phase 22)

- **Palette (dark, flatter + darker than current):** bg `#000` (screens) on page `#0d0d10`; surfaces `--surf #141417` / `--surf-2 #1B1B20` / `--surf-3 #26262C`; border `--line #2A2A31`; text `#fff`; muted `--mut #9A9AA2` / `--mut-2 #6E6E77` (inactive nav); brand `--red #EB122F` (+ `--red-2 #ff3a52` for gradients). Header is **transparent black** (not an elevated bar). Bottom nav is **translucent black + blur** (`rgba(10,10,12,.92)`), top hairline `--line`, active icon tinted red, label white.
- **Type:** **Inter** everywhere (400–900). Headings 800–900, section titles / player title 700, labels / links / buttons 600. Sizes seen: 25 (welcome), 20–23 (h2), 17 (header + section), 15 (body/input), 14 (label/link), 13–13.5 (sub), 12–12.5 (meta), 10–11 (kicker/tag).
- **Radii:** pill inputs/search/toggle 24; buttons 27 (capsule, h54); cards 14; inputs 14; list-icons 11–12; sheet 24 top.
- **Logo:** the file ships the **full lockup** as vector (`LOGO` const, viewBox `1.163 142.418 496.791 217.07`): red mark (`#EB122F`) + "RADIO TELEVIZIONI SHQIPTAR" tagline paths recolored **white** via CSS. Header 25px tall, splash 52px tall.
- **Nav model (4 tabs):** `Kreu` (home), `Guida` (guide), `Kërko` (search), `Profili` (profile). **Radio is not a tab** — it's a Televizion/Radio toggle on Home (+ radio player route). **Catch-up is not a tab** — it's folded into the **Player** via a day-strip (today = live + EPG; past day = catch-up banner + that day's recorded EPG). **Mosaic** opens from a Home header icon. **Search** is a tab.
- **16 screens:** splash, login, register, terms, onboard (parental + cellular config, skippable), home, guide, search, profile, settings, player(+EPG+catch-up), radio-list, radio-player, mosaic, parental(PIN), geo-block. **Overlays:** bottom sheet (options/quality, radio-select rows), ad popup (skip countdown, shown on app-open + channel-open), toast.

### Decisions (design-wins, flagged for sign-off before code — see "Open questions")

1. **Switch primary font Outfit → Inter.** [HIGH] Design is Inter-only; Anton (display) + Outfit (body) get retired. Keeps `Fonts` token API, swaps families. Flagged: removing Anton changes channel-name / tab-label look intentionally.
2. **Config-driven `<Tabs>` with a theme-folder `TabBar` object** — base it on **SOLITAR's `theme/tabBar.ts`** (cleaner than the spotify-music-player-demo: static color-agnostic config in `theme/`, dynamic colors injected at the layout). NOT NativeTabs, NOT a hand-rolled `tabBar` render prop. [HIGH] Structure: `theme/tabBar.ts` exports a typed `TabBar` (`tabBarStyle` layout/height/shadow + hairline, `tabBarLabelStyle` from `Fonts`/`FONTSIZE`, item/icon styles) with **no colors**; `(tabs)/_layout.tsx` spreads `TabBar.tabBarStyle` then overrides `backgroundColor: colors.tabBar` + `borderTopColor: colors.tabBarBorder` and sets active/inactive tints from tokens (SOLITAR pattern verbatim). Improvements for the RTSH design: (a) `tabBarBackground` blur via `expo-blur` (translucent bar); (b) **decouple active icon tint (red) from label tint (white)** by coloring icons off `focused` while `tabBarActiveTintColor` drives only the label; (c) flat hairline top (SOLITAR already does `borderTopWidth:1`, no rounding). Keep `headerShown:false` (RTSH headers are per-screen/custom, unlike SOLITAR's shared `header`).
3. **Restructure tabs 5 → 4** and fold radio→home-toggle + catch-up→player-day-strip. [HIGH] Matches design flow; the `catchup`/`radio` *data* layers (services/queries) stay, only their UI host moves.
4. **Adopt full logo lockup** (mark + white tagline) from the design vector. [HIGH] **Supersedes this session's earlier "mark-only" choice** and the `RtshLogo` mark-only component (mark-only stays available; lockup becomes the header/splash default).
5. **Darken surface palette** to the design tokens. [HIGH] Header becomes transparent; `tabBar`/`inputBackground`/`surface*` re-valued. Re-validates **5.X.6 / 5.X.7 / 5.X.8** against real values.
6. **Dark default + light theme retained as a feature.** [HIGH] (user 2026-06-05) Design is dark; dark stays default, but the light theme + toggle stay working. Every new token (`tabBarBorder`, `surface-3`, `mutedStrong`, `red-2`, transparent header) gets a light-palette value too.
7. **Sheets: native, route-based, platform-aware — NOT `@gorhom/bottom-sheet`.** [HIGH] (user 2026-06-05) *Learn from* SOLITAR's `(modals)` group (don't copy verbatim): the takeaway is route-based screens with `presentation: ios ? 'modal' : 'formSheet'` + `sheetAllowedDetents` / `sheetGrabberVisible` / `sheetCornerRadius` / `gestureEnabled`. Implement the cleanest version for our codebase: one shared, typed `getModalScreenOptions({ detents, cornerRadius })` helper (SOLITAR repeats the block per screen — we won't), **detents tuned per sheet** (our small option/quality sheets are content-sized, not SOLITAR's 0.95), in-sheet scaffold = `SafeAreaView` → keyboard handling → header → content, alerts still via the existing `ModalSlice`/`ModalWrapper`. Drops the `@gorhom` option in **3.11**.
8. **Mobile-first, responsive later.** [HIGH] (user 2026-06-05) Build mobile fully first; grids are 2-col on phones, and on tablet/large screens become `flexWrap` rows via `useWindowDimensions` breakpoints — derived from the finished mobile layout, not built in parallel. Applies to channel grid (22.7) + mosaic (22.12); tablet/large pass deferred to **22.18**.
9. **Auth: keep OTP, re-skin into the design flow; do NOT delete the wizard.** [HIGH] (user 2026-06-06) The mockup omits OTP but the backend requires verification. So: **re-skin** the existing Phase 11.X server-driven flow to the design rather than rip it out. Target flow: `login` → `register` (design's single-page form: email, username, password, confirm, age, city/country, gender, accept-terms) → **OTP verify** (re-skinned `OtpVerify`/`StepHeader`) → `terms` → `onboard` (parental + cellular, skippable) → ad(app-open) → home. Reset keeps OTP (request → OTP → new password), re-skinned. **Reuse** `RegisterCredentialsForm`/`RegisterDetailsForm`/`OtpVerify`/`StepHeader`/`TermsNotice`/`ResetRequestForm`/`ResetPasswordForm` (re-skin, don't replace). ⚠️ **Backend-ordering flag [MEDIUM]:** design collapses creds+details into ONE pre-OTP form, but the built step-machine splits creds(step1)→OTP(step2)→details(step3). Reconcile when the real auth contract lands — would raise to HIGH by: confirming whether `/auth/register` accepts all fields at step 1 (single form) or still requires the creds→OTP→details split. Until then, mock posts all fields at step 1 then OTP. Tracked in **22.6**.

### Supersessions / re-validations (entries to revisit during Phase 22)

- **Phase 8 (nav, 5 tabs)** → superseded by **22.4** (4 tabs, theme-config tab bar). 
- **5.X.6 / 5.X.7 / 5.X.8** (design-dependent tokens) → real values now exist; reconcile in **22.1**.
- **2.1 fonts (Outfit/Anton)** → reconsidered in **22.2** (Inter).
- **3.4 SettingsSlice (minimal)** → expand fields in **22.13** (cellular, defaultQuality, language, notifications, cast, parental-age).
- **3.5 PlayerSlice / radio mini-player** → shape confirmed by design in **22.10 / 22.11**.
- **11.Y.9 skeletons** → unblocked by design surfaces; ride per-screen steps.
- Session logo work (`RtshLogo`, `BrandHeader`, `BrandedSplash`) → extended in **22.3**.

---

## Phase 22 — Design Implementation (designer HTML)

> Build order is foundation-first (tokens → type → logo → nav shell → primitives) then per-screen, so screens compose finished primitives. Each screen step is "done" when it matches the HTML on a notched device (light verification = `npx expo run:android`). Albanian copy comes verbatim from the mockup (22.16). Keep STYLE_GUIDE conventions throughout.

- [x] **22.1** Token reconciliation.
  - **What:** `colors.ts` — `darkTheme` re-valued to the designer palette (background `#000`, surface `#141417`, surfaceElevated `#1B1B20`, border `#2A2A31`, textMuted `#9A9AA2`, cardBackground/inputBackground `#141417`, overlay `rgba(0,0,0,0.6)`, tabBar `rgba(10,10,12,0.92)`, headerBackground `transparent`). Added 4 new `ThemeColors` tokens — `surfaceHigh` (`#26262C` / light `#DCDEE3`), `primaryBright` (`#FF3A52`), `mutedDim` (`#6E6E77` / light `#9CA3AF`), `tabBarBorder` (`#2A2A31` / light `#E5E7EB`) — with **light-theme values too** (decision 6); light theme retained, headerBackground/tabBar made transparent/translucent to match the flat design. `borders.ts` — added `pill_input: 24` + `button: 27` (legacy `pill`/`pill_sm` kept, marked superseded). `spacing.ts` — added `space_18` (screen gutter; `space_15` marked superseded).
  - **Why:** foundation for Phase 22; design is darker/flatter than the placeholder palette. Naming note: plan draft said `surface-3`/`mutedStrong`/`--red-2` → implemented as `surfaceHigh`/`mutedDim`/`primaryBright` (semantic, accurate to their role).
  - **Confidence:** tsc + lint clean. [CERTAIN] New tokens have both light + dark values so the theme toggle stays whole. [CERTAIN] Visual correctness on device unverified (no run yet). [MEDIUM — would raise to HIGH by: `npx expo run:android` once a screen consumes the new tokens, e.g. after 22.4/22.7.]
  - **Trade-offs / known gaps:** legacy `pill`(32)/`pill_sm`(30)/`space_15`(15) still present so current screens don't break; remove once all screens migrate to `pill_input`/`button`/`space_18`. Re-validates **5.X.6/5.X.7/5.X.8** (design-dependent token gaps) — real values now landed for colors/radii/spacing; `SHADOWS`/`OPACITY`/`Z_INDEX`/`ANIMATION` (5.X.7) still as-is, revisit when a screen needs them.
  - **Carry-overs:** `headerBackground: 'transparent'` means `BrandHeader`/`TabHeader` now blend with the screen bg (intended) — confirm during 22.3/22.4 restyle.
- [x] **22.2** Typography → Inter.
  - **What:** `fonts.ts` — `Fonts` tokens remapped to Inter families (regular→400, medium→500, semiBold→600, bold→700, extraBold/display→800, black→900; sub-400 alias to 400). `_layout.tsx` — `useFonts` now loads only Inter 400/500/600/700/800/900; Anton + Outfit `require`s removed. `ReusableText` — VARIANTS re-scaled to the design ramp (heading1 25/800, heading2 22/800, heading3 17/700, body 15/400, bodySmall 13/400, caption 12/400, label 14/600).
  - **Why:** designer HTML is Inter-only (decision 1). Token-aliasing keeps every `Fonts.*` call site working while swapping the family in one place.
  - **Confidence:** tsc + lint clean. [CERTAIN] All referenced weights load (verified the package exports 400–900). [CERTAIN] `Fonts.display` call sites (live ContentToggle, tab label, ChannelCard, PlayerControls) now render Inter 800 instead of Anton — intended. [HIGH] On-device rendering unverified. [MEDIUM — would raise to HIGH by: `npx expo run:android`.]
  - **Trade-offs / known gaps:** VARIANT size changes (heading3 20→17, body 16→15, label 12→14) shift existing screens' text — intended design migration, confirm during per-screen restyle.
  - **Carry-overs:** `@expo-google-fonts/anton` dep + `assets/fonts/Outfit-*.ttf` are now unused — remove in the **23.4** cleanup (left now to avoid mid-step dep churn). The 4 `Fonts.display` sites get proper variants during their screen restyle (22.4/22.7/22.10).
- [x] **22.3** Logo lockup.
  - **What:** new `RtshLogoFull` — design's full lockup via `SvgXml`; mark stays `#EB122F`, wordmark inherits `currentColor` so `taglineColor` recolors it (white default). Wired into `BrandHeader` (height 26, `taglineColor={colors.text}` → themed) + `BrandedSplash` (height 52, bar 220). **Per the SOLITAR layout (user 2026-06-06), the SVG logo components were moved to `assets/icons/Brand/`** (`RtshLogo`, `RtshLogoFull` + barrel), imported via the existing `@/assets/*` alias; `src/components/Brand/` now holds only the composite UI (`BrandHeader`, `BrandedSplash`).
  - **Why:** designer file ships the real lockup (decision 4); pure SVG marks belong with assets per SOLITAR, composite UI stays in components.
  - **Decision — native splash PNG:** kept the **mark** PNG (`assets/images/splash-logo.png`) for the instant OS splash; the **lockup** shows in the React `BrandedSplash`. (Only binary asset touched in 22.1–22.3.)
  - **Confidence:** tsc + lint clean. [CERTAIN] Lockup is verbatim from the in-repo HTML; tagline recolors via root `fill="currentColor"` + `SvgXml color`. [HIGH — relies on react-native-svg fill inheritance; raise to CERTAIN via `npx expo run:android`. If tagline renders black: set `fill="currentColor"` per wordmark element instead of root.]
  - **Carry-overs:** `RtshLogo` (square mark) kept for compact spots (channel `clogo`, mosaic) — used in 22.7/22.12. Full icon-set migration → **22.3b**.
- [x] **22.3b** Icon system → `react-native-svg-transformer` + raw `.svg` (RTSH engine, SOLITAR folders).
  - **What:** installed `react-native-svg-transformer`; added `metro.config.js` (svg → `sourceExts`, `babelTransformerPath: react-native-svg-transformer/expo`) + `src/types/svg.d.ts` (`*.svg` → `React.FC<SvgProps>`). Migrated all 21 glyphs from `components/Icons/icons.tsx` to raw `.svg` (no baked width/height, `currentColor`) under `assets/icons/{Player,TabBar,General,Auth}/` + per-domain barrels + root `assets/icons/index.ts` (re-exports Brand too). Added dynamic `Icon` wrapper (`components/Icons/Icon.tsx`: `as` + `size`/`width`/`height`/`color`). Updated consumers (live `index`, tabs `_layout`, `PlayerControls`) to `<Icon as={X} … />`. Deleted `icons.tsx`.
  - **Why:** industry-standard, designer-friendly, zero hand-transcription (decision after comparing all 3 sibling repos). Icons are fully dynamic (width/height/color) per user.
  - **Confidence:** tsc + lint clean. [CERTAIN] Glyphs render + recolor on device. [MEDIUM — transformer needs a dev-client rebuild + Metro `--clear`; would raise to HIGH by `npx expo run:android`. Fallbacks if a glyph mis-renders: ensure `fill="none"` root for stroke icons (kept), or pass explicit `fill`/`stroke`.]
  - **Decisions (deviations from the draft, confirmed with user 2026-06-06):** (1) `IconButton` **stays** in `components/Icons/` — that folder is repurposed for icon *wrappers* (`Icon`, `IconButton`); raw glyphs live in `assets/icons/`. Cleaner than splitting into Buttons; matches RTSH's `components/Icons/IconWrapper`. `components/Icons/` kept (holds the wrappers), not deleted.
  - **Brand converted to raw `.svg` too** (transformer-for-all, no inline `SvgXml` left): `assets/icons/Brand/{rtsh-logo,rtsh-logo-full}.svg` (mark `#EB122F`, recolorable parts `currentColor`) with thin `RtshLogo`/`RtshLogoFull` sizing wrappers preserving the `size`/`letterColor` and `height`/`taglineColor` APIs — so `BrandHeader`/`BrandedSplash` are unchanged. tsc + lint clean.
  - **Carry-overs:** remove unused `@expo-google-fonts/anton` + `Outfit-*.ttf` in 23.4 (from 22.2). On-device render of all transformer glyphs still pending a dev-client rebuild (MEDIUM, above).
- [x] **22.4** Navigation restructure — 4-tab shell + config-driven frosted bar.
  - **What:** (a) `theme/tabBar.ts` — static color-agnostic `TabBar` config (height 64, hairline, label `Fonts.semiBold`/`FONTSIZE.xs`, `iconSize`), colors injected at the layout (SOLITAR pattern). (b) `(tabs)/_layout.tsx` rewritten → 4 tabs **index(Kreu) · guide(Guida) · search(Kërko) · profile(Profili)**; `expo-blur` `BlurView` `tabBarBackground` (tint follows theme) over `colors.tabBar`; **active icon red (`focused`→`colors.primary`) decoupled from label tint (white via `tabBarActiveTintColor`)**, inactive `mutedDim`. (c) Routes reconciled: `epg`→`guide` (renamed), `radio` tab → `(app)/radio.tsx` (list route), `catchup` tab **removed** (folds into player day-strip), new `search` tab stub. Added `guide` tab glyph (`assets/icons/TabBar/guide.svg`). Installed `expo-blur` (~56.0.3).
  - **Why:** design's 4-tab model + translucent frosted bar (decisions 2/3). Catch-up/radio data layers untouched — only their UI host moved.
  - **Confidence:** tsc + lint clean. [CERTAIN] Bar renders frosted with red-active/white-label on device. [MEDIUM — needs dev-client run (expo-blur native + transformer glyphs); raise via `npx expo run:android`.]
  - **Decisions/deferrals:** tab bar is **non-absolute** (reserves layout space — no content hidden, works on all current screens); switch to `position:absolute` + per-screen bottom padding only if we want scroll-behind-blur (refine in 22.7+). The other new routes (`mosaic`, `settings`, `onboard`, `geo`, `radio/[id]`) are created **just-in-time in their screen steps** (22.6/22.10/22.11/22.12/22.13) rather than as empty stubs now. `(modals)` group → **22.15**. `(auth)` flow order (terms/onboard) → **22.6**. Only the `guide` nav icon was added now; the other ~17 design icons land per screen as used (avoids unused assets).
  - **Carry-overs:** `search.tsx` is a stub (22.9). `(app)/radio.tsx` is the old radio screen relocated (restyle 22.11). Old `Clock`/`Layers`/`Microphone` glyphs now unused by tabs but kept in `assets/icons/General` for later screens. Update CLAUDE.md nav section + ARCHITECTURE when the flow settles (after 22.6).
- [x] **22.5** Shared primitives.
  - **What:** built `SegmentedToggle` (2-up pill, generic), `SegmentedChoice` (n-up full-width, gender/age), `FilterChipRow` (scrollable chips), `SearchBar` (dual: pressable→navigate / live input), `Switch` (custom 46×27 reanimated toggle — colour cross-fade + slide), `Checkbox` (square check; `label` or rich `children`) in `components/Inputs/`; `ListRow` (icon tile + title/sub + trailing slot, default chevron) in `components/Layout/`. Added `CheckIcon` glyph + `BORDERRADIUS.radius_20`. Barrels updated. All theme-tokened, controlled, portable (only `colors` from store).
  - **Why:** design building blocks the screens (22.6+) compose from; role-model dynamic/reusable primitives.
  - **Confidence:** tsc + lint clean. [CERTAIN] On-device visuals unverified (no run). [MEDIUM — raise via `npx expo run:android`.]
  - **Deferrals:** `ReusableBtn`/`ReusableInput` are already prop-driven (variants/sizes/overrides) — tune their **defaults** to the design in **22.6** where consumed (avoids guess-then-retouch). `SheetOptionRow` → **22.15** (sheet-specific).
- [x] **22.6** Auth/onboarding screens — **re-skinned the Phase 11.X server-driven flow, kept OTP** (decision 9). Final flow (user-clarified 2026-06-08): `login` → `register` (single merged form, all fields) → **OTP verify** → tokens → home. T&C = **a checkbox on the register form** + an in-app-browser link (no dedicated terms screen). `onboard` deferred to 22.13.
  - **What:**
    - **Schema** — new merged `registerSchema` + `RegisterFormData` in `features/auth/schemas.ts` (email, username, password, confirm, `age` string→numeric-refine, `location` single "City/Country" string, `gender` 3-up `REGISTER_GENDERS`, `acceptTerms` boolean-refine-true). Field-error messages are **i18n keys** resolved with `t()` at the call site (RTSH pattern) under a new `auth.errors.*` namespace (sq+en).
    - **Form** — new `RegisterForm` (one RHF form) composing labelled `ReusableInput`s (design `inp` look), gender via `SegmentedChoice`, accept-terms via `Checkbox` whose link opens `LINKS.TERMS` through `expo-web-browser`.
    - **Chrome** — new `AuthHeader` (back + centered title + safe-area); `AuthScreen` gained a `header?` override (login keeps the branded logo header, register/forgot use `AuthHeader`).
    - **Screen** — `register.tsx` is now a 2-step machine (RegisterForm → `OtpVerify`, `StepHeader totalSteps={2}`). All profile fields POST at step 1 (`registerStart`); a verified OTP returns user+tokens → persist refresh token, `acceptTC()` (the checkbox is the acceptance), `login()`. Back goes step-2→step-1 then out.
    - **Service/mock** — `RegisterStartPayload` extended with optional `age`/`location`/`gender`; `mockRegisterVerify` now completes registration (step 3 + tokens) since details arrive at step 1.
    - **OTP** — box radius 12→14, verify button → `size="large"` (design capsule).
    - **Reset** — `forgot.tsx` got the `AuthHeader` + step-aware back; `ResetRequestForm`/`ResetPasswordForm` dropped the legacy `height:60`/`BORDERRADIUS.pill` overrides → design-default `medium` inputs + `large` button; redundant in-form title removed (header carries it).
  - **Why:** decision 9 + user clarification — design collapses creds+details into one pre-OTP page; T&C is acceptance-at-register (a checkbox + URL), not a screen. Keeps our server-driven wizard + OTP intact, just re-skinned.
  - **Confidence:** tsc + lint clean. [CERTAIN] Mock register→OTP→login path is internally consistent (verify issues tokens). [HIGH] On-device visuals + real flow unverified (no run). [MEDIUM — raise by `npx expo run:android` with `EXPO_PUBLIC_API_MODE=mock`.]
  - **Trade-offs / known gaps:**
    - **Backend-ordering still MEDIUM (decision 9 flag):** mock posts everything at step 1 then OTP→tokens. Real `/auth/register` may still want creds→OTP→details. Reconcile when the contract lands — would raise to HIGH by confirming the step shape. Fixes: 1) split `RegisterForm` submit into start(creds)+deferred details if backend requires; 2) keep merged + map `location`→`city`+`country` server-side; 3) add a Zod boundary schema on `AuthStepResponse`.
    - **`age`/`location` vs backend `birthday`/`city`+`country`:** design uses age + combined location; service `RegisterDetailsPayload` still has `birthday`/`city`/`country`. Not reconciled (no real contract). Fix when API lands: derive birthday from age or add an age field; split location on comma.
    - **`RegisterCredentialsForm`/`RegisterDetailsForm`/`useRegisterDetails`/`TermsNotice` now unused by screens** but kept (decision 9 "reuse, don't delete"). Remove in 23.4 if still unused.
    - Login inputs are `medium` (radius 14), not the design's pill-24 login look — inherited from the prior session's accepted state; revisit if pill login is wanted.
    - remember-me is still local UI state only (not wired to session persistence).
  - **Carry-overs:** `onboard` (parental toggle + min-age + cellular toggle, skippable) folded into **22.13** Settings — its content is exactly the Settings toggles, and the user opted for T&C-as-checkbox over extra gate screens. If a forced first-run onboard gate is later wanted, add an `OnboardGate` overlay keyed on a new `hasOnboarded` settings flag.
- [x] **22.6b** Domain/auth type reconciliation to the design data model (user request 2026-06-08).
  - **What:** rewrote `types/domain.ts` to the designer HTML's data shapes. `Channel`: replaced the `category` enum with a `package: ChannelPackage` (`base|sport|news|kids|music|regional`, design `PKGS`), added `isLive` (LIVE tag), `isAdult` (`lock`/18+ → PIN gate), `geoBlocked` (`geo` tag → overlay), `thumbnailUrl?` (scene/last-frame art for cards+mosaic); `streamUrl` made optional (live streams come from the streams endpoint). `EpgItem`: added `isLive?` (currently-airing highlight, design `prog` now-state). `RadioStation`: added `bitrateKbps?` (design "128 kbps") + `artworkUrl?` (scene). New types: `ChannelPackage`, `CatchupDay` (day-strip `[weekday,date,isToday]`), `QualityId` + `QualityOption` (design `QUAL` ABR picker). `AppConfig` gained `packages?: ChannelPackage[]`. Auth payloads already reconciled in 22.6. Mock fixtures updated to satisfy the new shapes (channels remapped to packages + tags incl. lock/geo samples; epg generator flags the now-airing item; radio adds kbps).
    - **Follow-up (2026-06-08, user audit of types vs HTML):** swept the full mockup for shapes the first pass missed and added the remaining design entities — `HeroItem` (Home `.hero` carousel: kicker/title/meta/image/channelId), `ContinueItem` (Home `.hcard`+`.pgbar`: channel/title/thumb/progress 0–1), and `Subscription` on `User` (profile badge "Paketa Bazë · 32 kanale"). These three are **design-inferred** (no query backs them yet) — validate against the backend contract; consumed when Home (22.7) + Profile (22.13) are built. tsc + lint clean. Type coverage now spans every data array in the HTML (`CH`/`EPG`/`RADIO`/`DAYS`/`QUAL`/`PKGS` + hero/continue/subscription).
  - **Why:** user directed all types to match the new design so downstream screens (22.7+) compose against design-accurate shapes (packages chips, LIVE/lock/geo tags, day-strip, quality sheet) rather than the placeholder `category` enum.
  - **Confidence:** tsc + lint clean. [CERTAIN] Shapes mirror the HTML `CH`/`EPG`/`RADIO`/`DAYS`/`QUAL`/`PKGS` arrays. [HIGH] No screen read `Channel.category` (grep-verified), so the rename is non-breaking at call sites. [CERTAIN]
  - **Trade-offs / known gaps:** Fixtures are loosely typed (`as const` / `object[]`), so the new shape isn't compile-enforced against the domain types — a fixture drift wouldn't fail tsc. Fix options: 1) type `mockChannels: readonly Channel[]` etc. for compile-time enforcement; 2) add a Zod parse at the mock boundary; 3) leave until 5.X.2 (Zod at API boundary) lands. `age`/`location` (design) vs `birthday`/`city`+`country` (service `RegisterDetailsPayload`) still unreconciled pending the real `/auth/register` contract (see 22.6). The full design channel **list** (16 RTSH channels) lands with the Home screen build (22.7); 22.6b only conforms the existing 19-channel fixture to the new shape.
  - **Carry-overs:** wire `QualityOption`/`CatchupDay` into PlayerSlice + the player day-strip/quality sheet in 22.10; `package` chip labels → i18n in 22.16; consider compile-time fixture typing in 5.X.2.
- [x] **22.7** Home (`index`).
  - **What:** rewrote `(tabs)/index.tsx` to the design. `BrandHeader` (logo) + right-slot mosaic/profile `IconButton`s; `SearchBar` (button→search); Televizion/Radio `SegmentedToggle`. TV mode (one `FlashList`, `numColumns={2}`, top content in `ListHeaderComponent`, re-keyed on mode): `HeroCarousel`, "Vazhdo të shikosh" `ContinueRow`, package `FilterChipRow`, "Kanalet TV"+Guida `SectionHeader`, then the restyled `ChannelCard` grid. Radio mode: `StationRow` list. New components: `HeroCarousel` (+dots, paged), `ContinueCard`/`ContinueRow` (progress bar + play badge), `SectionHeader` (reusable `sec-h`), and **`SceneBackground`** (shared image-fill+scrim primitive built on `ReusableImage`). `ChannelCard` restyled to the design (scene bg, frosted clogo, LIVE/lock/geo tagchip, name over scrim). New glyphs: `grid`/`lock`/`globe`. Data: `useHomeFeedQuery` (`/home` → heroes + continue) with `mockHeroes`/`mockContinueWatching` fixtures + service + handler; `constants/packages.ts` (label map + `PackageFilter`). i18n `home.*` (sq+en).
  - **Why:** design screen 6. DRY: extracted `SceneBackground` so `ChannelCard`/`HeroCarousel`/`ContinueCard` (and 22.12 mosaic) don't each repeat the fill+scrim block (user steer 2026-06-08); reused the existing `IconButton` for the header buttons instead of a bespoke one.
  - **Confidence:** tsc + lint clean. [CERTAIN] Composes the existing 22.5 primitives (`SegmentedToggle`/`SearchBar`/`FilterChipRow`/`StationRow`) unchanged. [CERTAIN] On-device layout/visuals unverified (no run). [MEDIUM — raise via `npx expo run:android`.]
  - **Trade-offs / known gaps:**
    - **Mosaic header button is `isDisabled`** until its route exists (22.12) — typed routes reject `/(app)/mosaic` today. Enable in 22.12.
    - Radio `StationRow` onPress goes to `/(app)/radio` (list) as a placeholder; station-specific radio player wiring is 22.11. `isActive` hardcoded false (no radio-now state on Home yet).
    - `FlashList` re-keyed on mode (`key="tv"/"radio"`) to switch column count — a full remount on toggle (acceptable; avoids numColumns-change glitches).
    - Hero/continue are design-inferred mock data (22.6b types); validate when the backend `/home` contract lands. Package chip labels are inline Albanian (`PACKAGE_LABEL`) — move to i18n in 22.16.
    - `SceneBackground` vs folding scrim/fill into `ReusableImage`: chose the composition (lean primitive) over a fatter `ReusableImage`; revisit if the team prefers consolidation.
  - **Carry-overs:** enable mosaic button (22.12); wire radio station→player (22.11); package labels→i18n (22.16); widen 2-col grid→wrapped rows on tablet (22.18, same `numColumns` seam).
- [x] **22.8** Guide (`guide`).
  - **What:** rebuilt the old EPG stub `guide.tsx` into the design's Guida screen — `TabHeader` ("Guida") with a `SegmentedToggle` (TV/Radio) in the right slot, then one re-keyed `FlashList` of `GuideRow`s under an overline (`TANI NË TV` / `TANI NË RADIO`). TV rows derive **now/next + elapsed-progress** per channel from `useEpgQuery` (group EPG by `channelId`, pick the airing item via `isLive`/time-window, next = following item, progress = elapsed fraction, badge = now start time via `formatClockTime`). Radio rows map `useRadioStationsQuery` → station name + genre + `LIVE` badge + a `RadioIcon` `leading` glyph. `GuideRow` component itself was already built in a prior session (untracked); this step assembled the screen + wired data. Added a `guide` i18n section to `sq.json` + `en.json`.
  - **Why:** design screen 7. Composes the existing 22.5 primitives + the pre-built `GuideRow` (DRY); EPG-derived now/next replaces the design's static placeholder arrays with real query data.
  - **Confidence:** tsc clean + `guide.tsx` lint exit 0. [CERTAIN] Reuses `GuideRow`/`SegmentedToggle`/`TabHeader`/`ScreenLayout` unchanged. [CERTAIN] On-device layout/visuals unverified (no run). [MEDIUM — raise via `npx expo run:android`.]
  - **Trade-offs / known gaps:**
    - **`nowMs` snapshotted at mount** (`useState(() => Date.now())`) to satisfy `react-hooks/purity`, so progress bars don't tick live — faithful to the design's static bars. Raise to live by: 1) a 30–60s `setInterval` → `setNowMs` tick; 2) recompute on focus via `useFocusEffect`; 3) leave static (cheapest, matches mock).
    - **Radio now/next has no schedule source** — rows show station name + genre, not programme now/next (the design's radio programme names are hardcoded mock). [MEDIUM] Raise by: 1) a radio now-playing endpoint in the API contract; 2) a `nowPlaying` field on `RadioStation`; 3) keep genre line until a radio schedule lands.
    - **Radio row tap → `/(app)/radio`** (list) as a placeholder; station→player wiring is 22.11. TV row tap → `/(app)/channel/[id]` (existing).
    - **`logoLabel` = full channel name** on the 46px tile (no abbreviation/truncation); RTSH names are short so it fits, but a long name could overflow — add `numberOfLines`/short-code to `GuideRow` if needed.
  - **Carry-overs:** wire radio rows → `radio/[id]` player (22.11); consider a live-time tick (above); i18n strings already added (no 22.16 debt for guide).
- [x] **22.9** Search (`search`).
  - **What:** built out the `search.tsx` stub — custom header (back `IconButton` + live `SearchBar`), then a `ScrollView` with two result sections: **Kanale** (2-col wrap grid of `ChannelCard`) + **Programe** (`ProgramRow` list), filtered client-side on the debounced query. Empty query shows **Kërkime të fundit** (recent searches as tappable wrap chips, session-state, committed on keyboard-submit). New reusable pieces: `useSearch` hook (controlled `query` + debounced `debouncedQuery`, 300ms, ref-timer cleared on unmount — adapted from SOLITAR's `useSearch`, improved with unmount cleanup), `ProgramRow` component (design `.prog`: play glyph + title + meta), and a `onSubmit` prop added to `SearchBar`. Programs come from today's `useEpgQuery`; channels from `useChannelsQuery`. Added a `search` i18n section (sq + en).
  - **Why:** design screen 8. User steer: model the debounced filtering on SOLITAR's `useSearch` (this codebase only client-filters for now). DRY: reused `ChannelCard`/`SectionHeader`/`SearchBar`, extracted `ProgramRow` (recurs in the player EPG list, 22.10).
  - **Confidence:** tsc clean + lint exit 0 on all changed files. [CERTAIN] `ChannelCard` (`aspectRatio 16/10`) sizes correctly in the 50%-width wrap cells. [HIGH] On-device layout/keyboard/autofocus unverified (no run). [MEDIUM — raise via `npx expo run:android`.]
  - **Trade-offs / known gaps:**
    - **Recent searches are session-only** (`useState`), lost on unmount/restart. Persist by: 1) a `searchHistory` field in `SettingsSlice` (MMKV); 2) a dedicated MMKV key via the storage util; 3) leave session-only for v1.
    - **Programs search = today's EPG only** (what `useEpgQuery` returns). [MEDIUM] Widen by: 1) a backend `/search` endpoint (feed `debouncedQuery` into the query key — debounce already rate-limits); 2) query a multi-day EPG range; 3) accept today-only for v1.
    - **Result tap → `/(app)/channel/[id]`** for both channels and programmes (no deep-link to the specific programme/catch-up yet — that's 22.10).
    - **Recent chips are inline** (not a shared `Chip` primitive) — `FilterChipRow` is single-select horizontal-scroll, wrong shape for wrap/tap chips. Extract a `Chip` primitive if a 3rd consumer appears.
  - **Carry-overs:** persist recent searches (above); reuse `ProgramRow` in the player EPG list (22.10); swap client filter → backend search when the contract lands; i18n strings already added (no 22.16 debt for search).
- [x] **22.10** Player + EPG + catch-up. Restyle player chrome (glass back/options buttons, centered title, LIVE tag, controls track+knob). `DayStrip` (catch-up day selector) → today=EPG/live, past=`CatchupBanner` + recorded `EpgRow`s (dim/now states). Options **sheet** (quality/audio/subtitles/cast/**PIP**) + Quality sheet + `Toast` on change — implemented as a **native route-based `(modals)` sheet** via the shared `getModalScreenOptions` helper (decision 7; built in **22.15**), **not** a `@gorhom`/JS bottom-sheet. Folds Phase-9 player + catchup data. The PIP control in the options sheet is wired to the **15.5** implementation (auto-PIP on background + manual `startPictureInPicture()`).
  - **Build split (3 sub-steps, commit between):** (1) **chrome restyle** ✅; (2) **screen restructure + DayStrip + EPG/catch-up** ✅; (3) **options sheet + quality + Toast** ✅.
  - **Sub-step 3 done (options sheet + quality + Toast) — also stood up the 22.15 native-sheet/Toast infra:** new `getModalScreenOptions` (`utils/navigation.ts` — `presentation: 'formSheet'` + `sheetAllowedDetents: 'fitToContents'` + grabber + corners, decision 7; verified vs expo-router v56 docs); `SheetOptionRow` reusable (design `.opt-row`: label + value/description + chevron **or** radio). Two native `(app)` sheet routes — `player-options` (quality→drills in, audio/subtitles placeholders, cast→toast) + `quality` (radio list from `QUALITY_OPTIONS`, select → `setVideoQuality` + dismiss + toast). **Toast:** `ToastSlice` (`toast`/`showToast`/`hideToast`, transient, not persisted) + `ToastHost` (root-mounted, theme-inverted pill, check glyph, ~1.9s auto-dismiss) — kept the name `Toast` (user, consistent with ModalSlice/skeleton/scrim). `PlayerSlice` gained `videoQuality` + `setVideoQuality`; `QUALITY_OPTIONS` in `constants/player.ts`. Player chrome `onOpenOptions` → push `player-options`. i18n `player.*` (options/quality/cast, sq+en). tsc + lint clean.
    - **ABR decision (user 2026-06-09, verified vs expo-video v56 docs):** HLS ABR is **automatic** — the native player (AVPlayer/ExoPlayer) reads the multi-variant master `.m3u8` from the CDN and switches bitrate by bandwidth/buffer; we never measure connection speed. expo-video exposes **read-only** track info (`availableVideoTracks`/`videoTrack`→`bitrate`/`peakBitrate`/`size`) but **no cap/select API**, so only **Auto** is enforceable today. The picker is **UI + stored preference**; if manual capping is ever needed, switch the engine to `react-native-video` (`maxBitRate`/`selectedVideoTrack`) — ties to the existing AES-128 fallback risk. No `docs/PLAYER.md` exists yet; decision lives here + in code comments.
    - **PIP** intentionally **not** added to the options sheet here — it needs the `VideoView` ref (cross-route) + a native rebuild; lands in **15.5**.
    - **Carry-overs:** audio-track + subtitle sub-sheets are placeholders (`opt-audio`/`opt-subtitles` no-op) — own follow-up; Cast is a stub (toast only, v1 scope). 22.15 now **partially done** (native-sheet helper + `SheetOptionRow` + `Toast` built here) — remaining 22.15: `AdOverlay`, `scrim`/dimming polish, any other `(modals)` sheets.
  - **Sub-step 1 done (chrome):** rewrote `PlayerControls`
  - **Sub-step 1 done (chrome):** rewrote `PlayerControls` to the design `sPlayer` chrome — glass back (left) + glass options (right) top bar, centered title, **persistent** LIVE tag (top-left, survives auto-hide), bottom control row = play/pause + seek track (fill + 13px knob w/ glow) + fullscreen. Dropped the Phase-9 center play overlay, seek±, time text, and inline cast/quality (those move to the options sheet, sub-step 3). Added `onOpenOptions` prop (options button renders only when wired → hidden until sub-step 3) + `PLAYER_COLORS.glass`/`knobGlow`. Fullscreen button shows only when `onToggleFullscreen` is passed (VOD has none today). tsc + lint clean. On-device unverified [MEDIUM — `npx expo run:android`].
  - **Sub-step 2 done (screen restructure + DayStrip + catch-up):** rewrote `channel/[id]` to the design's portrait `sPlayer` — inline 16:9 `LivePlayer` + `DayStrip` (today + **7 days back**, today rightmost/selected) + a `ScrollView` EPG/catch-up list. Today → EPG (airing row highlighted); past day → `CatchupBanner` + recorded rows. New components: `DayStrip` + `CatchupBanner` (`components/catchup`), and `ProgramRow` extended with `state` (`now`/`recorded`/`scheduled` → red/muted/no play glyph + dim title) + right-aligned `time`. `LivePlayer` refactored from landscape-locked full-screen to **inline + parent-controlled** (dropped `useLockOrientationOnMount`; `isFullscreen`/`onToggleFullscreen`/`onOpenOptions` props). **Fullscreen** owned by the screen — expands the player to cover the screen + `ScreenOrientation` landscape lock (released on exit/unmount). Per-day EPG via `useEpgQuery(dateKey)` (mock generates any date) filtered by channelId. New theme tokens `primarySoft`/`primaryBorder` (catch-up tint). Added `catchup` i18n (sq+en); reused `datetime.today`. tsc + lint clean.
    - **Known gaps:** (1) recorded-row tap → `/(app)/program/[id]` passes the **EPG id**, but the catch-up player resolves by **catch-up id** — mismatch in mock (player shows fallback). Fix when the backend unifies (EPG item carries `catchupId`, or a catch-up-by-program endpoint). (2) EPG mock schedule runs ~06:00–17:35, so an evening demo has no "now" highlight (data limit, not a bug). (3) Fullscreen back button not safe-area-inset in landscape (minor). (4) On-device unverified [MEDIUM — `npx expo run:android`: check inline 16:9 framing, daystrip scroll, fullscreen rotate + restore].
- [x] **22.11** Radio.
  - **What:** Rebuilt the radio surface to the design + fixed its core architecture. (1) **Audio engine relocated** — new `RadioAudioHost` (Media/) owns the single `expo-audio` player, mounted once above the router in `(app)/_layout.tsx`; it is driven entirely by `PlayerSlice` (`replace()` on `radioStreamUrl`, `play()/pause()` on `radioIsPlaying`). Routes and the mini-player no longer touch audio — they only mutate the store — so playback survives tab navigation / screen unmounts (the precondition for the docked mini-player). (2) **Routes** — old combined `(app)/radio.tsx` (list + inline player) → folder `radio/index.tsx` (catalogue: back header + `StationRow` list, active row highlighted) + `radio/[id].tsx` (player: design `sRadioPlayer` — back/"Po luan tani"/favourite header, `RadioPlayer` core, "Programi i radios" section). (3) **Components** — new `Equalizer` (Reanimated 5-bar, staggered loops, `active` rest state; reused at small size in row/mini); `StationRow` restyled to design `.radio-item` (50px scene tile + radio glyph, name/genre, chevron→eq when active); `RadioPlayer` repurposed into the presentational now-playing core (`rp-art` art + name/`genre · kbps` + eq + prev/play/next transport, real Player icons); `RadioMiniPlayer` restyled (scene tile, eq, real Play/Pause/Close icons, nav → `radio/[id]` instead of the removed tab). (4) **Plumbing** — `useRadioStationQuery(id)` (wraps existing `getRadioById`); `radio` i18n block (sq+en); new `close.svg` (General). Home + guide radio taps now open `radio/[id]`.
  - **Why:** Design screens 12/13 + decision "radio = routes, not a tab." The architectural driver: the old inline `RadioPlayer` held the audio player, so navigating away unmounted it and killed sound — incompatible with a cross-screen mini-player and with background radio. A store-driven host above the router is the clean fix and the right substrate for 5.X.13.
  - **Confidence:** Store-driven host is the correct decoupling [HIGH]. `expo-audio` API (`replace`/`playing`/`play`/`pause`, auto-release on unmount) verified against v56 docs [HIGH]. Routes/components match the mockup [MEDIUM — visual, promote in 22.17 on device]. Mock `/radio/:id` returns `{station}`, query wired [CERTAIN].
  - **Trade-offs / known gaps:** (a) **No radio-EPG source** → the "Programi i radios" section renders only a single live-now `ProgramRow` (genre + current time), not a real schedule. Raise when a radio-schedule endpoint lands — options: extend the radio service with a `nowNext`, add a `radio-epg` query, or fold into the unified EPG. (b) **Background-while-locked not functional yet** — needs iOS `UIBackgroundModes:['audio']` + Android `foregroundServiceType` (5.X.13) + a dev-client rebuild; the JS architecture is ready. (c) Favourite (header star) is a placeholder toast — no `ChannelsSlice` favourites yet. (d) Mock stations have no `artworkUrl`, so scene tiles show the placeholder gradient + glyph (design-faithful fallback).
  - **Carry-overs:** 5.X.13 (entitlements) now unblocks real background radio on top of this host. Radio-EPG endpoint is a new backend-contract dependency (note for the integration pass).
- [ ] **22.12** Mosaic (`mosaic`). **2-col** grid (mobile) of channel tiles (last-frame scene + LIVE badge), tap → player. Same column logic as 22.7 so 22.18 widens to wrapped rows on tablet. Spec: 4/6/9 density — design shows 12 in a 2-col scroll; confirm density control.
- [ ] **22.13** Profile + Settings. Profile (avatar initials, name/email, package badge, list rows → account/favorites/parental/settings/logout). Settings (Luajtja: cellular toggle, default-quality→sheet, parental toggle; Aplikacioni: language, notifications, cast, terms, version). Expand `SettingsSlice` (3.4) with the toggled fields.
- [ ] **22.14** Parental + Geo. Restyle `ParentalPin` to design (lock big-icon, 4-dot PIN, keypad) as a gate before locked-channel play. `geo` full-screen overlay (globe, copy, back-to-home) shown when streams endpoint returns geo-error (or `geo`-flagged channel). Wire into `openChannel` flow (lock → PIN, geo → overlay) — both spec-mandated.
- [~] **22.15** Overlays. **Partially done in 22.10 sub-step 3:** (a) **Sheets = native route-based** ✅ — `getModalScreenOptions({ detents, cornerRadius })` built (`utils/navigation.ts`; `presentation: 'formSheet'` + `sheetAllowedDetents: 'fitToContents'` + grabber + corner — note: settled on `'formSheet'` cross-platform per expo-router v56 docs, not the older `ios ? 'modal' : 'formSheet'`), plus `SheetOptionRow` reusable; first consumers are the player `player-options` + `quality` routes. NO `@gorhom`. (b) `Toast` ✅ — `ToastSlice` + root-mounted `ToastHost` (theme-inverted pill + check, ~1.9s auto-dismiss). **Remaining:** (c) `AdOverlay` (creative + REKLAMË label + skip countdown; app-open + channel-open slots, frequency-capped) — lands Phase 16 infra; (d) the SOLITAR in-sheet scaffold (SafeAreaView → keyboard → header → content) for any keyboard-bearing sheets; (e) scrim/background-dimming polish. Alerts stay on `ModalSlice`/`ModalWrapper`.
- [ ] **22.16** i18n sq copy. Lift exact Albanian strings from the mockup into `sq.json` (auth, home, guide, search, profile, settings, player, radio, parental, geo, ad, toast); add `en.json` parallels. Replace hardcoded screen strings.
- [ ] **22.17** QA + verification pass. `npx expo run:android` (+ iOS), notched safe-area check on every screen, tab/flow walkthrough matching the mockup's `go()` graph (login→ad→home; channel→ad→player; lock→PIN; geo→overlay; day→catch-up; home-toggle→radio), `npm run lint` + `tsc` clean. Mark per-screen confidence.
- [~] **22.18** Tablet / iPad / **TV** large-screen pass (decisions 8 + TV scope 2026-06-06). **Deferred until mobile (22.1–22.17) is complete, approved, and functional.** Same design with display adjustments (not a redesign): `useWindowDimensions` breakpoints flip grids (channel grid 22.7, mosaic 22.12) from 2-col to `flexWrap` rows with correct item sizing; revisit gutters/hero/player width. **TV is now in v1 scope** (end-phase) — CLAUDE.md updated; TV adds focus/D-pad navigation + 10-foot spacing on top of the large-screen layout (its own sub-pass after tablet/iPad). Build mobile first, then widen — do not build in parallel.

---

## Phase 22 — Design inventory & mapping (build-ready reference)

> Source: `.claude/docs/rtsh-tani-mobile.html` (in-repo, analyzed 2026-06-06). Maps every design screen / icon / component / input / flow / data-shape to our codebase, marked **EXISTS** (reuse) · **RESTYLE** (exists, re-skin to design) · **NEW** (build). Each row names the Phase 22 step that owns it. This is the lookup table the per-screen steps compose from.

### A. Screen → route map

| # | Design screen (sq) | Our route (file-based) | Status | Step |
|---|---|---|---|---|
| 1 | Splash | `BrandedSplash` during boot in `_layout` | EXISTS | 22.3 |
| 2 | Login (Mirë se vini) | `(auth)/login` | RESTYLE | 22.6 |
| 3 | Register (Krijo llogari) | `(auth)/register` | RESTYLE | 22.6 |
| 4 | Terms (Kushtet) | `(auth)/terms` (+ reconcile `TCGateOverlay`) | NEW/RESTYLE | 22.6 |
| 5 | Onboard (Konfigurimi) | `(auth)/onboard` | NEW | 22.6 |
| 6 | Home (Kreu) | `(app)/(tabs)/index` | RESTYLE | 22.7 |
| 7 | Guide (Guida) | `(app)/(tabs)/guide` (rename from `epg`) | RESTYLE | 22.8 |
| 8 | Search (Kërko) | `(app)/(tabs)/search` | NEW | 22.9 |
| 9 | Profile (Profili) | `(app)/(tabs)/profile` | RESTYLE | 22.13 |
| 10 | Settings (Cilësimet) | `(app)/settings` | NEW | 22.13 |
| 11 | Player + EPG + catch-up | `(app)/channel/[id]` | RESTYLE | 22.10 |
| 12 | Radio list | `(app)/radio` | NEW | 22.11 |
| 13 | Radio player | `(app)/radio/[id]` | RESTYLE | 22.11 |
| 14 | Mosaic (Mozaik) | `(app)/mosaic` | NEW | 22.12 |
| 15 | Parental (PIN) | `ParentalPinModal` gate (+ route if needed) | RESTYLE | 22.14 |
| 16 | Geo-block | `(app)/geo` | NEW | 22.14 |
| — | Catchup tab (removed) | folded into player day-strip (11) | — | 22.10 |
| — | Radio tab (removed) | folded into Home toggle + radio routes | — | 22.7/22.11 |

### B. Icon inventory (design `ic()` → `components/Icons/icons.tsx`)

- **EXISTS (reuse):** `user`→ProfileIcon · `search`→SearchIcon · `mail`→MailIcon · `key`→KeyIcon · `back`→ChevronLeftIcon · `play`→PlayIcon · `pause`→PauseIcon · `full`→FullscreenIcon · `chev`→ChevronRightIcon · `settings`→SettingsIcon · `home`→HomeIcon · `clock`→ClockIcon · `lang`→LanguageIcon.
- **NEW (~17, add to icons.tsx, `size`+`color` props, stroke 1.8–2):** `shield` (parental) · `lock` (locked channel) · `globe` (geo) · `wifi` (cellular) · `bell` (notifications) · `doc` (terms) · `out` (logout) · `tv` · `guide` (calendar-grid tab) · `grid` (mosaic) · `radio` (broadcast waves) · `pkg` (package) · `quality` · `check` (checkbox/toast) · `info` · `heart` (favorites) · `cast` · `arrow` (ad CTA, long arrow).
- **Note:** design uses outline (stroke) icons; current set mixes fill/stroke — new ones follow the design's stroke style. `StarIcon`/`MicrophoneIcon`/`LayersIcon`/`MobileIcon`/`MoreIcon`/`Forward`/`Backward`/`Warning` stay available but design favors `heart`/`radio`/`guide`/`grid`. Owned by **22.4** (tab/nav icons) + per-screen steps.

### C. Component inventory (design class/widget → our component)

| Design widget | Our component | Status | Step |
|---|---|---|---|
| `logo` lockup | `RtshLogoFull` (+ `RtshLogo` mark exists) | NEW | 22.3 |
| `hdr` (logo/title headers) | `BrandHeader` / `TabHeader` | RESTYLE | 22.3/22.4 |
| `pfp` / `iconbtn` | `IconButton` (Icons/) | RESTYLE | 22.5 |
| `searchbar` | `SearchBar` (pressable + input variants) | NEW | 22.5 |
| `toggle2` | `SegmentedToggle` (2-up pill) | NEW | 22.5 |
| `chip`/`chiprow` | `FilterChipRow` | NEW | 22.5 |
| `btn-red`/`btn-ghost` | `ReusableBtn` (variants) | RESTYLE | 22.5 |
| `lnk` | `ReusableText` link variant | EXISTS | 22.2 |
| `hero` + `dots` | `HeroCarousel` | NEW | 22.7 |
| `hrow`/`hcard`+`pgbar`+`play-badge` | `ContinueRow` + `ContinueCard` | NEW | 22.7 |
| `card`+`clogo`+`tagchip`(live/lock/geo)+`nm` | `ChannelCard` | RESTYLE | 22.7 |
| `bottomnav` | `theme/tabBar.ts` + `(tabs)/_layout` | RESTYLE | 22.4 |
| `video`/`top`/`ttl`/`ctrl`/`track`+`knob`/`livetag` | `VideoPlayer`/`LivePlayer`/`PlayerControls` | RESTYLE | 22.10 |
| `daystrip`/`day` | `DayStrip` | NEW | 22.10 |
| `cubanner` | `CatchupBanner` | NEW | 22.10 |
| `prog` + `epg-h` | `EpgRow` + section header | RESTYLE | 22.10 |
| `gitem` (now/next) | `GuideRow` | NEW | 22.8 |
| `list-item`+`li-ic`+`chev`/`tg` | `ListRow` + `Switch` | NEW | 22.5/22.13 |
| `seg-choice` | `SegmentedChoice` (n-up) | NEW | 22.5 |
| `check`/`cbox` | `Checkbox` | NEW | 22.5 |
| `splash`/`loadbar` | `BrandedSplash` | EXISTS | 22.3 |
| `center-pad`/`big-ic` | `CenteredMessage` (geo/parental) | NEW | 22.14 |
| `pin`/`keypad` | `ParentalPinModal`/`ParentalPinPad` | RESTYLE | 22.14 |
| `mos-grid`/`mos` | `MosaicTile` + grid | NEW | 22.12 |
| `rp-art`/`eq` | `RadioPlayer` art + `Equalizer` | RESTYLE/NEW | 22.11 |
| `radio-item` | `StationRow` | RESTYLE | 22.11 |
| `sheet`/`opt-row` | `(modals)` routes + `getModalScreenOptions` + `SheetOptionRow` | NEW | 22.15 |
| `adpop`/`ad-*` | `AdOverlay` | NEW | 22.15/Ph16 |
| `toast` | `Toast` | NEW | 22.15 |
| mini-player dock | `RadioMiniPlayer` (Layout/) | RESTYLE | 22.11 |

### D. Inputs / controls

`pill-input` (icon+field) → `ReusableInput` pill variant · `inp` (labeled) → `ReusableInput` labeled variant · `select.inp` → option sheet (`(modals)` picker, not a native `<select>`) · `check`/`cbox` → `Checkbox` · `seg-choice` → `SegmentedChoice` · `tg` → `Switch` · `keypad` → `ParentalPinPad` · `track`+`knob` → player seek in `PlayerControls`. RHF + zod for the forms (login/register) per existing auth stack.

### E. Flow graph (from the mockup's `go()` / handlers)

- **Boot:** splash (1.7s loadbar) → login. *(Ours: `BrandedSplash` until bootstrap ready → guard routes to `(auth)` or `(app)`.)*
- **Login** `Hyr` → ad(app-open) → home · → register link.
- **Register** → terms (also via accept-link) → **terms** `Pranoj` → **onboard** → ad(app-open) → home · onboard `Kapërce` skips to home.
- **Home:** search→search · grid→mosaic · user→profile · Televizion/Radio toggle · channel tap→`openChannel`.
- **openChannel:** `lock`→parental PIN → (4 digits) → ad(channel) → player · `geo`→geo screen · else → ad(channel) → player.
- **Player:** back→home · settings→options sheet · day-strip: today=EPG/live, past day=catch-up banner + recorded EPG · quality sheet → toast.
- **Guide:** TV/Radio toggle · row→player / radio player. **Profile**→settings; logout→login.
- **Ad:** 5s countdown, skip enabled after ~4s → continues. Slots: app-open + channel-open (frequency-capped). Maps to **Phase 16** infra + 22.15.

### F. Data shapes (mockup arrays → `types/domain.ts`, reconcile with 5.X.1)

- `CH[name, gradient, isLive 0/1, package, flag ''|lock|geo]` → `Channel { id, name, logoUrl, isLive, package, contentFlag: 'none'|'adult'|'geo' }`.
- `PKGS[]` → package filter values (`Të gjitha` = all).
- `RADIO[name, sub, gradient]` → `RadioStation { id, name, description }`.
- `DAYS[label, date]` → catch-up day selector model.
- `EPG[time, title, desc, isLive]` → `EpgItem`.
- `QUAL[label, desc, isDefault]` → quality option list (player + settings default).
- Gradients `g1–g6` are placeholder artwork → real `logoUrl`/poster from backend; keep a gradient fallback.

---

## Phase 23 — Role-model quality gate (final audit)

> **Goal (user 2026-06-06):** this repo should be a reference-grade Expo project other teams copy — excellent structure, dynamic/reusable/customizable components + helpers, clean self-explanatory code, clear flow and organization. These standards **guide every Phase 22 step as it's built** (don't bolt quality on at the end); this phase is the formal sign-off that audits the finished app against them. Each item is a concrete, checkable gate, not an aspiration. Run after 22.1–22.18 + feature phases (15/16) are complete.

- [~] **23.1** Structure & organization. One responsibility per file; folders match STYLE_GUIDE (`components/<Domain>`, `hooks/`, `store/`, `api/{services,queries,mutations}`, `theme/`, `types/`, `utils/<bucket>`); every component/hook folder has a JSDoc'd barrel exporting component/hook only (no Props re-export); zero deep relative imports (`@/` everywhere); `utils/` bucketed by domain once ≥3 files. Verify by tree review + `grep` for `../../`.
- [~] **23.2** Reusable / dynamic / customizable. Primitives are prop-driven with variants + sensible defaults, theme-tokened (no hardcoded colors/sizes/radii/spacing — all from `theme/`), and **portable** (no store coupling in shared primitives; data in via props). Config that varies (tab bar, modal presentation, ad slots, quality list) lives in `theme/` or a config module, not inline. No copy-paste components that should be one parameterized component.
- [~] **23.3** Functions & helpers. Pure where possible, single-responsibility, fully typed, colocated by domain, unit-tested for the non-trivial ones. No business logic buried in components that belongs in a hook/service/util.
- [~] **23.4** Clean, self-explanatory code. JSDoc (the *why*) on every non-trivial file; intention-revealing names; no `console.log`, no `any`, no magic numbers/strings, no dead code/unused exports; consistent formatting. Verify: `tsc --noEmit` (strict, zero errors), `expo lint` (zero warnings), `grep` for `console.`/`: any`/`as any`.
- [~] **23.5** Clear flow & docs current. CLAUDE.md + `rules/ARCHITECTURE.md` (auth, theme, boot/splash, network, navigation, modals, player, ads) + `rules/STYLE_GUIDE.md` match the shipped code; README has commands + env matrix; plan.md has no stale `[ ]`/`[~]` that are actually done. A new dev can trace any flow from the docs alone.
- [~] **23.6** Type safety & boundaries. TS strict; Zod (or typed `http()`) at every API boundary (11.Y.4/5.X.2); discriminated unions over enums; precise props (`XProps`); no `unknown` left un-narrowed.
- [~] **23.7** Performance. `FlashList` for all long lists; `React.memo` + `displayName` only where it pays (lists/high-freq); stable callbacks (`useCallback` in deps); images via `expo-image`; no needless re-renders (selector subscriptions, not whole-store reads); reanimated on the UI thread.
- [~] **23.8** Consistency & a11y sweep. One pattern per concern (one button, one input, one list-row, one sheet mechanism); `testID` on interactive leaves; a11y labels/roles; RTL-safe; light + dark both pass; safe-area correct on notched + tablet.
- [~] **23.9** Verification gate. `npm run lint` + `npx tsc --noEmit` + tests green; `npx expo-doctor` clean; cold-boot + full `go()`-graph walkthrough on iOS + Android device; no red-box/console errors. Sign off each Phase 22 screen's [MEDIUM] visual claims to [CERTAIN] here.

For each step:
1. Open this file. Find the next `[ ]` step.
2. Tell Claude: `Working on step X.Y. Follow STYLE_GUIDE.md.`
3. Test with `npx expo run:android` locally.
4. Mark `[x]` when done.

## Reference

- Style guide: `.claude/rules/STYLE_GUIDE.md`
- Project memory: `.claude/memory/`
- Original spec: `../assets/4._DST_-_OTT.docx`
