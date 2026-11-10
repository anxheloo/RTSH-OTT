# Upgrades — RTSH-OTT

> **Current state as of 2026-11-09** (Expo SDK 58 upgrade, driven by iPhone Duo support) · Expo SDK 58, RN 0.88.1 (react-native-tvos alias 0.88.1-0); 5 follow-ups open.
> Everything above **Run log** is rewritten by each run. The Run log is append-only, newest
> first, and an entry is never edited once committed — a run adds an entry, never a new file.

## Contents

- 2026-11-09 · Upgrade · Expo SDK 57 → 58 for iPhone Duo (app 1.1.0)
- 2026-10-22 · Migration · upgrade log moved out of the architecture doc
- 2026-10-06 · Native change · Android Baseline Profile + lazy radio engine (1.0.3)
- 2026-09-14 · Upgrade · Expo SDK 57 patch sync + four production-crash fixes
- 2026-07-29 · Upgrade · Expo SDK 57 patch realignment (`expo` 57.0.2 → 57.0.8)

## Current versions

Read from `package.json` on 2026-11-09 (VERIFY: the 2026-11-09 entry below).

- `expo` ~58.0.23 (SDK 58) · `react-native` → `npm:react-native-tvos@0.88.1-0` · `react` 19.3.0
- `expo-video` ~58.0.13 · `expo-audio` ~58.0.11 · `@sentry/react-native` ~8.28.0 · `react-native-gesture-handler` ~3.3.0 · `react-native-nitro-modules` 0.37.2 · `jest` ~30.5.2 · `typescript` ~6.0.3

## Pins and overrides

`package.json` carries no `overrides` / `resolutions`. The pins are version floors and an alias:

- **`expo-video` ≥ 57.0.2** — earlier versions keep the iOS `AVPlayer` decoding after unmount (expo/expo#47569). Never relax. Detail: `.claude/rules/architecture/player.md`. (SDK 58 installs 58.0.13, above it.)
- **`expo-modules-core` ≥ 57.0.3 (`expo` ≥ 57.0.5)** — precompiled `expo-video` binaries call the newer `_decorateModule` signature; older core = dyld `SIGABRT` at launch. Removal: none while precompiled modules are on. (SDK 58: 58.0.30.)
- **`@sentry/react-native` ~8.28.0** — the version Expo SDK 58 pins (`expo/bundledNativeModules.json`), not npm-latest. Removal: the next SDK upgrade's pin.
- **`react-native` → `npm:react-native-tvos@0.88.1-0`** alias (needs `.npmrc legacy-peer-deps=true`, so `react-native-nitro-modules` and `@react-native/jest-preset` are declared explicitly). Removal: only if Android TV is dropped.
- **`react-native-nitro-modules` 0.37.2 and `@react-native/jest-preset` 0.88.1 move WITH React Native, by hand.** `legacy-peer-deps` means `expo install --fix` never touches them. Nitro below 0.36.2 cannot install its JSI bindings on RN 0.87+ (`installJSIBindingsWithRuntime was not called`, MMKV dead at launch); 0.37.2 is the release built against RN 0.88. Check both on every SDK upgrade.

## Audit exceptions

None (no `.anxheloo-audit-exceptions.json`). `npm audit`'s build-time-only findings were accepted with a note on 2026-07-29 (see that entry).

## Open follow-ups

- **R8 optimization on SDK 58 (AGP 9)** — a local release APK passed the register form, including the `@expo/ui` dropdown that crashed under optimization on 2026-10-19 (release check, 2026-11-09). The EAS production build still has to be smoke-tested before Play rollout. Its Compose dropdown field renders narrower than the other inputs (Material3 1.5); compare it with 1.0.3. Detail: `.claude/rules/architecture/observability.md`.
- **Baseline Profile re-capture** — owed on every SDK upgrade (`android-tv-stb.md → Known gaps`).
- **React Native Strict TypeScript API** — migrated, no `react-native-legacy-deep-imports` opt-out in use; keep it that way.
- **Build-time `npm audit` findings** — re-check (2026-07-29 entry).

## Run log (append-only, newest first)

<a id="upgrade-2026-11-09"></a>
### Upgrade — 2026-11-09 (Expo SDK 57 → 58 for iPhone Duo, app 1.1.0)

- **Why now:** iPhone Duo needs Expo SDK 58 + Xcode 27.1 (Expo's Duo guide). The SDK 58 deferral of
  2026-09-14 ends here. `react-native-tvos@0.88.1-0` exists, so the TV alias was not a blocker, and
  it carries upstream #1159 (the per-props-update TalkBack binder call behind the TV ANR).
- **Deps:** `expo` 57.0.27 → 58.0.23 via `npx expo install expo@latest` + `--fix` (it now resolves the
  TV alias itself, written as the exact `0.88.1-0`). Majors: `@sentry/react-native` 7.11 → 8.28
  (native/tooling only: Cocoa 9, CLI 3, SAGP 6), `react-native-gesture-handler` 2.32 → 3.3, `jest`
  29 → 30, `react-native-worklets` 0.10 → 0.13. By hand (legacy-peer-deps): `react-native-nitro-modules`
  0.36.1 → **0.37.2** (0.36.1 crashed at launch, see Pins), `@react-native/jest-preset` 0.88.1,
  `react-test-renderer` 19.3.0.
- **Breaking changes handled:** Strict TypeScript API (`ReusableBtn` owns its `onPress` type,
  `TextInputInstance` ref, `TVRemoteEvent` derived from `useTVEventHandler` + `Number()` on
  `eventKeyAction`, `AppState.currentState` nullable); Router 58 removed `beforeRemove` (parked
  `useBlurAndUnMount` now points at `usePreventRemove`); **Router 58 guards redirect instead of
  removing screens** — `Stack.Protected` needs `redirectTo`, or a signed-out cold start lands on
  "Unmatched Route" (fixed in `app/_layout.tsx`); **Gesture Handler 3's legacy `Gesture.Pan()` builder
  swallowed every tap on the player's TouchableOpacity controls** inside `ChannelSwipeArea` (fixed by
  `usePanGesture`); Reanimated jest resolver + Worklets jest mock + GH `jestSetup` in `setupFiles`;
  **the SDK 58 iOS template sets `UIViewControllerBasedStatusBarAppearance` to YES** (SDK 57: NO —
  apps built with the iOS 27 SDK cannot use the app-level status bar API), so the root
  `StatusBar.setBarStyle` stopped reaching pushed screens and react-native-screens' default `auto`
  followed the SYSTEM appearance — dark icons on the dark theme in Light mode (found on the register
  screen of a Release build). Fixed by `getStatusBarScreenOptions(mode)` on every native stack.
  **A legacy `Gesture.Pan()` builder nested inside a hook gesture loses to it:** on catch-up the TV
  scrubber's tap did nothing and a drag on it switched the channel (Android release build). Both
  seek bars (`PlayerControls`, `RadioSeekBar`) moved to `usePanGesture`; no builder gesture is left.
  **Radio play/pause toggled by itself** on Android (status frames lag commands, so a stale frame
  undid the user's tap, then the next undid that): `RadioAudioHost` now ignores frames that
  contradict its last command until the engine confirms it (1.5 s cap).
- **Native layer changed: YES** — new binary, so `version` 1.0.3 → **1.1.0** (runtimeVersion policy
  `appVersion`: 1.0.3 OTAs never reach 1.1.0 binaries). iOS prebuild now generates `SceneDelegate.swift`
  (UIScene life cycle); no custom AppDelegate code here, nothing to migrate.
- **VERIFY:** `tsc` clean · `lint` clean · **234/234 tests** · `expo-doctor` 20/20 · `expo install
  --check` up to date · iOS dev build on the iPhone Duo (iOS 27.1) and iPhone 18 Pro (iOS 27.0)
  simulators, live backend, guest mode: login, Home TV/radio, Guide, Search, Settings, channel player
  (split + stacked), swipe-to-switch, player options, radio player, fold/unfold/half-open ·
  Android **debug** build compiles (arm64, AGP 9 / Gradle 9.4.1). `format:check` fails on 91
  pre-existing files (not touched here). **Release check (same day, after the fixes above): 243/243
  tests** · production export for both platforms (Hermes bytecode) · **iOS Release** on the iPhone 18
  Pro simulator (live backend, guest): signed-out cold start → login, register form + country/city
  pickers, status bar readable on pushed screens, Home, live player, pause/resume, options sheet ·
  **Android release APK** (R8 on, arm64, `EXPO_PUBLIC_API_MODE=real`, no fixture strings) on Pixel 6
  API 33: register form incl. the `@expo/ui` Education dropdown (no R8 crash), login with the review
  account, live + catch-up HLS, catch-up tap-to-seek and drag-to-scrub (no channel switch), radio
  catch-up seek, radio play/pause holds · same APK on `RTSH_TV_API34`: D-pad login, Home, live
  channel, OK pause/resume. **Not run:** iPad / iPhone Duo on the Release build (Duo was covered on
  the dev build), a physical device, Baseline Profile re-capture.
- **Benign warning:** Metro logs `expo-router ... router-store ... Falling back to file-based
  resolution` — `@sentry/react-native` 8.28 probes a path SDK 58's router removed. Nothing breaks.

<a id="migration-2026-10-22"></a>
### Migration — 2026-10-22 (upgrade log out of the architecture doc)

Migrated verbatim from `.claude/rules/ARCHITECTURE.md → Upgrade log` → the three Run log entries below (2026-10-06, 2026-09-14, 2026-07-29), one entry per dated bullet.

The section's own intro ("Append-only, dated record of SDK/dependency upgrades…") is replaced by this ledger's header. The architecture doc was split into path-scoped topics the same day, and an upgrade history is a record, not current state, so it does not belong in a topic.

`ledger.sh fold-check` → `FOLD=OK:92 line(s) from 3 file(s)`.

<a id="native-change-2026-10-06"></a>
### Native change — 2026-10-06 (Android Baseline Profile + lazy radio engine)

- **2026-10-06: Android Baseline Profile + lazy radio engine (1.0.3, TV-box ANRs).** No dependency
  moved. **Native layer changed: YES** — `plugins/withAndroidBaselineProfile.js` writes
  `android/app/src/main/baseline-prof.txt` at prebuild, so it ships only in a new binary, never via
  `eas update`. The lazy radio engine (`RadioAudioHost` / `RadioSeekBar`) is JS-only and safe to OTA
  to runtime 1.0.2. Re-VERIFY: `tsc` clean · `expo lint` clean · **212/212 tests** · prebuild with the
  plugin → release build → `assets/dexopt/baseline.prof` 11.7 KB → 44 KB. Device-verified on
  `RTSH_TV_API34` with the release build against the live backend (demo login): register, login,
  Home, live channel, Guide, Search, radio playback. A logged-in cold start no longer creates a media
  session (1 → 0) and makes ~27 fewer binder calls. Measurements and rejected levers:
  `→ Android TV / STB → Known gaps`. `expo-doctor` reports 9 Expo 57.x patch mismatches
  (`expo` 57.0.22 → 57.0.27 and others); they pre-date this change and were deliberately not synced
  so the measured build is the one that ships.

<a id="upgrade-2026-09-14"></a>
### Upgrade — 2026-09-14 (Expo SDK 57 patch sync)

- **2026-09-14: Expo SDK 57 patch sync + four production-crash fixes.** Driven by the Sentry
  backlog on production build `al.rtsh.tani@1.0+17`, not by a version schedule. Still SDK 57 —
  SDK 58 is `58.0.0-preview.0` on npm and is deliberately deferred to its own phase
  (`anxheloo-expo-upgrade`).
  - **Deps:** `expo` 57.0.13 → 57.0.22, `expo-modules-core` 57.0.11 → 57.0.18, `expo-video`
    57.0.2 → 57.0.4, `expo-audio` 57.0.3 → 57.0.5, `expo-keep-awake` 57.0.1 → 57.0.2, plus the
    remaining 57.x drift. The only behavioral gain read from the changelogs is **expo-video
    57.0.3**, which fixes the Android `MissingActivity` throw when a `VideoPlayer` is constructed
    while the activity is briefly unavailable — the same background path as the crash below.
    `expo-keep-awake` 57.0.2 and `expo-video` 57.0.4 carry **no** user-facing changes, so the
    keep-awake fix had to be ours.
  - **Code (all four were unhandled-error sources, none a fork or a patched dependency):**
    (1) `useKeepAwake(undefined, { suppressDeactivateWarnings: true })` — the unmount `deactivate`
    rejects when the activity is already gone; uncaught it was the app's top issue by volume
    (634 events / 228 users). (2) `staysActiveInBackground` / `showNowPlayingNotification` are now
    armed only when the app is not backgrounded, and re-armed on foreground — both setters start
    the Android media foreground service, which Android 12+ refuses from the background.
    (3) the `apiError` modal's retry (`query.fetch()`) now catches, so a failed retry during a
    backend 522/523 outage no longer reports as an uncaught AxiosError. (4) `utils/openLink.ts`:
    Android TV opens legal links via `Linking` instead of Custom Tabs — the SecurityException was
    thrown natively inside `BrowserProxyActivity.onCreate`, which no JS catch can intercept.
  - **Native rebuild required: YES** (module bump). The four code fixes are JS-only and could ship
    by OTA, but the module bump cannot.
  - **Re-VERIFY:** expo-doctor 21/21 · `tsc --noEmit` clean · `expo lint` clean · **134/134 tests**.
  - **Device-verified against the LIVE backend** (Metro pinned `EXPO_PUBLIC_API_MODE=real`):
    Pixel 6 API 33 ✅ (live playback, media service foreground with a valid `PlaybackService`
    channel, playback continues backgrounded, in-app Terms browser), `RTSH_TV_API34` (leanback,
    1920×1080) ✅ (D-pad login, route menu, live playback, **legal link resolves to the TV's
    no-browser stub with no crash**), iPhone 17 Pro / iOS 26.5 ✅ (guest mode, live playback,
    background + resume, SFSafariViewController Terms). Log sweeps for `FATAL` /
    `BackgroundServiceStartNotAllowed` / `Bad notification` / unhandled rejection: **0 hits** on
    every device.
  - **NOT reproduced on device:** the original crashes themselves (an emulator would not enter the
    states that produce them), so this is a no-regression result plus a documented-behavior fix —
    the proof is the Sentry issues going quiet on the next production build.
  - **Emulator-only artifact worth not chasing:** the phone emulator's software AAC decoder
    (`c2.android.aac.decoder`) fails on the `video/mp2t` live stream and logs a dev-only
    `[VideoPlayer] playback error`. The TV emulator, iOS and real devices in Sentry all play the
    same stream fine.

<a id="upgrade-2026-07-29"></a>
### Upgrade — 2026-07-29 (Expo SDK 57 patch realignment)

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
