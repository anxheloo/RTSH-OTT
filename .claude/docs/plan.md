# plan.md — RTSH-OTT Build Plan

Step-by-step plan to build the RTSH TANI mobile prototype. Each step = one Claude Code session. Mark `✅` when done.

> Full reference: `../outputs/2026-05-26-rtsh-mobile-prototype-roadmap.html` — open in browser, copy prompt seeds from there into Claude Code as needed.

> **Testing strategy:** Use `npx expo run:android` for local testing throughout all phases. EAS cloud builds, device registration, and store submission are deferred to Phase 21 after the app is feature-complete.

---

## Phase 0 — Tooling & Init

- [x] **0.1** Install local toolchain (Node 20 LTS, Watchman, Xcode 16+, Android Studio + API 34, JDK 17, CocoaPods). Verify with `npx expo-doctor`. ✅ Node 20.20.2, all tools verified, 21/21 expo-doctor checks pass.
- [x] **0.2** Bootstrap project: `npx create-expo-app@latest . --template default`. Set scheme `rtshtani`, bundle id `al.rtsh.tani`. Reset template boilerplate. Install `expo-dev-client`. ✅ SDK 56, RN 0.85.3, strict TS, path aliases done.
- [x] **0.3** `eas login` + `eas init`. `app.config.ts` with `APP_VARIANT` variants. `eas.json` with development / preview / production profiles. ✅ Project ID wired, `simulator-ios` profile added.
- [x] **0.8** ESLint + Prettier: `npx expo lint` → bootstrap. Add `eslint-plugin-simple-import-sort`. `.prettierrc` (singleQuote, semi, 100, trailingComma all).
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
- [x] **2.2** `src/theme/borders.ts` — `BORDERRADIUS` const. ✅ radius_8/12/14 as const.
- [x] **2.3** `src/theme/spacing.ts` — `SPACING` (4px base). ✅ space_2 → space_64 as const.
- [x] **2.4** `src/theme/colors.ts` — `ThemeColors` interface + `lightTheme` + `darkTheme` (15 semantic tokens). ✅ Placeholder palette: RTSH-red primary, OLED-friendly dark theme. Swap brand hex when official.
- [x] **2.5** `src/store/createThemeSlice.ts` — `mode` + `colors`, `toggleTheme`, `setTheme(mode)`. ✅ Added `'system'` mode; pulled `zustand` install forward from 3.1.

---

## Phase 3 — Store, Storage & Providers

- [x] **3.1** `npm i react-native-mmkv` (zustand installed in 2.5). ✅ react-native-mmkv@4.3.1 via expo install.
- [x] **3.2** `src/store/storage.ts` — MMKV instance, `zustandStorage` adapter, `clearAppStorage`. ✅ STORAGE_KEYS lives in `src/constants/storage.ts` (Phase 1).
- [x] **3.3** `src/store/createUserSlice.ts` — user, token, isAuthenticated, login/logout. ✅ No app-lock (RTSH doesn't gate app entry; parental PIN only gates adult content).
- [x] **3.4** `src/store/createSettingsSlice.ts` — minimal: locale, tcAcceptedAt. ✅ Other fields (haptics, autoplay, dataSaver, parentalPinHash, cellular gate, qualityPreset, backgroundVideoAllowed) deferred until design lands.
- [~] **3.5** `src/store/createPlayerSlice.ts` — **To check after design.** Likely split: drop global video state (local + MMKV for resume), keep small `createRadioSlice` for cross-screen radio mini-player + background audio. Decide once design lands.
- [x] **3.6** `src/store/createModalSlice.ts` — modal stack (`apiError | noInternet | notify | confirmation`). ✅ Stack-based (multiple modals queueable), payload-driven for generic rendering by `ModalWrapper` later.
- [~] **3.7** `src/store/createChannelsSlice.ts` — **To check after API contract + design.** Likely TanStack Query (server-synced) or MMKV hook (client-only). Slice probably wrong abstraction.
- [~] **3.8** `src/store/createEpgSlice.ts` — **To check after design.** Likely MMKV-backed hook + expo-notifications scheduling, not a slice (only add/remove actions).
- [x] **3.9** `src/store/useAppStore.ts` — compose User/Settings/Theme/Modal slices, persist with `partialize` (user, locale, tcAcceptedAt, mode only), `onRehydrateStorage` re-applies theme colors from mode. Channels/EPG/Player slices deferred (3.5/3.7/3.8).
- [x] **3.10** `src/services/keychain.ts` — `storeOnKeychain`, `getFromKeychain`, `removeFromKeychain`. ✅ expo-secure-store installed + plugin wired in app.config.ts. Added `src/config/auth.ts` with `REFRESH_TOKEN_KEY`.
- [~] **3.11** Native deps `react-native-keyboard-controller`, `react-native-gesture-handler`, `@gorhom/bottom-sheet` — **To check after design.** Install + provider wiring depends on whether bottom-sheets are used and keyboard UX choices. (expo-secure-store already installed in 3.10.)

---

## Phase 4 — API Layer

- [x] **4.1** `npm i axios @tanstack/react-query`. `src/api/client.ts` — `apiClient` + `queryClient` (staleTime 5min, gcTime 10min, retry 1 non-401, no refetchOnFocus on RN). ✅ axios@1.16.1, TanStack v5.100.14.
- [x] **4.2** Request interceptor injects token from store. Response interceptor: single-flight refresh on 401 → retry → logout on fail. ✅ Decoupled via `registerRefreshHandler()` — auth mutation layer (4.6) wires the actual refresh logic. Disabled false-positive `import/no-named-as-default-member` rule for axios pattern.
- [x] **4.3** `src/api/endpoints.ts` — route constants for all resources (AUTH, USERS, CHANNELS, EPG, CATCHUP, RADIO, STREAMS, CONFIG). ✅ Placeholder paths — confirm against backend contract when delivered.
- [x] **4.4** `src/api/services/` — all 8 service files scaffolded (auth, users, channels, epg, catchup, radio, streams, config). ✅ auth/users/streams have typed request+response; channels/epg/catchup/radio/config return `unknown` pending API contract. Re-type when contract lands.
- [~] **4.5** `src/api/queries/` — **Defer** until services are real-typed (contract-dependent). Building queries on `unknown` adds no value.
- [x] **4.6** `src/api/mutations/` — auth mutations done (login, register, logout, forgotPassword). ✅ `authRefresh.ts` exports `setupAuthRefresh()` which wires `registerRefreshHandler` from 4.2 — call from app bootstrap (Phase 5.8). Other mutations (updateProfile, etc.) deferred until services typed.
- [ ] **4.7** `src/api/index.ts` — barrel re-export.
- [~] **4.8** MSW handlers + fixtures — **Defer** until API contract lands (no contract = no realistic fixtures).

---

## Phase 5 — Core Hooks

- [x] **5.1** `useCheckToken` — `useQuery`-based boot auth check. Proactively exchanges refresh token for access token via `refreshAccessToken()` (DRY with 401 interceptor). Store is post-resolution source of truth.
- [x] **5.2** `useAppState` — exposes app foreground/background transitions via options object `{ onForeground, onBackground, onChange }`. Only fires on actual `active ↔ background/inactive` transitions, not every status tick.
- [x] **5.3** `useOTA` — `expo-updates` check + fetch on mount. ✅ Wraps modern `Updates.useUpdates()` hook. Caller decides when to apply (`Updates.reloadAsync()`). No-op when `Updates.isEnabled` is false (dev). Errors swallowed — OTA must not block boot.
- [ ] **5.4** `useNetworkReconnect` — `@react-native-community/netinfo`, ties to TanStack `onlineManager`, mounts offline banner.
- [ ] **5.5** `useOrientation` + `useLockOrientationOnMount` — `npx expo install expo-screen-orientation`.
- [ ] **5.6** `useKeyboard` — wraps `react-native-keyboard-controller`.
- [ ] **5.7** `useHaptic` — `expo-haptics`, respects `settings.hapticsEnabled`.
- [ ] **5.8** `useBootstrap` — orchestrator: hydrate store + fetch /config + set i18n locale.
- [ ] **5.9** `src/hooks/index.ts` — barrel.

---

## Phase 6 — Core UI Components

- [ ] **6.1** `components/Inputs/ReusableText.tsx`
- [ ] **6.2** `components/Inputs/ReusableInput.tsx` — focus ring, icon slots, isPassword variant.
- [ ] **6.3** `components/Buttons/ReusableBtn.tsx` — loading state, disabled opacity, variants.
- [ ] **6.4** `components/Media/ReusableImage.tsx` — `expo-image`, blurhash placeholder, cache=disk.
- [ ] **6.5** `components/Layout/FullScreenLoader.tsx`, `TabHeader.tsx`, `OfflineBanner.tsx`.
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
