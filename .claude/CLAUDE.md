# CLAUDE.md

@../AGENTS.md

Guidance for Claude Code when working in this repo.

## Project

RTSH TANI — OTT streaming app for Radio Televizioni Shqiptar. Live TV (19 channels) + Radio (13 channels) + EPG + Catch-up. **Mobile-first** (iOS + Android), then **tablet/iPad + TV** as an end-phase large-screen pass (same design, display adjustments + TV focus/D-pad nav) once mobile is complete and approved — see `.claude/docs/plan.md` **22.18**.

## Stack

- Expo SDK 57 · React Native 0.86.0 · React 19.2.3 · TypeScript strict · New Architecture only
  - **Android TV / STB** share this codebase via the `react-native-tvos` **npm alias** (`react-native` → `npm:react-native-tvos@0.86.0-2`) and, since 2026-07-28, **ONE Android artifact** for phone, tablet, TV and STB: `Platform.isTV` resolves at runtime, and the TV manifest comes from `plugins/withUniversalAndroidTV.js`. `EXPO_TV` is **inert**. The alias needs `.npmrc legacy-peer-deps=true`, so `react-native-nitro-modules` + `@react-native/jest-preset` are declared **explicitly**. → `rules/architecture/android-tv-stb.md`
- Expo Router v7 (Native Tabs, typed routes)
- Single Zustand store composed from slices · MMKV persist · expo-secure-store for tokens
- TanStack Query v5 (server state) · axios (HTTP client)
- @stomp/stompjs (real-time: presence, watch-time, mid-roll ads, geo — STOMP over WebSocket)
- expo-video (live + VOD) · expo-audio (radio, background + lock-screen)
- @shopify/flash-list · react-native-reanimated v4 · react-native-gesture-handler · react-native-keyboard-controller
- react-hook-form + zod (forms + validation)
- i18next + expo-localization (sq default, en fallback)
- @sentry/react-native **7.11.0** (pinned by Expo SDK 57, **not** npm-latest) — init in `lib/monitoring.ts`; org `acsolutions-1a`, project `react-native-rtsh-ott`, **EU region** (`https://de.sentry.io/`, never `sentry.io`). Replay / logging / profiling deliberately off. → `rules/architecture/observability.md`
- jest-expo + @testing-library/react-native — unit/behavior tests, co-located `__tests__/` folders (policy: `rules/STANDARDS.md §11`)
- EAS Build + EAS Update
- Store listing art is tracked in `store/store-assets.json` (→ `rules/architecture/store-assets.md`); the **App Store listing itself is code** in `store/store.config.json`, pushed by `eas metadata:push` — Apple only, Play stays console work (→ `rules/architecture/release-and-store-submission.md`).

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

# App Store listing (Apple only — Play stays console-driven)
npm run eas:metadata:lint    # validate store/store.config.json. No network, no writes. Safe.
npm run eas:metadata:push    # PUBLISH the listing to App Store Connect (lints first, refuses on error)
npm run eas:metadata:help    # order of operations + why there is no pull script

# Android TV / STB — NO separate build any more (2026-07-28). The normal
# android/preview/production artifacts already run on TV. The *_tv / *_stb
# profiles + *:tv:* scripts are KEPT as reference structure but build identically
# (EXPO_TV is inert); only APP_PLATFORM=androidstb still changes anything.
npm run android:stb:dev              # APP_PLATFORM=androidstb (operator STB device-type override)
```

**Dev client mandatory** (Expo Go can't run MMKV, the expo-video/expo-audio config plugins, or other native modules). Android emulator + TV-AVD notes: `rules/architecture/android-tv-stb.md`.

## Releasing

Two kinds of update, never mixed: a **JS fix** to the current version (from `main`, partial rollout first), and a **store notice** to an older version (from a worktree of the newest code live on that runtime, never `main`). Tag every store build (`git tag v<version>`). EAS Update's Free plan caps delivery at 1,000 monthly updating users and fails **silently** (HTTP 429) — probe before and after every publish. Full runbook with commands: `rules/architecture/ota-releases.md`.

## Environment

`.env` at root:
- `EXPO_PUBLIC_API_MODE` — **`mock | real`**, the **only** env var the app reads (the backend base URL is hardcoded in `src/api/client.ts`). Only the literal `mock` enables the fixture adapter. **A LOCAL DEV toggle for `expo start` only** — every EAS build profile and `ota:export` pin it, so `.env` never decides what a build or an OTA ships.
- `.env` stays **gitignored**; a fresh clone does not need it (absent ⇒ "not mock" ⇒ the real API).

Build-time only (never read by app code): `APP_VARIANT`, `APP_PLATFORM`, and **`SENTRY_AUTH_TOKEN`**. The token lives in exactly one place — **`eas env` at `sensitive` visibility** (not `secret`: `env:exec` cannot read `secret`) in `preview` + `production`; EAS Build injects it, OTA publishes read it via `eas env:exec`. **Never put a secret in `.env`, and never give one an `EXPO_PUBLIC_` prefix** (those are inlined into every bundle). The Sentry DSN is public and hardcoded in `lib/monitoring.ts`. Detail: `rules/architecture/observability.md`.

MMKV is intentionally unencrypted, so there is no `MMKV_ENCRYPTION_KEY`.

## App variants

`app.config.ts` reads `APP_VARIANT` (`development | preview | production`) → different bundle IDs.
**iOS and Android diverged 2026-08-20** with the move to RTSH's own Apple org account (team
`65K2L4RTV3`, ASC app `6803853740`): a bundle id cannot be reused across accounts, so iOS gained an
`.ott` segment. Android is untouched (reusing the package keeps the Play listing).

| Variant | iOS `bundleIdentifier` | Android `package` |
|---|---|---|
| prod | `al.rtsh.tani.ott` | `al.rtsh.tani` |
| preview | `al.rtsh.tani.ott.preview` | `al.rtsh.tani.preview` |
| dev | `al.rtsh.tani.ott.dev` | `al.rtsh.tani.dev` |

The `.dev` / `.preview` **suffixes are load-bearing**: `lib/monitoring.ts` derives Sentry's
`environment` from `Application.applicationId.endsWith(...)` — any future id change must re-check it.

`APP_PLATFORM` (optional; `androidstb`) → `extra.devicePlatform`, the build-time override for operator STB builds (runtime can't tell an STB from retail Android TV); read by `getDeviceType()` / `getDeviceClass()` in `utils/device.ts`.

## Architecture

Where things live. How each flow works, why, and its known gaps: the topic files under
`rules/architecture/`, listed in `rules/ARCHITECTURE.md`. Conventions: `rules/STYLE_GUIDE.md`.

- **Navigation (`src/app/`)** — Expo Router; root `_layout.tsx` guards with `Stack.Protected` (no session → `(auth)/`, session → `(app)/(tabs)/`). Player routes (`channel/[id]`, `radio/[id]`) are **card pushes** via `getPlayerScreenOptions()`, deliberately not a native presentation (→ `rules/architecture/network-state.md`). Sheets live in `(modals)/` via `getModalScreenOptions()`; the group stays in hrefs (`/(app)/(modals)/theme`). Both builders: `utils/navigation.ts`.
- **State (`src/store/`)** — one `useAppStore` from slices (`User`, `Settings`, `Theme`, `Modal`, `Network`, `Player`, `Parental`, `Realtime`, `Ads`), MMKV persist with `partialize` (→ `rules/architecture/persistence-boundaries.md`).
- **Networking (`src/api/`)** — `client.ts` (`apiClient` + `queryClient`), `endpoints.ts`, `services/*`, `queries/*` / `mutations/*`, `mocks/` (axios-adapter fixtures when `EXPO_PUBLIC_API_MODE=mock`) (→ `rules/architecture/auth-flow.md`, `rules/architecture/device-identity-and-request-headers.md`).
- **Real-time (`src/realtime/`)** — STOMP client, events, pure mid-roll core (→ `rules/architecture/real-time.md`).
- **Player (`components/Media/`)** — `VideoPlayer` / `LivePlayer` / `PlayerControls`, radio engine `RadioAudioHost`. `expo-video` must stay `>= 57.0.2` and `expo-modules-core` `>= 57.0.3` — never relax (→ `rules/architecture/player.md`, `rules/architecture/radio-audio.md`).
- **Theme (`src/theme/`)**, **Responsive (`src/responsive/`)**, **TV focus (`src/tv/`)** — → `rules/architecture/theme-flow.md`, `rules/architecture/responsive-layout-and-sizing.md`, `rules/architecture/android-tv-stb.md`.
- **Register form data (`constants/cities.*`)** — generated by `npm run cities:build`; its licences require the Settings credit (→ `rules/architecture/auth-flow.md`).
- **Specs** — `docs/API.md` (backend contract, source of truth for `src/api/`), `docs/REALTIME_SOCKET.md` (STOMP contract).

## Doc sync (mandatory)

Every change that affects documented behavior must update the docs in the same turn — never leave them stale:

- **Cross-cutting flow changed** → update its topic in `rules/architecture/` (current state: how it works / why / known gaps). A new flow gets a new topic with `paths:` naming its files plus a line in the `rules/ARCHITECTURE.md` index. Topics are current state, not history — git is the changelog.
- **Convention or pattern changed** → `rules/STYLE_GUIDE.md` (project-wide) or its scoped file in `rules/style/`.
- **Feature added/removed, scope or stack changed** → this file.
- **SDK / dependency upgrade** → a new entry in `docs/upgrades/UPGRADES.md` (append-only ledger).
- **Plan step done/superseded** → `.claude/docs/plan.md` (and mark stale references in older entries).

## Working preferences (Anxhelo)

- Direct, sharp, precise. No fluff. Best solution first, root cause first.
- Production-quality TS/JS, scalable. Simplified, reusable.
- Security-minded (data flow, API boundaries, key handling).
- Ask one clear question if context is missing. Don't delete files without approval.

## On every session start

This file, `rules/STANDARDS.md`, `rules/STYLE_GUIDE.md` and the `rules/ARCHITECTURE.md` index load
every session. Topic files (`rules/architecture/`) and scoped conventions (`rules/style/`) load only
when you read or edit a file their `paths:` match — so before answering how a flow works, or changing
one, open its topic from the index.

Read `.claude/docs/plan.md` to find the next step to execute — the single source of truth for what's
done vs. remaining.

## Output rule

All deliverable files go inside this repo (`RTSH-OTT/`). Source spec lives in `../assets/`.

## Mandatory product features (spec-required)

Spec-mandated for v1 — do not treat as optional:

- **T&C acceptance** — once, at registration (`acceptTerms` → `termsAccepted`); no re-prompt on login.
- **Guest mode (iOS only)** — live TV, radio, guide and search without an account; an account is required only for catch-up, 18+ programmes, enabling the parental PIN and account screens. Fixes App Store **5.1.1(v)**; Android keeps its login wall. → `rules/architecture/auth-flow.md → Guest session`
- **Geoblocking** — channel-level + per-programme. → `rules/architecture/real-time.md`
- **Cellular-data gate** — confirm before playback over cellular. → `rules/architecture/network-state.md`
- ~~**Mosaic view**~~ — cut from v1 (2026-06-11, plan 22.14f).
- **PiP for TV, lock-screen playback for radio only**; **quality picker** per session. → `rules/architecture/player.md`
- **Ads** — `APP_OPEN`, `CHANNEL_CHANGE` preroll, `MID_ROLL`, one at a time app-wide. → `rules/architecture/real-time.md`
- **Channel / station switching in place** — swipe or remote CH±. → `rules/architecture/channel-switching.md`
- **Parental control** — 4–6 digit device-level PIN, client-only. → `rules/architecture/parental-control.md`
- **Change password / delete account.** → `rules/architecture/auth-flow.md` (5a, 5b)
- **Background audio for radio** — lock-screen controls + Android foreground service. → `rules/architecture/radio-audio.md`
- **Analytics** — first-party telemetry, **currently DISABLED**. → `rules/architecture/analytics-and-telemetry.md`

## Out of scope for v1

- Cast (Chromecast / AirPlay) — **fully removed 2026-07-31**, implicit AirPlay off too; blocked on signed playback URLs. → `rules/architecture/player.md`
- Server-side ad insertion (SSAI) — client-side overlay only in v1.
- Widevine / FairPlay / PlayReady — AES-128 HLS only (spec confirms).
