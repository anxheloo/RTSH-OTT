# ARCHITECTURE.md — RTSH-OTT

The architecture index. Each cross-cutting flow — its current state, rationale and known gaps — lives in
one topic file under `architecture/`. A topic loads on its own when you read or edit a file its `paths:`
names; a question opens no file, so before answering how a flow works, or changing one, open its topic
from this list.

This complements (does not duplicate) CLAUDE.md: CLAUDE.md says _what the project is and where files
live_; the topics say _how flows behave today and why_. Upgrade history is a record, not a flow: it lives
in `docs/upgrades/UPGRADES.md`.

## Topics

- `architecture/auth-flow.md` — token vault, login/refresh/logout, guest session, remember-me, register form data
- `architecture/theme-flow.md` — store-driven light/dark/system theme and its tokens
- `architecture/boot-splash-gate.md` — native splash, boot gates, silent OTA apply, store-update notice
- `architecture/ota-releases.md` — runbook: publishing JS fixes and store notices, update delivery quota
- `architecture/network-state.md` — NetInfo monitor, global error modal, cellular gate, why player routes are card pushes
- `architecture/persistence-boundaries.md` — what lives in keychain vs MMKV vs memory vs query cache
- `architecture/player.md` — expo-video wrappers, version floors, PiP and quality picker, why casting is out
- `architecture/radio-audio.md` — the single expo-audio engine, lock-screen sync, radio catch-up
- `architecture/channel-switching.md` — swipe and remote CH± switching in place
- `architecture/parental-control.md` — device-level PIN gate for adult programmes
- `architecture/device-identity-and-request-headers.md` — device registration at login, request and stream headers
- `architecture/responsive-layout-and-sizing.md` — device classes, grid columns, token scaling, orientation policy
- `architecture/android-tv-stb.md` — single Android artifact, TV focus, TV known gaps and ANRs
- `architecture/analytics-and-telemetry.md` — first-party analytics module (currently disabled)
- `architecture/real-time.md` — STOMP socket, presence, mid-roll ads, geo-blocking
- `architecture/observability.md` — Sentry init, PII scrubbing, source maps for builds and OTA, secrets
- `architecture/store-assets.md` — store listing art manifest and its gaps
- `architecture/release-and-store-submission.md` — App Store listing as code, age rating, App Privacy, Play submit key
