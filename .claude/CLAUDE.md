# CLAUDE.md

@../AGENTS.md

Guidance for Claude Code when working in this repo.

## Project

RTSH TANI — OTT streaming app for Radio Televizioni Shqiptar. Live TV (19 channels) + Radio (13 channels) + EPG + Catch-up. **Mobile-first** (iOS + Android), then **tablet/iPad + TV** as an end-phase large-screen pass (same design, display adjustments + TV focus/D-pad nav) once mobile is complete and approved — see plan.md **22.18**.

## Stack

- Expo SDK 56 · React Native 0.85.3 · React 19.2 · TypeScript strict · New Architecture only
- Expo Router v7 (Native Tabs, typed routes)
- Single Zustand store composed from slices · MMKV persist · expo-secure-store for tokens
- TanStack Query v5 (server state) · axios (HTTP client)
- expo-video (live + VOD) · expo-audio (radio, background + lock-screen)
- @shopify/flash-list · react-native-reanimated v4 · react-native-gesture-handler · react-native-keyboard-controller
- react-hook-form + zod (forms + validation)
- i18next + expo-localization (sq default, en fallback)
- @sentry/react-native
- EAS Build + EAS Update

## Commands

```bash
npm install
npx expo start --dev-client          # dev (custom dev client required)
npx expo run:ios                     # local dev build iOS
npx expo run:android                 # local dev build Android
npm run lint                         # ESLint

# EAS
eas build --profile development --platform ios
eas build --profile preview --platform all     # internal distribution
eas build --profile production --platform all  # store-ready
eas update --channel production --message "..."  # JS-only hotfix
```

**Dev client mandatory** (Expo Go can't run MMKV, expo-video config, biometrics, Sentry native).

## Environment

`.env` at root:
- `EXPO_PUBLIC_API_BASE_URL` — backend base URL
- `EXPO_PUBLIC_API_MODE` — `mock | dev | staging | prod`
- `EXPO_PUBLIC_ENV` — environment label

Private (EAS dashboard only): `SENTRY_DSN`, `MMKV_ENCRYPTION_KEY`.

## App variants

`app.config.ts` reads `APP_VARIANT` (`development | preview | production`) → different bundle IDs:
- prod: `al.rtsh.tani`
- preview: `al.rtsh.tani.preview`
- dev: `al.rtsh.tani.dev`

It also reads `APP_PLATFORM` (optional; `androidstb`) → `extra.devicePlatform`, the build-time platform override for operator STB builds (runtime can't distinguish an STB from retail Android TV). Consumed by `getDevicePlatform()` in `utils/device.ts`.

## Architecture

### Navigation (`src/app/`)

Expo Router file-based. Root `_layout.tsx` uses `Stack.Protected` guards:
- No token → `(auth)/` (login → register → forgot)
- Token → `(app)/(tabs)/` (live, epg, catchup, radio, profile)
- Player routes (`player/[id]`, `channel/[id]`, `program/[id]`) are full-screen modals at root.

### State (`src/store/`)

Single `useAppStore` composed from slices (see `src/store/`):
- `UserSlice` — auth state, user, access token (access in store, refresh in keychain)
- `SettingsSlice` — locale, theme mode, haptics, autoplay, data-saver, cellular/background-video flags, notifications flag
- `ThemeSlice` — mode + colors (light/dark objects, swapped on toggle)
- `ModalSlice` — single active modal (`currentModal` + `modalData`, RTSH/SOLITAR style; apiError, noInternet, notify, confirmation, forceUpdate). One modal at a time; `updateModalSlice({ currentModal: null })` to close (`forceUpdate` is blocking and never closes).
- `NetworkSlice` — runtime connectivity (`isOnline`, `connectionType`), written by `useNetworkMonitor`; not persisted
- `PlayerSlice` — current playback state (channelId, position, isPlaying, isFullscreen)
- `ParentalSlice` — **device-level** parental config (`parentalEnabled` + `parentalPin`, client-only, MMKV-persisted) + failed-attempt/lockout UX

Planned (not yet implemented): `ChannelsSlice` (favorites, recently watched) and `EpgSlice` (reminders) — favorites/recently-watched/reminders are not in the store today.

Persist via MMKV (`zustandStorage`). `partialize` controls what persists. `onRehydrateStorage` applies side effects (re-apply theme).

### Storage layers

| Data | Where |
|------|-------|
| Refresh token | Keychain (`expo-secure-store`) |
| User, settings, theme, favorites, reminders, **parental config (`parentalEnabled` + `parentalPin`)** | MMKV (Zustand persist). Parental PIN is **device-level, client-only** (never sent to/read from backend, not on the user object); it's content gating, not a credential — see `rules/ARCHITECTURE.md → Parental control` |
| Server data (channels, EPG, catch-up, programs) | TanStack Query cache (selective MMKV persist for slow-changing) |
| Resume positions (per-program) | MMKV (separate key) |

### Networking (`src/api/`)

- `client.ts` — single `apiClient` (axios) + `queryClient`. Request interceptor injects token + `Accept-Language` from store. Response interceptor refreshes on 401 (single-flight lives inside `refreshAccessToken`) — it never logs out itself; only a confirmed 401/403 inside `refreshAccessToken` wipes the session. On a cold boot the access token is null, so the first authed request 401s and is refreshed-and-retried here (no proactive boot refresh). 426 → blocking `forceUpdate` modal. Static `X-Device-Id` / `X-Device-Platform` / `X-App-Version` headers are stamped on app entry by `useDeviceIdentity` (mounted in `(app)/_layout.tsx`), which also fire-and-forgets the `PUT /users/me/device` registration upsert on every app open (see `rules/ARCHITECTURE.md` → Device identity; contract in `docs/API.md`).
- `endpoints.ts` — string constants for routes (`AUTH_ROUTES`, `CHANNELS_ROUTES`, etc).
- `services/*.ts` — domain-grouped axios calls (`auth.ts`, `channels.ts`, `epg.ts`, `catchup.ts`, `users.ts`, `config.ts`, `devices.ts`). `streams.ts` removed — stream URLs are now embedded in the `PlaybackDecisionDTO` returned by `GET /channels/{id}` (no separate streams service).
- `queries/*.ts` — TanStack Query hooks wrapping services.
- `mutations/*.ts` — TanStack Mutation hooks.
- `mocks/` — **custom axios-adapter mock** (not MSW) + fixtures, active when `EXPO_PUBLIC_API_MODE=mock`. `handlers.ts` is an array of `{ method, test(url), delay?, respond(config) }`; `server.ts` swaps it into the axios adapter.

### Player

- `components/Media/VideoPlayer.tsx` — base `expo-video` wrapper, our controls.
- `components/Media/LivePlayer.tsx` — HLS + AES-128 + DVR (extends VideoPlayer).
- `components/Media/VodPlayer.tsx` — catch-up with custom seek bar, resume positions.
- `components/Media/RadioAudioHost.tsx` — the single `expo-audio` engine, mounted above the router in `(app)/_layout`. Rationale + flow: `rules/ARCHITECTURE.md` → Radio audio.
- `components/Media/RadioPlayer.tsx` — presentational now-playing core (art + `Equalizer` + transport); no playback logic. `RadioMiniPlayer` (Layout/) is the docked strip.
- `components/Media/PlayerControls.tsx` — overlay (auto-hide, fullscreen, PIP, audio tracks).

**Open risk:** `expo-video` `VideoSource.headers` may not forward to AES-128 key requests. Validate on a real stream early; fallback = `react-native-video`.

### Theme

`ThemeSlice` holds `mode` + `colors` (full object). Components read with `useAppStore((s) => s.colors)`. Toggle swaps `colors` reference. No separate ThemeProvider, no Unistyles.

Tokens live in `src/theme/`:
- `colors.ts` — `lightTheme` + `darkTheme` (`ThemeColors` interface)
- `fonts.ts` — `Fonts`, `FONTSIZE`, `FONTWEIGHT`
- `borders.ts` — `BORDERRADIUS`
- `spacing.ts` — `SPACING` scale (4px base)

`FONTSIZE` / `SPACING` (and the `ReusableText` / `ReusableBtn` size tables) pass through `scaled()` from `@/responsive`, which applies a per-device-class step (phone 1 / tablet 1.15 / TV 1.3) — phone is unchanged. See **Responsive** below.

### Responsive (`src/responsive/`)

Portable, self-contained module (`react`+`react-native` only) for all device-size decisions, split into layout (reactive) + sizing (static):
- **Layout** — `useResponsiveGrid()` → grid `numColumns` by device class + orientation (phone 2/2, tablet 3/4, TV 4/4); `useResponsive()` → `{ deviceClass, isLandscape }`. Classifier is shortest-side (`sw600dp` standard), so phone-landscape ≠ tablet-portrait.
- **Sizing** — `scaled(n)` applies the per-class `UI_SCALE` step at the token layer only (never per-component).
- **Config** — tune `responsive/breakpoints.ts` (`GRID_COLUMNS`, `UI_SCALE`, `TABLET_MIN_SHORTEST_SIDE`).
- Distinct from `utils/device.ts → getDeviceType()` (physical device for the backend registry vs this module's live window). Down-payment on 22.18; full rationale: `rules/ARCHITECTURE.md → Responsive layout & sizing`.

### Auth flow

Access token in memory, refresh token in keychain. Boot is offline-first (keychain-first check; network only on manual-wipe recovery). 401s single-flight refresh through a bare axios instance to prevent loop deadlocks. Logout is async + atomic. No app-lock — the root `(auth)` vs `(app)` guard keys on `isAuthenticated` ONLY (never the in-memory access token, which is null on cold boot until the first request's 401-refresh lands). Parental PIN is content-level, not app-entry.

Full rationale, behavior, and known gaps: `rules/ARCHITECTURE.md` → Auth flow.

### Project flows reference

Everything cross-cutting (auth, theme, boot/splash, network state, persistence boundaries) lives in `rules/ARCHITECTURE.md`. Read it before proposing changes to those flows.

### Coding conventions

`rules/STYLE_GUIDE.md` — read before writing components.

### Specs

- `docs/API.md` — backend contract (source of truth for `src/api/`)
- `docs/PLAYER.md` — HLS + AES-128 spec + fallback decision

## Doc sync (mandatory)

Every change that affects documented behavior must update the docs in the same turn — never leave them stale:

- **Cross-cutting flow changed** (auth, theme, boot/splash, network, persistence, radio audio, parental, navigation) → update `rules/ARCHITECTURE.md` (how it works / why / known gaps).
- **Convention or pattern changed** → update `rules/STYLE_GUIDE.md`.
- **Feature added/removed, scope or stack changed** → update this file (CLAUDE.md).
- **Plan step done/superseded** → update `docs/plan.md` (and mark stale references in older entries).

## Working preferences (Anxhelo)

- Direct, sharp, precise. No fluff. Best solution first, root cause first.
- Production-quality TS/JS, scalable. Simplified, reusable.
- Security-minded (data flow, API boundaries, key handling).
- Ask one clear question if context is missing. Don't delete files without approval.

## On every session start

1. Read this file.
2. Read `docs/plan.md` to find the next step to execute.

Then load lazily, only when the task needs it (keeps non-coding turns cheap):
- `rules/ARCHITECTURE.md` — before answering "how does X work" or changing any cross-cutting flow (auth, theme, boot/splash, network, persistence, radio audio).
- `rules/STYLE_GUIDE.md` — before writing or editing components/hooks/slices.

## Output rule

All deliverable files go inside this repo (`RTSH-OTT/`). Source spec lives in `../assets/`.

## Mandatory product features (spec-required)

Beyond the architecture scaffold, these features are spec-mandated for v1 — do not treat as optional:

- **T&C acceptance** — enforced once at registration: the `acceptTerms` checkbox (zod-required) on the register form, with an inline link that opens the T&C URL in `expo-web-browser`. Acceptance is account-level (sent to backend as `termsAccepted`), not re-prompted on login — no client gate, no `tcAcceptedAt` flag (removed 2026-06-17).
- **Geoblocking overlay** — streams endpoint returns geo-error → full-screen overlay (RTSH branded). Checked on every channel open.
- **Cellular-data gate** — confirmation modal before playback over cellular when `settings.cellularPlaybackAllowed === false`.
- ~~**Mosaic view**~~ — **cut from v1 by user decision (2026-06-11, plan 22.14f)**; route + components removed.
- **PIP + iOS background video** — `expo-video` config plugin toggled by `settings.backgroundVideoAllowed`. Auto-PIP on background per user setting.
- **Ads** — three slots: launch, channel-switch (frequency-capped), time-scheduled (from `/config`). Single `AdOverlay` component (`components/Media/AdOverlay.tsx`, design `adpop`). Renders by `AdCreative.type`, always **contain** (never crops the creative): **IMAGE** via `ReusableImage` (contained, with a blurred cover copy filling the letterbox gaps behind it), **VIDEO** via the base `VideoPlayer` (autoplay, no native controls, `onPlayEnd → onComplete`; `expo-video` defaults to contain, with a static `expo-blur` `BlurView` filling the letterbox gaps behind the transparent player container). The label + skip-countdown chrome is shared across both. Component built in 22.15; slot orchestration is Phase 16. **Preroll gating** — while a channel-change ad is active the content player stays **unmounted** (a skeleton fills the 16:9 slot); `LivePlayer` autoplays the moment it mounts, so the only way to keep the live stream from starting (audio + CDN, and — with VIDEO ads — a second playing surface) behind the overlay is to not render it until `onComplete` fires. Gated in `channel/[id].tsx` via `adPending = !!channelAd && !adDone`.
- **Quality picker** — manual ABR selection in the player options sheet (per-session, player-only; no persisted default in Settings). Resets to Auto on each channel open.
- **Parental control** — 4–6 digit PIN, **device-level, client-only** (2026-06-16): the PIN lives in `ParentalSlice` (MMKV-persisted), is never sent to or read from the backend, and is not on the user object — content gating, not a credential, so verify is a local compare (no keychain/KDF). Gates adult-flagged content (channel/program `isAdult`) **only when `parentalEnabled`**. First enable creates + stores the PIN; enable/disable toggle in Settings (local PIN verify before disable) is wired; change-PIN / forgot-PIN are deferred. No backend endpoints, no cross-device sync (it's per-device by design). Rationale + flow: `rules/ARCHITECTURE.md → Parental control`.
- **Change password** — `POST /users/me/change-password` (Settings → Account screen). Rotates the refresh token → `useChangePasswordMutation` rewrites the keychain; `logoutOtherDevices` flag folds in "sign out everywhere else" (no separate endpoint).
- **Background audio for radio** — `expo-audio` lock-screen controls + Android foreground service.

## Out of scope for v1

- Cast (Chromecast / AirPlay) — stub button only, on the player options sheet (removed from Settings).
- Server-side ad insertion (SSAI) — client-side overlay only in v1.
- Widevine / FairPlay / PlayReady — AES-128 HLS only (spec confirms).
