# RTSH TANI

OTT streaming app for Radio Televizioni Shqiptar. Live TV (19 channels) + Radio (13 channels) + EPG + Catch-up. iOS + Android.

## Stack

Expo SDK 56 · React Native 0.85.3 · React 19.2 · TypeScript strict · Expo Router · Zustand · TanStack Query · MMKV · expo-video · expo-audio

## Prerequisites

- Node 20 LTS
- Watchman
- Xcode 16+ (iOS)
- Android Studio + API 34 (Android)
- JDK 17
- CocoaPods

## Setup

```bash
npm install
cp .env.example .env   # fill in values
npx expo run:android   # local Android build + launch
npx expo run:ios       # local iOS build + launch (simulator)
```

## Environment variables

| Variable | Required | Values | Description |
|----------|----------|--------|-------------|
| `EXPO_PUBLIC_API_MODE` | ✅ | `mock` · `dev` · `staging` · `prod` | API mode — `mock` serves the custom axios-adapter fixtures |

> The backend base URL is **hardcoded** in `src/api/client.ts` (bundled identically for local / EAS / OTA — no build-time `.env` dependency); change it there and ship an OTA. `EXPO_PUBLIC_API_MODE` is the only env var the app reads today.

Planned private vars (EAS dashboard only, not yet wired):

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry project DSN — **Sentry is not yet installed** (tracked) |

MMKV is intentionally **unencrypted** (low-sensitivity data; real secrets stay in the keychain — see `rules/ARCHITECTURE.md → Persistence boundaries`), so there is no `MMKV_ENCRYPTION_KEY`.

## Commands

```bash
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)

# EAS (deferred until feature-complete)
eas build --profile simulator-ios --platform ios
eas build --profile preview --platform all
eas build --profile production --platform all
eas update --channel production --message "..."
```

## App variants

Set `APP_VARIANT` env var to switch bundle ID + display name:

| Variant | Bundle ID | Name |
|---------|-----------|------|
| `production` | `al.rtsh.tani` | RTSH TANI |
| `preview` | `al.rtsh.tani.preview` | RTSH TANI (Preview) |
| `development` | `al.rtsh.tani.dev` | RTSH TANI (Dev) |

## Conventions

See `.claude/rules/STYLE_GUIDE.md` for coding conventions.
