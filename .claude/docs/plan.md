# plan.md — RTSH-OTT Build Plan

Step-by-step plan to build the RTSH TANI mobile prototype. Each step = one Claude Code session. Mark `✅` when done.

> Full reference: `../outputs/2026-05-26-rtsh-mobile-prototype-roadmap.html` — open in browser, copy prompt seeds from there into Claude Code as needed.

---

## Phase 0 — Tooling & Init (~1 day)

- [x] **0.1** Install local toolchain (Node 20 LTS, Watchman, Xcode 16+, Android Studio + API 34, JDK 17, CocoaPods). Verify with `npx expo-doctor`.
- [x] **0.2** Bootstrap project: `npx create-expo-app@latest . --template default`. Set scheme `rtshtani`, bundle id `al.rtsh.tani`. Confirm `/src` + `app/` + Native Tabs template present. TS strict in `tsconfig.json`.
- [ ] **0.3** `eas login` + `eas init`. Create EAS env vars: `EXPO_PUBLIC_API_BASE_URL`, `SENTRY_DSN`, `MMKV_ENCRYPTION_KEY`.
- [ ] **0.4** `npx expo install expo-dev-client`. Build dev client: `eas build --profile development --platform all`. Install on sim + 1 physical device per platform.
- [ ] **0.5** Connect Expo MCP: `/mcp` → authenticate. Verify `search_documentation` returns SDK 55 results.
- [ ] **0.6** Connect Figma MCP: `/mcp` → authenticate. Park until design file arrives.
- [ ] **0.7** Path aliases: `tsconfig.json` paths `@/*` → `./*` + `babel-plugin-module-resolver` in `babel.config.js` mirroring.
- [ ] **0.8** ESLint + Prettier: `npx expo lint` → bootstrap. Add `eslint-plugin-simple-import-sort`. `.prettierrc` (singleQuote, semi, 100, trailingComma all).
- [ ] **0.9** `src/config/env.ts` — zod-validated env reader. Boot crashes on missing required vars.
- [ ] **0.10** `app.config.ts` — read `APP_VARIANT` (`development | preview | production`), swap bundle id + name. Three variants ready.
- [ ] **0.11** `eas.json` — three profiles: `development`, `preview`, `production`. Test `eas build --profile preview --platform ios`.

---

## Phase 1 — Project Structure (~0.5 day)

- [ ] **1.1** Create folder tree per `STYLE_GUIDE.md` "Folder structure" section. Empty `index.ts` barrels in place.
- [ ] **1.2** Verify path aliases: drop a test import `import x from "@/utils/x"`. TS happy, Metro resolves.
- [ ] **1.3** Write `README.md` (commands + env var matrix) and `CONVENTIONS.md` (points to `STYLE_GUIDE.md`).

---

## Phase 2 — Theme (~0.5 day)

- [ ] **2.1** `src/theme/fonts.ts` — `Fonts` (family map), `FONTSIZE`, `FONTWEIGHT`. Load custom font files (Outfit or similar) in `app/_layout.tsx` via `useFonts`.
- [ ] **2.2** `src/theme/borders.ts` — `BORDERRADIUS` const.
- [ ] **2.3** `src/theme/spacing.ts` — `SPACING` (4px base).
- [ ] **2.4** `src/theme/colors.ts` — `ThemeColors` interface + `lightTheme` + `darkTheme` (semantic names: `background`, `surface`, `text`, `textMuted`, `primary`, `onPrimary`, `border`, `success`, `error`, `warning`, `tabBar`, `inputBackground`, `cardBackground`, `headerBackground`, `videoPlaceholderBg`).
- [ ] **2.5** `src/store/createThemeSlice.ts` — `mode` + `colors`, `toggleTheme`, `setTheme(mode)`. Swap colors object on change.

---

## Phase 3 — Store, Storage & Providers (~1 day)

- [ ] **3.1** `npm i react-native-mmkv zustand`. Rebuild dev client.
- [ ] **3.2** `src/store/storage.ts` — `STORAGE_KEYS` (`PERSIST`, `RESUME_POSITIONS`), MMKV instance, `zustandStorage` adapter, `clearAppStorage`.
- [ ] **3.3** `src/store/createUserSlice.ts` — user, token, isAuthenticated, isLocked, login/logout/lock/unlock. Refresh token NEVER here (keychain).
- [ ] **3.4** `src/store/createSettingsSlice.ts` — locale, hapticsEnabled, autoplay, dataSaver, parentalPinHash, **tcAcceptedAt, cellularPlaybackAllowed, manualQualityPreset, backgroundVideoAllowed**.
- [ ] **3.5** `src/store/createPlayerSlice.ts` — currentChannelId, position, isPlaying, isFullscreen, isRadioActive.
- [ ] **3.6** `src/store/createModalSlice.ts` — modal stack (`apiError | noInternet | notify | confirmation`).
- [ ] **3.7** `src/store/createChannelsSlice.ts` — favorites, recentlyWatched.
- [ ] **3.8** `src/store/createEpgSlice.ts` — reminders (programId → fireAt).
- [ ] **3.9** `src/store/useAppStore.ts` — compose all slices, persist with `partialize` allowlist, `onRehydrateStorage` reapplies theme + relocks if needed.
- [ ] **3.10** `src/services/keychain.ts` — `storeOnKeychain`, `getFromKeychain`, `removeFromKeychain` (wraps expo-secure-store).
- [ ] **3.11** Install `npx expo install expo-secure-store react-native-keyboard-controller react-native-gesture-handler @gorhom/bottom-sheet`. Rebuild dev client.

---

## Phase 4 — API Layer (~1 day)

- [ ] **4.1** `npm i axios @tanstack/react-query`. `src/api/client.ts` — single `apiClient` (axios) + `queryClient` with defaults (staleTime 5min, retry 1 non-401, refetchOnReconnect always).
- [ ] **4.2** Request interceptor — inject token from store. Response interceptor — single-flight refresh on 401 → retry once → logout on refresh fail.
- [ ] **4.3** `src/api/endpoints.ts` — route constants for all resources: auth, channels, epg, catchup, radio, streams, users, config.
- [ ] **4.4** `src/api/services/auth.ts`, `channels.ts`, `epg.ts`, `catchup.ts`, `radio.ts`, `streams.ts`, `users.ts`, `config.ts` — one async function per endpoint with typed return.
- [ ] **4.5** `src/api/queries/` — TanStack Query hooks per resource (`useChannels`, `useEpg(date)`, `useCatchup(filters)`, etc).
- [ ] **4.6** `src/api/mutations/` — `useLoginMutation`, `useRegisterMutation`, `useUpdateProfileMutation`, etc.
- [ ] **4.7** `src/api/index.ts` — barrel re-export.
- [ ] **4.8** `npm i -D msw msw-react-native`. `src/api/mocks/handlers.ts` + `src/api/mocks/fixtures/` (channels, epg, catchup, programs). Boot when `EXPO_PUBLIC_API_MODE=mock`.

---

## Phase 5 — Core Hooks (~1 day)

- [ ] **5.1** `useCheckToken` — read token from keychain on boot, hydrate store, return `{token, ready}`.
- [ ] **5.2** `useAppState` — listens AppState, sets `isLocked` after 30s in background.
- [ ] **5.3** `useOTA` — `expo-updates` check on app load. `npx expo install expo-updates`.
- [ ] **5.4** `useNetworkReconnect` — `@react-native-community/netinfo`, ties to TanStack `onlineManager`, mounts offline banner.
- [ ] **5.5** `useOrientation` + `useLockOrientationOnMount` — `npx expo install expo-screen-orientation`.
- [ ] **5.6** `useKeyboard` — wraps `react-native-keyboard-controller` for animated height.
- [ ] **5.7** `useHaptic` — `npx expo install expo-haptics`, respects `settings.hapticsEnabled`.
- [ ] **5.8** `useBootstrap` — orchestrator: hydrate store + fetch /config + set i18n locale. Returns `{ready}`.
- [ ] **5.9** `src/hooks/index.ts` — barrel.

---

## Phase 6 — Core UI Components (~2 days)

- [ ] **6.1** `components/Inputs/ReusableText.tsx` — Text wrapper, optional `onPress`, theme + font props.
- [ ] **6.2** `components/Inputs/ReusableInput.tsx` — TextInput wrapper, focus ring from theme, icon1/icon2 slots, isPassword variant.
- [ ] **6.3** `components/Buttons/ReusableBtn.tsx` — TouchableOpacity, loading state with ActivityIndicator, disabled opacity. Variants via `backgroundColor` + `textColor` props.
- [ ] **6.4** `components/Media/ReusableImage.tsx` — `expo-image` wrapper, blurhash placeholder, cache='disk', optional loading overlay + onPress.
- [ ] **6.5** `components/Layout/FullScreenLoader.tsx`, `TabHeader.tsx`, `OfflineBanner.tsx`.
- [ ] **6.6** `components/ModalWrapper.tsx` — reads `modal` from store, renders matching modal (apiError, noInternet, notify, confirmation).
- [ ] **6.7** `components/empty/EmptyChannelsState.tsx`, `EmptyEpgState.tsx`, `EmptyCatchupState.tsx`.
- [ ] **6.8** Barrels: `components/Buttons/index.ts`, etc.

---

## Phase 7 — Form Layer (~0.5 day)

- [ ] **7.1** `npm i react-hook-form zod @hookform/resolvers`.
- [ ] **7.2** `components/Inputs/ControlledInput.tsx` — RHF Controller wrapping `ReusableInput`.
- [ ] **7.3** Login + register + forgot zod schemas in `src/features/auth/schemas.ts`.

---

## Phase 8 — Navigation (~1 day)

- [ ] **8.1** `app.json` → `experiments.typedRoutes: true`.
- [ ] **8.2** `app/_layout.tsx` — `SplashScreen.preventAutoHideAsync()`, `useFonts`, `useBootstrap`, `useCheckToken`, `useAppState`, `useOTA`. Providers: `GestureHandlerRootView` → `KeyboardProvider` → `QueryClientProvider` → `BottomSheetModalProvider`. Stack with `Stack.Protected` guards (no token → auth, token+locked → unlock, token+unlocked → app).
- [ ] **8.3** `app/(auth)/_layout.tsx`, `login.tsx`, `register.tsx`, `forgot.tsx`.
- [ ] **8.4** `app/unlock.tsx` — biometric/PIN gate.
- [ ] **8.5** `app/(app)/_layout.tsx` — Stack with `(tabs)`, `player/[id]`, `channel/[id]`, `program/[id]`.
- [ ] **8.6** `app/(app)/(tabs)/_layout.tsx` — Native Tabs (Live / EPG / Catchup / Radio / Profile). SF Symbols on iOS, Material on Android.
- [ ] **8.7** `app/(app)/player/[id].tsx` — `presentation: "fullScreenModal"`, `orientation: "all"`. Reads `id` + `type=live|vod`.
- [ ] **8.8** Deep links: `scheme: "rtshtani"`, document routes (`rtshtani://channel/5`).

---

## Phase 9 — Video & Audio Players (~2 days)

- [ ] **9.1** `npx expo install expo-video expo-audio`. Config plugin for `expo-video` (PIP yes, background no). Rebuild dev client.
- [ ] **9.2** `components/Media/VideoPlayer.tsx` — base `expo-video` wrapper. Props: source `{uri, headers, metadata}`, `isLive`, `autoPlay`, callbacks. Sets `contentType: "hls"` for `.m3u8`. Pushes state to `playerSlice`. Releases on unmount.
- [ ] **9.3** `components/Media/PlayerControls.tsx` — overlay reads `playerSlice`, auto-hides after 3s, top bar (back, title, settings, cast stub), bottom (play/pause, time, progress, fullscreen, PIP). Settings menu includes **quality picker (manual ABR via expo-video track selection)**, audio tracks, subtitles.
- [ ] **9.4** `components/Media/LivePlayer.tsx` — wraps VideoPlayer with `isLive=true`, "LIVE" badge, no progress bar, current program from EPG, audio-track switcher. **Validate AES-128 key fetch with real stream early.**
- [ ] **9.5** `components/Media/VodPlayer.tsx` — VideoPlayer with `isLive=false`, custom seek bar (Reanimated gesture), ±10s tap zones, resume positions (`storage.set('resume_${programId}', position)`).
- [ ] **9.6** Fullscreen + orientation: phone landscape lock, tablet free, status bar hidden in FS.
- [ ] **9.7** `components/Media/RadioPlayer.tsx` — `expo-audio`, `setActiveForLockScreen`, `updateLockScreenMetadata`. Android foreground service plugin.
- [ ] **9.8** `components/Layout/RadioMiniPlayer.tsx` — docked bottom-of-tabs when radio active, tap expands.

---

## Phase 10 — Lists (~0.5 day)

- [ ] **10.1** `npx expo install @shopify/flash-list`.
- [ ] **10.2** `components/AnimatedFlashList.tsx` — themed separator, loading footer, empty slot, refresh-control wired.
- [ ] **10.3** `components/empty/*` already done in P6 — reuse.

---

## Phase 11 — Screen Scaffolds (~2 days)

- [ ] **11.1** Splash + boot wired in `_layout` (already P8.2).
- [ ] **11.2** `(auth)/login.tsx` — form, mutation, navigate `(app)` on success.
- [ ] **11.3** `(auth)/register.tsx`, `(auth)/forgot.tsx`.
- [ ] **11.4** `(tabs)/index.tsx` Live — featured hero + channel grid. Tap → `/player/[id]?type=live`.
- [ ] **11.5** `(tabs)/epg.tsx` — date picker (-3 to +7), channel rail + horizontal timeline, synced scroll.
- [ ] **11.6** `(tabs)/catchup.tsx` — InfiniteList, genre filter chips, resume badge.
- [ ] **11.7** `(tabs)/radio.tsx` — radio channels grid, tap starts RadioPlayer + mini-player dock.
- [ ] **11.8** `(tabs)/profile.tsx` — sections (Account, Playback, Appearance, Notifications, Parental, Language, Legal, About, Sign out).
- [ ] **11.9** `player/[id].tsx` — header + Live/VOD player + (portrait only) program info + "Up next" rail.
- [ ] **11.10** `channel/[id].tsx`, `program/[id].tsx`.

---

## Phase 12 — Auth Flow Hardening (~1 day)

- [ ] **12.1** Refresh queue (single-flight) verified — write a test that fires 5 parallel 401s, confirms 1 refresh + 5 retries.
- [ ] **12.2** Biometric: `npx expo install expo-local-authentication`. Prompt after login. `unlock.tsx` honors biometric if enabled.
- [ ] **12.3** Parental PIN: 4-digit, hashed with `expo-crypto` SHA-256 + salt in keychain. PIN entry component with shake-on-wrong + lockout after 5.

---

## Phase 13 — i18n (~0.5 day)

- [ ] **13.1** `npm i i18next react-i18next` + `npx expo install expo-localization`.
- [ ] **13.2** `src/i18n/index.ts` — init sq default, en fallback, locale from `Localization.locale`.
- [ ] **13.3** Namespaces: `common`, `auth`, `player`, `epg`, `errors`.
- [ ] **13.4** Language switcher in `(tabs)/profile.tsx`.

---

## Phase 14 — Telemetry (~0.5 day)

- [ ] **14.1** `npx expo install @sentry/react-native`. Init before providers. Scrub PII in `beforeSend`.
- [ ] **14.2** EAS source-maps upload on every build.
- [ ] **14.3** `src/services/analytics.ts` — provider-agnostic `track / identify / screen`. No-op stub for v1.
- [ ] **14.4** Settings toggle: "Send anonymous analytics" (default on).

---

## Phase 15 — RTSH Product Features (~2 days)

> These are spec-mandated features from the May 12 delivery roadmap (P2). They sit on top of the architecture scaffold built in P0–P14.

- [ ] **15.1** **T&C acceptance onboarding** — first-launch screen after register/login if `settings.tcAcceptedAt` null. Renders T&C URL via `expo-web-browser` or in-app `WebView`. Accept → set `tcAcceptedAt` → continue. Deny → exit.
- [ ] **15.2** **Geoblocking overlay** — when streams endpoint returns 451 / geo error, render full-screen overlay (RTSH logo + i18n message + retry). Check on every channel open. Backend returns `{geoBlocked: true, reason}` payload.
- [ ] **15.3** **Cellular-data gate** — when `useNetInfo` reports cellular AND `settings.cellularPlaybackAllowed === false`, intercept video start with confirmation modal ("Streaming over mobile data may use significant data. Continue?"). Remember per-session.
- [ ] **15.4** **Mosaic view** — new screen `(app)/mosaic.tsx` (or accessible from Live tab via header button). Grid of 4/6/9 channel thumbnails refreshing every N seconds (use `expo-video-thumbnails` or snapshot of low-bitrate variant). Tap → switch to that channel in main player.
- [ ] **15.5** **Picture-in-Picture + iOS background video** — `expo-video` config plugin `supportsBackgroundPlayback` toggled by `settings.backgroundVideoAllowed`. PIP enabled on iOS for live + VOD. Auto-PIP on background per user setting.
- [ ] **15.6** **Refresh on app foreground** — already wired via TanStack `focusManager` in P5.2, but confirm channels + EPG refetch on foreground.

---

## Phase 16 — Ad Infrastructure (~1.5 days)

> Spec requires ad insertion. Three placements: launch, channel-switch, time-scheduled. v1 = client-side overlay; v2 may move to server-side ad insertion (SSAI).

- [ ] **16.1** `src/api/services/ads.ts` — `getAdManifest(slot: "launch" | "channelSwitch" | "scheduled")` returns `{adId, mediaUrl, durationSec, skipAfterSec, clickThroughUrl}`.
- [ ] **16.2** `components/Media/AdOverlay.tsx` — full-screen video using a second `expo-video` instance. Countdown + skip button after `skipAfterSec`. Clickthrough opens `expo-web-browser`.
- [ ] **16.3** **Launch ad** — `useBootstrap` orchestrator fetches launch ad after auth check; AdOverlay mounted before first screen if manifest returned.
- [ ] **16.4** **Channel-switch ad** — frequency-capped (e.g. once per N minutes) via `playerSlice.adsLastShownAt`. Triggered in `LivePlayer` mount.
- [ ] **16.5** **Scheduled ads** — backend pushes schedule via `/config`; `useScheduledAds` hook holds a timer that triggers AdOverlay at scheduled times.
- [ ] **16.6** Analytics: ad impression, skip, complete, clickthrough events wired through `analytics.ts`.

---

## Phase 17 — Client-side Hardening (~1.5 days)

> The Expo/RN-side hardening that affects code. (Legal audit, content finalization, store listings are out of scope for this plan — handled outside the Expo repo.)

- [ ] **17.1** **Secure storage verification** — grep + audit confirms: refresh token only in `expo-secure-store`, access token never persisted to disk, MMKV encryption key sourced from EAS env, no tokens or PII in `console.log` or Sentry breadcrumbs, `beforeSend` scrubs auth headers.
- [ ] **17.2** **Accessibility (WCAG 2.1 AA)** — `accessibilityLabel` + `accessibilityRole` on every interactive, color contrast pass on both themes (use `react-native-a11y` linter), dynamic font size respected (no fixed pixel heights on text containers), screen-reader flow on player controls, focus order correct on forms.
- [ ] **17.3** **Performance budget** — instrument with Sentry transactions for: cold start, player init, channel list render, EPG load. Targets: cold start < 2s, TTI < 3s on mid-Android, list scroll > 58fps, bundle < 25MB uncompressed. Use `react-native-performance` for FPS monitoring. Address regressions.
- [ ] **17.4** **i18n string completeness** — script that flags missing keys in `sq.json` / `en.json`, fails CI on missing keys. ICU formatting verified for plurals, dates, durations.
- [ ] **17.5** **Privacy policy + T&C in-app surfacing** — `app/(app)/(tabs)/profile.tsx` exposes both URLs via `expo-web-browser`. URLs read from `/config` so RTSH legal can update without app release.

---

## Phase 18 — Build & Run (~0.5 day)

- [ ] **18.1** Dev build via `eas build --profile development --platform all` on push to `main`.
- [ ] **18.2** Preview build via `eas build --profile preview --platform all` for internal testing.
- [ ] **18.3** Production build profile autoIncrements `versionCode` / `buildNumber`.
- [ ] **18.4** `npx expo install expo-updates`. EAS Update channels wired (development / preview / production). JS-only hotfixes via `eas update --channel production`.

---

## Phase 19 — Backend-readiness handoff (~0.5 day)

- [ ] **19.1** Draft `docs/API.md` (OpenAPI) from current services. Share with backend team.
- [ ] **19.2** All MSW fixtures realistic (19 channels, 7 days EPG, 200 catchup items).
- [ ] **19.3** Env switching via `EXPO_PUBLIC_API_MODE`. Dev menu (long-press in dev) exposes quick switcher.
- [ ] **19.4** `src/config/featureFlags.ts` — local + remote, fetched on boot from `/config`.

---

## Phase 20 — Store Submission via EAS (Apple + Google only)

> Only iOS App Store + Google Play. Tizen / webOS / Android TV submissions are out of scope for the mobile prototype.

- [ ] **20.1** **iOS — App Store Connect prep** — Apple Developer account active, bundle ID `al.rtsh.tani` registered, certificates + provisioning profiles managed by EAS (`eas credentials`). App Store Connect listing draft: name "RTSH TANI", subtitle, description, keywords, age rating (likely 12+), privacy nutrition labels (data collected: usage analytics, crash reports; no PII sold), URL for privacy policy + support.
- [ ] **20.2** **iOS — screenshots + assets** — required sizes: 6.7" (iPhone 16 Pro Max), 6.5" (iPhone 14 Plus / 11 Pro Max), 5.5" (iPhone 8 Plus), 12.9" (iPad Pro). Captured on simulator via Xcode + dressed in marketing frames (optional). App icon 1024×1024 PNG, no alpha.
- [ ] **20.3** **iOS — submit** — `eas submit --platform ios --profile production`. EAS uploads the build to App Store Connect. Promote to TestFlight first (external testing 1–3 days), then submit for App Store review. Apple review typically 24–48h in 2026.
- [ ] **20.4** **Android — Google Play Console prep** — Google Play developer account active, package `al.rtsh.tani` reserved, Play App Signing enabled (mandatory — losing the upload key without it is catastrophic over a 4-year contract). Listing draft: title, short + full description, categorization, content rating questionnaire (IARC), data safety form, screenshots, feature graphic 1024×500.
- [ ] **20.5** **Android — closed testing** — Google's policy requires a closed testing track running ≥14 days with ≥12 testers before the app can be promoted to production. Create closed track in Play Console, upload preview build, invite testers (TestFairy / direct emails).
- [ ] **20.6** **Android — submit** — `eas submit --platform android --profile production`. After 14-day closed testing window, promote to production with staged rollout (1% → 10% → 50% → 100%).
- [ ] **20.7** **Rejection-handling buffer** — keep 5 working days for review feedback. Common rejections to pre-empt: missing DRM disclosure, ad placement disclosure, third-party SDK declarations, age rating mismatch.

---

## Working with Claude Code

For each step:
1. Open this file. Find the step.
2. In Claude Code: `Working on step X.Y from plan.md. Context: <list current files / what's already in store / API mode>. Use Expo MCP for SDK lookups. Follow STYLE_GUIDE.md.`
3. Refer to `../outputs/2026-05-26-rtsh-mobile-prototype-roadmap.html` for the full "What/Why/How/DoD/prompt seed" of that step.
4. Verify: ask Claude to start dev client, screenshot key screens via Expo MCP, confirm match.
5. Commit (Conventional Commits): `feat(p3): add createUserSlice` referencing the step number.
6. Mark `✅` here.

## Reordering rules

- Phases are sequential by default. Inside a phase, follow step order — most are soft-dependent on the previous.
- You can run **P0 admin track** (0.3 EAS, 0.10 app variants, 0.11 build profiles) in parallel with **P1–P3 engineering** if both hands are free.
- Don't skip P3 → P9. The player depends on store + storage.

## Reference

- Roadmap with full step details + Claude Code prompt seeds: `../outputs/2026-05-26-rtsh-mobile-prototype-roadmap.html`
- Style guide: `../RTSH-OTT/STYLE_GUIDE.md`
- Project memory: `../MEMORY.md`
- Original spec: `../assets/4._DST_-_OTT.docx`
