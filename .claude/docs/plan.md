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
- [ ] **4.7** `src/api/index.ts` — barrel re-export. [INFO] also covers re-exporting `services/` and `queries/` once typed.
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
- [~] **5.X.1** Domain types in `src/types/domain.ts` for `Channel`, `EpgItem`, `Program`, `CatchupItem`, `RadioStation`, `AppConfig`. Replace `Promise<unknown>` in 5 service files.
- [~] **5.X.2** Zod schemas at API boundary (auth + streams first, then domain). Generic axios transformer optional.
- [~] **5.X.3** TanStack query hooks (`useChannelsQuery`, `useEpgQuery`, etc.) in `src/api/queries/`. Currently empty.
- [~] **5.X.4** Per-call timeout overrides (`streamClient` with 5s timeout for stream manifests).
- [~] **5.X.5** `useCheckToken` returns rich result `{ authenticated, reason }` so UI can distinguish "no session" from "network error".

### Design-dependent (unblocked when design lands)
- [~] **5.X.6** Semantic color tokens (`overlay`, `disabled`, `onSurface`, `link`, `focus`, `skeleton`) in `ThemeColors`.
- [~] **5.X.7** `BORDERRADIUS.pill` / `full`; `SHADOWS`, `OPACITY`, `Z_INDEX`, `ANIMATION` token files.
- [~] **5.X.8** Reconcile `SPACING.space_10` + `space_28` off-grid values.
- [~] **5.X.9** Decide `predictiveBackGestureEnabled` on Android.

### Infra phases (each a real chunk of work)
- [~] **5.X.10** MMKV encryption (H1) — choose key-mgmt story: EAS secret → native config plugin → JS, or generate-and-store-in-SecureStore on first launch.
- [~] **5.X.11** iOS keychain accessibility (M2) — pass `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` for refresh token so background radio playback works while device is locked.
- [~] **5.X.12** Sentry init — DSN as EAS secret, init before `<Stack/>`, replace `__DEV__ console.warn` patterns.
- [~] **5.X.13** Background audio + PiP entitlements in `app.config.ts` (iOS `UIBackgroundModes: ['audio']`, Android `foregroundServiceType`). Pairs with player phase.
- [~] **5.X.14** OTA `updates.channel` explicit in `app.config.ts` (currently inherited from EAS profile).
- [~] **5.X.15** Parental PIN feature — 4-digit, SHA-256+salt in keychain. New `createParentalSlice` + `PARENTAL_PIN_KEY` constant. Spec-mandated v1.
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
- [ ] **6.6** `components/ModalWrapper.tsx` — reads modal from store, renders apiError / noInternet / notify / confirmation.
- [ ] **6.7** `components/empty/EmptyChannelsState.tsx`, `EmptyEpgState.tsx`, `EmptyCatchupState.tsx`.
- [ ] **6.8** Barrels for all component folders.

---

## Phase 7 — Form Layer

- [ ] **7.1** `npm i react-hook-form zod @hookform/resolvers`.
- [ ] **7.2** `components/Inputs/ControlledInput.tsx` — RHF Controller wrapping `ReusableInput`.
- [ ] **7.3** Zod schemas: login, register, forgot in `src/features/auth/schemas.ts`.

---

## Phase 8 — Navigation

- [ ] **8.1** Confirm `experiments.typedRoutes: true` in `app.config.ts`.
- [ ] **8.2** `app/_layout.tsx` — providers + `Stack.Protected` guards (no token → auth, token → app).
- [ ] **8.3** `app/(auth)/` — `_layout.tsx`, `login.tsx`, `register.tsx`, `forgot.tsx`.
- [ ] **8.5** `app/(app)/_layout.tsx` — Stack with tabs + player modals.
- [ ] **8.6** `app/(app)/(tabs)/_layout.tsx` — Native Tabs (Live / EPG / Catchup / Radio / Profile).
- [ ] **8.7** `app/(app)/player/[id].tsx` — `presentation: "fullScreenModal"`, `orientation: "all"`.
- [ ] **8.8** Deep links: `rtshtani://channel/5`.

---

## Phase 9 — Video & Audio Players

- [ ] **9.1** `npx expo install expo-video expo-audio`. Config plugin for PIP + background.
- [ ] **9.2** `components/Media/VideoPlayer.tsx` — base expo-video wrapper, pushes state to playerSlice.
- [ ] **9.3** `components/Media/PlayerControls.tsx` — auto-hide overlay, quality picker, audio tracks, cast stub.
- [ ] **9.4** `components/Media/LivePlayer.tsx` — HLS + AES-128, "LIVE" badge, EPG current program. Validate AES-128 key fetch early.
- [ ] **9.5** `components/Media/VodPlayer.tsx` — custom seek bar (Reanimated), ±10s tap zones, resume positions.
- [ ] **9.6** Fullscreen + orientation: landscape lock on phone, status bar hidden.
- [ ] **9.7** `components/Media/RadioPlayer.tsx` — expo-audio, lock-screen metadata, Android foreground service.
- [ ] **9.8** `components/Layout/RadioMiniPlayer.tsx` — docked below tabs, tap expands.

---

## Phase 10 — Lists

- [ ] **10.1** `npx expo install @shopify/flash-list`.
- [ ] **10.2** `components/AnimatedFlashList.tsx` — separator, loading footer, empty slot, refresh-control.

---

## Phase 11 — Screen Scaffolds

- [ ] **11.1** Splash + boot confirmed wired (P8.2).
- [ ] **11.2** `(auth)/login.tsx` — form, mutation, navigate on success.
- [ ] **11.3** `(auth)/register.tsx`, `forgot.tsx`.
- [ ] **11.4** `(tabs)/index.tsx` Live — hero + channel grid.
- [ ] **11.5** `(tabs)/epg.tsx` — date picker, channel rail + timeline, synced scroll.
- [ ] **11.6** `(tabs)/catchup.tsx` — InfiniteList, genre chips, resume badge.
- [ ] **11.7** `(tabs)/radio.tsx` — radio grid, mini-player dock.
- [ ] **11.8** `(tabs)/profile.tsx` — Account / Playback / Appearance / Notifications / Parental / Language / Legal / About / Sign out.
- [ ] **11.9** `player/[id].tsx` — player + program info + "Up next" rail.
- [ ] **11.10** `channel/[id].tsx`, `program/[id].tsx`.

---

## Phase 12 — Auth Flow Hardening

- [ ] **12.1** Single-flight refresh queue verified (5 parallel 401s → 1 refresh → 5 retries).
- [ ] **12.2** Parental PIN: 4-digit, SHA-256 + salt in keychain. Gates adult-flagged content per EPG metadata. Shake on wrong, attempt-throttle after 5.

---

## Phase 13 — i18n

- [ ] **13.1** `npm i i18next react-i18next` + `npx expo install expo-localization`.
- [ ] **13.2** `src/i18n/index.ts` — sq default, en fallback.
- [ ] **13.3** Namespaces: `common`, `auth`, `player`, `epg`, `errors`.
- [ ] **13.4** Language switcher in profile.

---

## Phase 14 — Telemetry

- [ ] **14.1** `npx expo install @sentry/react-native`. Init before providers. Scrub PII in `beforeSend`.
- [ ] **14.2** `src/services/analytics.ts` — provider-agnostic `track / identify / screen`. No-op stub for v1.
- [ ] **14.3** Settings toggle: "Send anonymous analytics".

---

## Phase 15 — RTSH Product Features

- [ ] **15.1** T&C acceptance — first-launch gate, `tcAcceptedAt` flag, expo-web-browser.
- [ ] **15.2** Geoblocking overlay — 451/geo error → full-screen RTSH-branded overlay + retry.
- [ ] **15.3** Cellular-data gate — confirmation modal when cellular + `cellularPlaybackAllowed=false`.
- [ ] **15.4** Mosaic view — 4/6/9 channel thumbnail grid, periodic refresh, tap to switch.
- [ ] **15.5** PIP + iOS background video — `supportsBackgroundPlayback` toggled by `backgroundVideoAllowed`.
- [ ] **15.6** Foreground refresh — channels + EPG refetch on app foreground.

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
- [ ] **18.2** MSW fixtures realistic: 19 channels, 7d EPG, 200 catchup items.
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
