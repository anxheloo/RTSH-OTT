---
paths:
  - "src/components/Media/VideoPlayer.tsx"
  - "src/components/Media/LivePlayer.tsx"
  - "src/components/Media/PlayerControls.tsx"
  - "src/utils/resolveStreamSource.ts"
  - "src/constants/player.ts"
  - "package.json"
---

# Player

- `components/Media/VideoPlayer.tsx` — base `expo-video` wrapper. The source's `contentType` is **inferred from the URL** via `inferContentType()` (`utils/resolveStreamSource.ts`): recognized streaming extensions map to their protocol (`.m3u8`→`hls`, `.mpd`→`dash`, `.ism(l)`→`smoothStreaming`), other media extensions → `auto`, and **no extension → `hls`** (our backend serves HLS from an extensionless `/playback/manifest?u=…` endpoint). Without this expo-video defaults to `auto` and the manifest fails to load. Live streams get no `timeUpdate` ticks (`isLive` → `timeUpdateEventInterval = 0`): nothing reads a live position, and each tick is a synchronous main-thread XPC on iOS (`AVPlayerItem.currentDate()`) that hung the app (REACT-NATIVE-RTSH-OTT-2E). A `replaceAsync` that resolves after unmount, or after a newer swap, never calls `play()` (-2H).
- `components/Media/LivePlayer.tsx` — HLS player for **both** live and recorded (catch-up); AES-128 + DVR. Takes an ad-driven `paused` prop that pauses the stream for a mid-roll without a remount; a live stream best-effort re-syncs to the edge on resume.
- `components/Media/RadioAudioHost.tsx` — the single `expo-audio` engine, mounted above the router in `(app)/_layout`. Rationale + flow: `architecture/radio-audio.md`.
- `components/Media/RadioPlayer.tsx` — presentational now-playing core; no playback logic. `RadioMiniPlayer` (Layout/) is the docked strip.
- `components/Media/RadioSeekBar.tsx` — radio **catch-up** scrubber, shown only while a recording plays (radio programmes are catch-up-able like TV). Reads/seeks the engine via `useRadioAudioPlayer()` context; live radio is never seekable.
- `components/Media/PlayerControls.tsx` — overlay (auto-hide, fullscreen, PIP, audio tracks). Draggable scrubber, active only when seekable (recorded/catch-up — **live is deliberately non-seekable**). Resuming a paused **live** stream first catches up by exactly the paused time (`currentOffsetFromLive` at pause vs now): the live window is only ~24s (4 × 6s segments), so resuming in place after a longer pause fails with Media3's `BehindLiveWindowException` ("Source error") on every platform. Requires `GestureHandlerRootView` at the app root.

**`expo-video` must stay `>= 57.0.2` — never relax this floor.** expo-modules-core 57 changed the SharedObject lifecycle so `release()` no longer deallocates the native object immediately (it lives until JS GC). expo-video 57.0.0/57.0.1 still tore the player down in `deinit`, so on iOS the `AVPlayer` **kept decoding and holding the audio session after the JS component unmounted** — closing the channel screen or switching to a catch-up programme left the previous stream audible, two at once (expo/expo#47569). 57.0.2 moves teardown into `sharedObjectWillRelease()` (expo/expo#47828). This is a **native** fix: it ships only in a new build, never via `eas update`.

**Paired floor: `expo-modules-core` must stay `>= 57.0.3` (i.e. `expo >= 57.0.5`) — verified 2026-07-29.** Expo ships **precompiled iOS xcframeworks** (`EXPO_USE_PRECOMPILED_MODULES`, default on), and a module's prebuilt binary is rebuilt against the **current** core **without bumping its own npm version**. `expo-modules-core` 57.0.3 dropped the `appContext:` argument from `AnyModule._decorateModule`, and `expo-video@57.0.2`'s published prebuilt calls the new 2-param form — so pairing it with core `<= 57.0.2` produces a **dyld `Symbol not found` `SIGABRT` at launch, before any JS runs**. Diagnose in seconds without rebuilding: `nm -gU <App>.app/Frameworks/ExpoModulesCore.framework/ExpoModulesCore | grep decorate | xcrun swift-demangle -compact` vs `nm -u .../ExpoVideo.framework/ExpoVideo | grep decorate | …` — mismatched signatures are this bug. Fix is to bump `expo`, **never** to downgrade `expo-video` (already latest; only its binary moved). Escape hatches if a future pairing breaks again: `package.json` → `expo.autolinking.apple.buildFromSource: ["ExpoVideo"]`, or `expo-build-properties` → `ios.usePrecompiledModules: false`.

Stream `User-Agent` stamping + the AES-128 header-forwarding open risk: `architecture/device-identity-and-request-headers.md`.


## Casting (out of scope for v1)

Cast (Chromecast / AirPlay) — **fully removed 2026-07-31**. There is no cast UI anywhere, and the *implicit* AirPlay path is off too: `expo-video` defaults `allowsExternalPlayback` to **`true`**, so iOS was silently offering AirPlay from Control Center on every stream; `VideoPlayer.tsx` now sets it `false` on iOS. **Blocker to re-enabling either platform:** the receiver device fetches the manifest, segments and the AES-128 key itself, and custom headers do **not** cross the AirPlay/Cast session boundary — so `getStreamHeaders()`'s `User-Agent: RTSHTani-*` (`utils/device.ts`, the origin's gate) never arrives and the request is rejected. Playback auth must move to a **signed/expiring URL** (Apple's documented pattern: auth as a query param on the multivariant playlist — the same direction as the 15.2 geo contract) before casting is worth scoping. Once it does, iOS AirPlay is cheap (`VideoAirPlayButton` ships in expo-video already); Chromecast is not — `react-native-google-cast` has had **no code release since 2025-07-26** (4.9.1, "New Architecture **compatibility mode**", RN ≥ 0.76) and is unverified against our RN 0.86 New-Arch-only runtime, and the default Cast receiver does **not** support AES-128, so it would need a custom receiver plus a key-server CORS allowlist.

## Background playback and quality picker

- **PIP for TV, lock-screen playback for radio only** — TV channels keep playing in the background through PiP alone (always-on, no user setting); `LivePlayer` deliberately does NOT enable expo-video's `staysActiveInBackground` / `showNowPlayingNotification` (product decision 2026-09-21 — on Android they start expo-video's media foreground service, whose lifecycle races crashed builds 17/20). Only radio (`expo-audio`) plays on the lock screen with now-playing controls. PiP entitlements come from the `expo-video` config plugin (native rebuild required on change).
- **Quality picker** — manual ABR selection in the player options sheet (per-session, player-only; no persisted default in Settings). Resets to Auto on each channel open.
