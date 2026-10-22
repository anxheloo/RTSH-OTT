# Upgrades — RTSH-OTT

> **Current state as of 2026-10-22** (doc-layout migration: the upgrade history moved here from `.claude/rules/ARCHITECTURE.md → Upgrade log`) · Expo SDK 57, RN 0.86 (react-native-tvos alias); 4 follow-ups open.
> Everything above **Run log** is rewritten by each run. The Run log is append-only, newest
> first, and an entry is never edited once committed — a run adds an entry, never a new file.

## Contents

- 2026-10-22 · Migration · upgrade log moved out of the architecture doc
- 2026-10-06 · Native change · Android Baseline Profile + lazy radio engine (1.0.3)
- 2026-09-14 · Upgrade · Expo SDK 57 patch sync + four production-crash fixes
- 2026-07-29 · Upgrade · Expo SDK 57 patch realignment (`expo` 57.0.2 → 57.0.8)

## Current versions

Read from `package.json` on 2026-10-22. The newest VERIFY recorded below is the 2026-10-06 entry;
the patch versions installed since then have no entry of their own.

- `expo` ~57.0.27 (SDK 57) · `react-native` → `npm:react-native-tvos@0.86.2-0` · `react` 19.2.3
- `expo-video` ~57.0.5 · `expo-audio` ~57.0.5 · `@sentry/react-native` ~7.11.0 · `typescript` ~6.0.3

## Pins and overrides

`package.json` carries no `overrides` / `resolutions`. The pins are version floors and an alias:

- **`expo-video` ≥ 57.0.2** — earlier versions keep the iOS `AVPlayer` decoding after unmount (expo/expo#47569). Never relax. Detail: `.claude/rules/architecture/player.md`.
- **`expo-modules-core` ≥ 57.0.3 (`expo` ≥ 57.0.5)** — precompiled `expo-video` binaries call the newer `_decorateModule` signature; older core = dyld `SIGABRT` at launch. Removal: none while precompiled modules are on.
- **`@sentry/react-native` ~7.11.0** — the version Expo SDK 57 pins (`expo/bundledNativeModules.json`), not npm-latest. Removal: the next SDK upgrade's pin.
- **`react-native` → `npm:react-native-tvos`** alias (needs `.npmrc legacy-peer-deps=true`, so `react-native-nitro-modules` and `@react-native/jest-preset` are declared explicitly). Removal: only if Android TV is dropped.

## Audit exceptions

None (no `.anxheloo-audit-exceptions.json`). `npm audit`'s build-time-only findings were accepted with a note on 2026-07-29 (see that entry).

## Open follow-ups

- **react-native-tvos with upstream #1159** — bump the alias to the first `0.86.x` after `0.86.3-0` (native; new binary). Detail: `.claude/rules/architecture/android-tv-stb.md → Known gaps`.
- **Expo 57.x patch drift** — `expo-doctor` reports packages out of date (12 on 2026-10-22); deliberately not synced on 2026-10-06. Run `npm run deps:sync` as its own change.
- **Build-time `npm audit` findings** — re-check at the next SDK upgrade (2026-07-29 entry).
- **Expo SDK 58** — deferred to its own phase (2026-09-14 entry).

## Run log (append-only, newest first)

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
