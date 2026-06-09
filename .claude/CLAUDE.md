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

## Architecture

### Navigation (`src/app/`)

Expo Router file-based. Root `_layout.tsx` uses `Stack.Protected` guards:
- No token → `(auth)/` (login → register → forgot)
- Token → `(app)/(tabs)/` (live, epg, catchup, radio, profile)
- Player routes (`player/[id]`, `channel/[id]`, `program/[id]`) are full-screen modals at root.

### State (`src/store/`)

Single `useAppStore` composed from slices (see `src/store/`):
- `UserSlice` — auth state, user, access token (access in store, refresh in keychain)
- `SettingsSlice` — locale, theme mode, haptics, autoplay, data-saver, T&C timestamp, cellular/background-video flags
- `ThemeSlice` — mode + colors (light/dark objects, swapped on toggle)
- `ModalSlice` — single active modal (`currentModal` + `modalData`, RTSH/SOLITAR style; apiError, noInternet, notify, confirmation). One modal at a time; `updateModalSlice({ currentModal: null })` to close.
- `NetworkSlice` — runtime connectivity (`isOnline`, `connectionType`), written by `useNetworkMonitor`; not persisted
- `PlayerSlice` — current playback state (channelId, position, isPlaying, isFullscreen)
- `ParentalSlice` — PIN-set flag, failed attempts, lockout

Planned (not yet implemented): `ChannelsSlice` (favorites, recently watched) and `EpgSlice` (reminders) — favorites/recently-watched/reminders are not in the store today.

Persist via MMKV (`zustandStorage`). `partialize` controls what persists. `onRehydrateStorage` applies side effects (re-apply theme).

### Storage layers

| Data | Where |
|------|-------|
| Refresh token, parental PIN hash | Keychain (`expo-secure-store`) |
| User, settings, theme, favorites, reminders | MMKV (Zustand persist) |
| Server data (channels, EPG, catch-up, programs) | TanStack Query cache (selective MMKV persist for slow-changing) |
| Resume positions (per-program) | MMKV (separate key) |

### Networking (`src/api/`)

- `client.ts` — single `apiClient` (axios) + `queryClient`. Request interceptor injects token from store. Response interceptor refreshes on 401 (single-flight queue) or logs out on refresh-failure.
- `endpoints.ts` — string constants for routes (`AUTH_ROUTES`, `CHANNELS_ROUTES`, etc).
- `services/*.ts` — domain-grouped axios calls (`auth.ts`, `channels.ts`, `epg.ts`, `catchup.ts`, `radio.ts`, `streams.ts`, `users.ts`, `config.ts`).
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

### Auth flow

Access token in memory, refresh token in keychain. Boot is offline-first (keychain-first check; network only on manual-wipe recovery). 401s single-flight refresh through a bare axios instance to prevent loop deadlocks. Logout is async + atomic. No app-lock — the root `(auth)` vs `(app)` guard keys on `isAuthenticated` ONLY (never the in-memory access token, which is null on cold boot until the background refresh lands). Parental PIN is content-level, not app-entry.

Full rationale, behavior, and known gaps: `rules/ARCHITECTURE.md` → Auth flow.

### Project flows reference

Everything cross-cutting (auth, theme, boot/splash, network state, persistence boundaries) lives in `rules/ARCHITECTURE.md`. Read it before proposing changes to those flows.

### Coding conventions

`rules/STYLE_GUIDE.md` — read before writing components.

### Specs

- `docs/API.md` — backend contract (source of truth for `src/api/`)
- `docs/PLAYER.md` — HLS + AES-128 spec + fallback decision

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

- **T&C acceptance** — first-launch gate after register/login. Settings flag `tcAcceptedAt`.
- **Geoblocking overlay** — streams endpoint returns geo-error → full-screen overlay (RTSH branded). Checked on every channel open.
- **Cellular-data gate** — confirmation modal before playback over cellular when `settings.cellularPlaybackAllowed === false`.
- **Mosaic view** — grid of 4/6/9 channel thumbnails (live snapshots) refreshing periodically. Tap to switch channel.
- **PIP + iOS background video** — `expo-video` config plugin toggled by `settings.backgroundVideoAllowed`. Auto-PIP on background per user setting.
- **Ads** — three slots: launch, channel-switch (frequency-capped), time-scheduled (from `/config`). Single `AdOverlay` component using a second `expo-video` instance.
- **Quality picker** — manual ABR selection in player settings menu.
- **Parental control** — 4-digit PIN, hashed (SHA-256 + salt) in keychain. Gates content flagged adult by EPG metadata.
- **Background audio for radio** — `expo-audio` lock-screen controls + Android foreground service.

## Out of scope for v1

- Cast (Chromecast / AirPlay) — stub button only.
- Server-side ad insertion (SSAI) — client-side overlay only in v1.
- Widevine / FairPlay / PlayReady — AES-128 HLS only (spec confirms).
