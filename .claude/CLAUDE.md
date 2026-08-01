# CLAUDE.md

@../AGENTS.md

Guidance for Claude Code when working in this repo.

## Project

RTSH TANI — OTT streaming app for Radio Televizioni Shqiptar. Live TV (19 channels) + Radio (13 channels) + EPG + Catch-up. **Mobile-first** (iOS + Android), then **tablet/iPad + TV** as an end-phase large-screen pass (same design, display adjustments + TV focus/D-pad nav) once mobile is complete and approved — see `.claude/docs/plan.md` **22.18**.

## Stack

- Expo SDK 57 · React Native 0.86.0 · React 19.2.3 · TypeScript strict · New Architecture only
  - **Android TV / STB** share this one codebase via the `react-native-tvos` **npm alias** (`react-native` → `npm:react-native-tvos@0.86.0-2`, a strict superset) **and, since 2026-07-28, ONE Android artifact** — a single APK/AAB installs on phone, tablet, Android TV and STB. `Platform.isTV` is resolved at runtime from `UiModeManager`, so the only build-time TV input is the manifest, written unconditionally by `plugins/withUniversalAndroidTV.js` (leanback launcher category + `uses-feature required="false"` block + TV banner). `EXPO_TV` is now **inert**; `@react-native-tvos/config-tv` is unregistered (kept in devDeps for a future tvOS target). `src/tv/` focus module unchanged. The alias needs `.npmrc legacy-peer-deps=true`, which forces two peers to be declared **explicitly**: `react-native-nitro-modules` (mmkv) + `@react-native/jest-preset`. Full mechanism + the open STB question: `rules/ARCHITECTURE.md → Android TV / STB`.
- Expo Router v7 (Native Tabs, typed routes)
- Single Zustand store composed from slices · MMKV persist · expo-secure-store for tokens
- TanStack Query v5 (server state) · axios (HTTP client)
- @stomp/stompjs (real-time: presence, watch-time, mid-roll ads, geo — STOMP over WebSocket)
- expo-video (live + VOD) · expo-audio (radio, background + lock-screen)
- @shopify/flash-list · react-native-reanimated v4 · react-native-gesture-handler · react-native-keyboard-controller
- react-hook-form + zod (forms + validation)
- i18next + expo-localization (sq default, en fallback)
- @sentry/react-native **7.11.0** — crash/error monitoring + tracing. **Installed 2026-07-29** (closes the 2026-07-03 deferral; plan 14.1 / 5.X.12 / 11.Y.6). Init in `lib/monitoring.ts`; org `acsolutions-1a`, project `react-native-rtsh-ott`, **EU region** (`https://de.sentry.io/` — never `sentry.io`). Version is pinned by Expo SDK 57, **not** npm-latest: several documented APIs are 8.x-only. Full mechanism + known gaps: `rules/ARCHITECTURE.md → Observability`. Replay / structured logging / profiling deliberately off.
- jest-expo + @testing-library/react-native — unit/behavior tests, co-located `__tests__/` folders (policy: `rules/STANDARDS.md §11`)
- EAS Build + EAS Update

## Commands

```bash
npm install
npx expo start --dev-client          # dev (custom dev client required)
npx expo run:ios                     # local dev build iOS
npx expo run:android                 # local dev build Android (phone + tablet + TV — one artifact)
npm run lint                         # ESLint
npm test                             # jest (unit/behavior tests)
npm run deps:sync                    # patch-sync deps within the pinned SDK (expo install --fix)
npm run expoUpgrade                  # full SDK upgrade chain (expo@latest → --fix → clean reinstall → doctor)

# EAS
eas build --profile development --platform ios
eas build --profile preview --platform all     # internal distribution
eas build --profile production --platform all  # store-ready
npm run eas:update:<dev|preview|prod> -- -m "..."                            # JS-only hotfix, eas-cli bundles (no Sentry maps)
npm run eas:update:withSentry:<dev|preview|prod>[:android|:ios] -- -m "..."  # + local export & Sentry source-map upload
npm run eas:update:list:<dev|preview|prod>                                   # recent updates on that channel's branch
npm run eas:update:help                                                      # prints both families + the --environment caveat

# Android TV / STB — NO separate build any more (2026-07-28). The normal
# android/preview/production artifacts already run on TV. The *_tv / *_stb
# profiles + *:tv:* scripts are KEPT as reference structure but build identically
# (EXPO_TV is inert); only APP_PLATFORM=androidstb still changes anything.
npm run android:stb:dev              # APP_PLATFORM=androidstb (operator STB device-type override)
```

**One Android artifact:** every prebuild produces the same TV-capable native project — there is no mobile-vs-TV toggle to manage. Emulator notes: `expo run:android` auto-targets the single booted device — don't pass `--device <serial>` (expo matches AVD *names*, not adb serials). A TV emulator AVD defaults `hw.keyboard=no` (text via the leanback IME); set it `yes` in the AVD `config.ini` + cold-restart to type with the host keyboard.

**Dev client mandatory** (Expo Go can't run MMKV, the expo-video/expo-audio config plugins, or other native modules).

## Environment

`.env` at root:
- `EXPO_PUBLIC_API_MODE` — **`mock | real`** (the **only** env var the app reads; the backend base URL is hardcoded in `src/api/client.ts`). Only the literal `mock` enables the fixture adapter; any other value is real. **It is a LOCAL DEV toggle for `expo start` only** — every EAS build profile and `ota:export` pin the value themselves, so `.env` can never decide what a build or an OTA ships (see `rules/ARCHITECTURE.md → OTA bundles on the publisher's machine`).

`EXPO_PUBLIC_API_MODE` really is the only var the **app** reads. The earlier plan to put `SENTRY_DSN` in the EAS dashboard was **dropped 2026-07-29**: a DSN is public (write-only) and must be in the client bundle anyway, so it is hardcoded in `lib/monitoring.ts` exactly like `API_BASE_URL`.

Build-time only (never read by app code): `APP_VARIANT`, `APP_PLATFORM`, and **`SENTRY_AUTH_TOKEN`** — a real secret that can publish releases to the Sentry org. It is **never committed**, never in the tree, and never passed to `Sentry.init`. It lives in exactly **one** place: **`eas env`, at `sensitive` visibility**, in the `preview` + `production` environments (`development` has none by design — `disableAutoUpload: IS_DEV`, and the dev OTA scripts skip the upload step entirely). That single copy serves both consumers:
- **EAS Build** injects it into the builder automatically.
- **EAS Update (OTA)** pulls it at publish time via **`eas env:exec <environment> '<cmd>'`** (`ota:sourcemaps:preview` / `:prod`), because the export + map upload run **locally**, before `eas update` is invoked.

**Visibility must stay `sensitive`, not `secret` (changed 2026-07-31).** `secret` means *"can only be accessed on EAS builder"* — proven empirically: `eas env:exec preview 'test -n "$SENTRY_AUTH_TOKEN"'` returned **absent** while the var was `secret`, so the local OTA upload silently had no credential. `sensitive` is still masked in the dashboard UI but is readable by the CLI, which is what `env:exec` needs. **A `secret` var cannot be converted in place** — EAS can't decrypt it either (`env:update --visibility` fails with *"type == SECRET can't be decrypted in any UI outside of EAS build environment"*); it must be re-set with `eas env:set`.

**No token file, no committed credential.** `.env.sentry-build-plugin` is **gitignored** and deliberately unused — an earlier plan to commit it was **withdrawn 2026-07-31** in favour of `env:exec`, which gives the same zero-setup fresh-clone workflow (you're already `eas login`'d if you can publish at all) without putting a release-publishing credential into permanent git history. **`npm run ota:preflight` was deleted** as redundant: `expo-upload-sourcemaps.js` itself `process.exit(1)`s on a missing token, so the `&&` chain already blocks the publish — a stronger guarantee than a proxy check, since it's the real uploader failing.

**`SENTRY_AUTH_TOKEN` can NEVER live in `.env`** — verified 2026-07-31: `@expo/env` exports `EXPO_PUBLIC_*` vars **only**, so it would be silently unloaded *and* inlined into every shipped bundle. **Never put a secret in `.env`.**

**`.env` stays gitignored**, and a fresh clone does not need it: `EXPO_PUBLIC_API_MODE` is read in exactly ONE place (`app/_layout.tsx`, `=== 'mock'`), so an absent `.env` resolves to "not mock" — the real API, the correct default for preview/production. Tracking it would only create a way to ship `mock` to users by accident.

MMKV is intentionally unencrypted, so there is no `MMKV_ENCRYPTION_KEY`.

## App variants

`app.config.ts` reads `APP_VARIANT` (`development | preview | production`) → different bundle IDs:
- prod: `al.rtsh.tani`
- preview: `al.rtsh.tani.preview`
- dev: `al.rtsh.tani.dev`

It also reads `APP_PLATFORM` (optional; `androidstb`) → `extra.devicePlatform`, the build-time platform override for operator STB builds (runtime can't distinguish an STB from retail Android TV). Consumed by `getDeviceType()` / `getDeviceClass()` in `utils/device.ts` (the `buildTimePlatform` const — STB build-flag wins first).

## Architecture

Where things live — file-level structure only. Mechanism, rationale, and known
gaps for every cross-cutting flow are in `rules/ARCHITECTURE.md`; read the
matching section there before changing behavior. Coding conventions are in
`rules/STYLE_GUIDE.md`.

### Navigation (`src/app/`)

Expo Router file-based. Root `_layout.tsx` uses `Stack.Protected` guards:
- No token → `(auth)/` (login → register → forgot)
- Token → `(app)/(tabs)/` (live, epg, catchup, radio, profile)
- Player route (`channel/[id]`) is full-screen at root — a **card push** with `slide_from_bottom` + `gestureEnabled: false`, deliberately NOT `presentation: 'fullScreenModal'` (that broke every global modal on iOS; `rules/ARCHITECTURE.md → Network state`).

### State (`src/store/`)

Single `useAppStore` composed from slices: `UserSlice`, `SettingsSlice`, `ThemeSlice`, `ModalSlice`, `NetworkSlice`, `PlayerSlice`, `ParentalSlice`, `RealtimeSlice`, `AdsSlice`. Persist via MMKV (`zustandStorage`); `partialize` controls what persists. Planned, not yet implemented: `ChannelsSlice` (favorites/recently-watched), `EpgSlice` (reminders).

Storage-layer breakdown (keychain vs MMKV vs query cache, and why): `rules/ARCHITECTURE.md → Persistence boundaries`.

### Networking (`src/api/`)

- `client.ts` — single `apiClient` (axios) + `queryClient`. Auth/refresh/device-identity mechanism: `rules/ARCHITECTURE.md → Auth flow` + `→ Device identity`.
- `endpoints.ts` — string constants for routes (`AUTH_ROUTES`, `CHANNELS_ROUTES`, etc).
- `services/*.ts` — domain-grouped axios calls (`auth.ts`, `channels.ts`, `epg.ts`, `guide.ts`, `users.ts`, `config.ts`). (`devices.ts` removed 2026-07-14 — device identity now rides the login/register-verify body, see `rules/ARCHITECTURE.md → Device identity`.)
- `queries/*.ts` / `mutations/*.ts` — TanStack Query/Mutation hooks wrapping services.
- `mocks/` — custom axios-adapter mock (not MSW) + fixtures, active when `EXPO_PUBLIC_API_MODE=mock`.

### Real-time (`src/realtime/`)

STOMP-over-WebSocket (`@stomp/stompjs`). `events.ts`, `midroll.ts` (pure scheduling core, no React), `client.ts` (singleton), `hooks/useChannelRealtime.ts`. Full mechanism (presence, watch-time, mid-roll, geo): `rules/ARCHITECTURE.md → Real-time`. Backend contract: `docs/REALTIME_SOCKET.md`.

### Player

- `components/Media/VideoPlayer.tsx` — base `expo-video` wrapper. The source's `contentType` is **inferred from the URL** via `inferContentType()` (`utils/resolveStreamSource.ts`): recognized streaming extensions map to their protocol (`.m3u8`→`hls`, `.mpd`→`dash`, `.ism(l)`→`smoothStreaming`), other media extensions → `auto`, and **no extension → `hls`** (our backend serves HLS from an extensionless `/playback/manifest?u=…` endpoint). Without this expo-video defaults to `auto` and the manifest fails to load.
- `components/Media/LivePlayer.tsx` — HLS player for **both** live and recorded (catch-up); AES-128 + DVR. Takes an ad-driven `paused` prop that pauses the stream for a mid-roll without a remount; a live stream best-effort re-syncs to the edge on resume.
- `components/Media/RadioAudioHost.tsx` — the single `expo-audio` engine, mounted above the router in `(app)/_layout`. Rationale + flow: `rules/ARCHITECTURE.md → Radio audio`.
- `components/Media/RadioPlayer.tsx` — presentational now-playing core; no playback logic. `RadioMiniPlayer` (Layout/) is the docked strip.
- `components/Media/PlayerControls.tsx` — overlay (auto-hide, fullscreen, PIP, audio tracks). Draggable scrubber, active only when seekable (recorded/catch-up — **live is deliberately non-seekable**). Requires `GestureHandlerRootView` at the app root.

**`expo-video` must stay `>= 57.0.2` — never relax this floor.** expo-modules-core 57 changed the SharedObject lifecycle so `release()` no longer deallocates the native object immediately (it lives until JS GC). expo-video 57.0.0/57.0.1 still tore the player down in `deinit`, so on iOS the `AVPlayer` **kept decoding and holding the audio session after the JS component unmounted** — closing the channel screen or switching to a catch-up programme left the previous stream audible, two at once (expo/expo#47569). 57.0.2 moves teardown into `sharedObjectWillRelease()` (expo/expo#47828). This is a **native** fix: it ships only in a new build, never via `eas update`.

**Paired floor: `expo-modules-core` must stay `>= 57.0.3` (i.e. `expo >= 57.0.5`) — verified 2026-07-29.** Expo ships **precompiled iOS xcframeworks** (`EXPO_USE_PRECOMPILED_MODULES`, default on), and a module's prebuilt binary is rebuilt against the **current** core **without bumping its own npm version**. `expo-modules-core` 57.0.3 dropped the `appContext:` argument from `AnyModule._decorateModule`, and `expo-video@57.0.2`'s published prebuilt calls the new 2-param form — so pairing it with core `<= 57.0.2` produces a **dyld `Symbol not found` `SIGABRT` at launch, before any JS runs**. Diagnose in seconds without rebuilding: `nm -gU <App>.app/Frameworks/ExpoModulesCore.framework/ExpoModulesCore | grep decorate | xcrun swift-demangle -compact` vs `nm -u .../ExpoVideo.framework/ExpoVideo | grep decorate | …` — mismatched signatures are this bug. Fix is to bump `expo`, **never** to downgrade `expo-video` (already latest; only its binary moved). Escape hatches if a future pairing breaks again: `package.json` → `expo.autolinking.apple.buildFromSource: ["ExpoVideo"]`, or `expo-build-properties` → `ios.usePrecompiledModules: false`.

Stream `User-Agent` stamping + the AES-128 header-forwarding open risk: `rules/ARCHITECTURE.md → Device identity`.

### Theme

`ThemeSlice` holds `mode` + `colors`; no ThemeProvider. Tokens in `src/theme/`: `colors.ts` (`lightTheme`/`darkTheme`), `fonts.ts` (`Fonts`, `FONTSIZE`), `borders.ts` (`BORDERRADIUS`), `spacing.ts` (`SPACING`) — all pass through `scaled()` from `@/responsive`. Full mechanism: `rules/ARCHITECTURE.md → Theme flow`.

### Responsive (`src/responsive/`)

Portable, self-contained module (`react`+`react-native` only). `useResponsiveGrid()` / `useResponsive()` (reactive layout), `scaled()` (static per-class sizing step). Config: `responsive/breakpoints.ts`. Full mechanism: `rules/ARCHITECTURE.md → Responsive layout & sizing`.

### Android TV / STB (`src/tv/`)

Focus/D-pad module, inert off-TV (`Platform.isTV`-gated) — mobile/iOS stays byte-identical. Full mechanism: `rules/ARCHITECTURE.md → Android TV / STB`.

### Specs

- `docs/API.md` — backend contract (source of truth for `src/api/`)
- `docs/REALTIME_SOCKET.md` — STOMP/WebSocket backend contract (presence, watch-time, mid-roll, geo)

## Doc sync (mandatory)

Every change that affects documented behavior must update the docs in the same turn — never leave them stale:

- **Cross-cutting flow changed** (auth, theme, boot/splash, network, persistence, radio audio, parental, navigation) → update `rules/ARCHITECTURE.md`'s current-state section directly (how it works / why / known gaps). No separate changelog file — `ARCHITECTURE.md` is a living current-state doc, not a history log; git history is the changelog.
- **Convention or pattern changed** → update `rules/STYLE_GUIDE.md`.
- **Feature added/removed, scope or stack changed** → update this file (CLAUDE.md).
- **Plan step done/superseded** → update `.claude/docs/plan.md` (and mark stale references in older entries).

## Working preferences (Anxhelo)

- Direct, sharp, precise. No fluff. Best solution first, root cause first.
- Production-quality TS/JS, scalable. Simplified, reusable.
- Security-minded (data flow, API boundaries, key handling).
- Ask one clear question if context is missing. Don't delete files without approval.

## On every session start

`rules/ARCHITECTURE.md` and `rules/STYLE_GUIDE.md` are auto-loaded alongside this
file every session — they're already in context, don't re-read them. Use
`ARCHITECTURE.md` as the detail layer before changing a cross-cutting flow
(auth, theme, boot/splash, network, persistence, radio audio); use
`STYLE_GUIDE.md` before writing or editing components/hooks/slices.

Read `.claude/docs/plan.md` to find the next step to execute — it's the single
source of truth for what's done vs. remaining (the standalone audit doc was
folded into it 2026-07-08 and retired).

## Output rule

All deliverable files go inside this repo (`RTSH-OTT/`). Source spec lives in `../assets/`.

## Mandatory product features (spec-required)

Beyond the architecture scaffold, these features are spec-mandated for v1 — do not treat as optional:

- **T&C acceptance** — enforced once at registration: the `acceptTerms` checkbox (zod-required) on the register form, with an inline link that opens the T&C URL in `expo-web-browser`. Acceptance is account-level (sent to backend as `termsAccepted`), not re-prompted on login — no client gate, no `tcAcceptedAt` flag (removed 2026-06-17).
- **Geoblocking** — channel-level (CDN / `PlaybackDecision`) + per-programme (EPG `decision` flag, live-boundary stop). Full mechanism: `rules/ARCHITECTURE.md → Real-time → Geo`.
- **Cellular-data gate** — confirmation modal before playback over cellular when `settings.cellularPlaybackAllowed === false`. `useCellularGate()` mounts on both player routes and returns `{ pending }`; while pending the player stays unmounted (channel) / the station isn't selected (radio), so nothing streams behind the modal. Requires `channel/[id]` to stay a **card push, not `fullScreenModal`** — see `rules/ARCHITECTURE.md → Network state`.
- ~~**Mosaic view**~~ — **cut from v1 by user decision (2026-06-11, plan 22.14f)**; route + components removed.
- **PIP + iOS background video** — always-on (no user setting). See `### Player` above for `LivePlayer`'s background/PiP wiring; entitlements come from the `expo-video` config plugin (native rebuild required on change).
- **Ads** — three slots (`APP_OPEN`, `CHANNEL_CHANGE` preroll, `MID_ROLL`), one merged array per context (`GET /ads?channelId=`), single `AdOverlay` component (`components/Media/AdOverlay.tsx`, design `adpop`), one-ad-at-a-time app-wide via `AdsSlice` + `useAdSlot`. Full slot orchestration (preroll gating, reveal delay, mid-roll pause + PiP gating, impression reporting, route-scoped exclusivity): `rules/ARCHITECTURE.md → Real-time`.
- **Quality picker** — manual ABR selection in the player options sheet (per-session, player-only; no persisted default in Settings). Resets to Auto on each channel open.
- **Parental control** — 4–6 digit PIN, device-level, client-only (SHA-256 local compare, no backend, no cross-device sync). Gates adult-flagged content only when enabled. Full mechanism: `rules/ARCHITECTURE.md → Parental control`.
- **Change password** — `POST /users/me/change-password`, rotates the refresh token, folds in "sign out other devices." See `rules/ARCHITECTURE.md → Auth flow 5b`.
- **Delete account** — `DELETE /users/me`; wipes session + parental config only on a confirmed 200. See `rules/ARCHITECTURE.md → Auth flow 5a`.
- **Background audio for radio** — `expo-audio` lock-screen controls + Android foreground service.
- **Analytics** — first-party telemetry, **currently DISABLED** (mounts commented out, pending backend ingestion — see `.claude/docs/plan.md → Phase 14`). Full mechanism: `rules/ARCHITECTURE.md → Analytics & telemetry`.

## Out of scope for v1

- Cast (Chromecast / AirPlay) — **fully removed 2026-07-31**. There is no cast UI anywhere, and the *implicit* AirPlay path is off too: `expo-video` defaults `allowsExternalPlayback` to **`true`**, so iOS was silently offering AirPlay from Control Center on every stream; `VideoPlayer.tsx` now sets it `false` on iOS. **Blocker to re-enabling either platform:** the receiver device fetches the manifest, segments and the AES-128 key itself, and custom headers do **not** cross the AirPlay/Cast session boundary — so `getStreamHeaders()`'s `User-Agent: RTSHTani-*` (`utils/device.ts`, the origin's gate) never arrives and the request is rejected. Playback auth must move to a **signed/expiring URL** (Apple's documented pattern: auth as a query param on the multivariant playlist — the same direction as the 15.2 geo contract) before casting is worth scoping. Once it does, iOS AirPlay is cheap (`VideoAirPlayButton` ships in expo-video already); Chromecast is not — `react-native-google-cast` has had **no code release since 2025-07-26** (4.9.1, "New Architecture **compatibility mode**", RN ≥ 0.76) and is unverified against our RN 0.86 New-Arch-only runtime, and the default Cast receiver does **not** support AES-128, so it would need a custom receiver plus a key-server CORS allowlist.
- Server-side ad insertion (SSAI) — client-side overlay only in v1.
- Widevine / FairPlay / PlayReady — AES-128 HLS only (spec confirms).
