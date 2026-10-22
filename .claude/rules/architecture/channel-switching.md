---
paths:
  - "src/components/Media/ChannelSwipeArea.tsx"
  - "src/tv/useTVChannelKeys.ts"
  - "src/utils/channelOrder.ts"
  - "src/app/**/channel/**"
  - "src/app/**/radio/**"
---

# Channel switching (swipe + remote CH±)

## How it works today (built 2026-10-19)

- **One screen, one player, the channel swapped in place.** `channel/[id]` and `radio/[id]` keep the shown channel in **local state** (`activeId`, seeded once from the route param) and never call `router.setParams` — changing a route param **remounts the screen** (Expo Router docs, *URL parameters*), which would rebuild the native player, restart the stream and drop fullscreen on every switch. Back still goes to Home (nothing is pushed). The route param keeps the channel the screen was opened with; nothing else reads it.
- **Order = the cached list Home shows** (`useChannelsQuery('TV' | 'RADIO')`). Neighbours are derived by `getAdjacentId` (`utils/channelOrder.ts`, unit-tested) and **never stored** — a stored index drifts when the list refetches. It **wraps** at both ends (TV-remote convention); radio's prev/next buttons now wrap too.
- **`ChannelSwipeArea`** (`components/Media/`) wraps the channel screen's video box and radio's now-playing pane. It owns no playback — it only calls `onChange(id)`. Touch: a Gesture Handler `Pan` (`activeOffsetX ±10`, `failOffsetY ±10`) slides the neighbour's "zap card" (logo + name) in with the finger; past 25% of the width or a >800px/s flick it commits, otherwise springs back. The real video never moves — no second player, stream or watch segment. After a commit a static landing card covers the box while the new stream starts, then fades. TV: no gesture; `useTVChannelKeys` (`src/tv/`) maps the remote's `channelUp`/`channelDown` and media `next`/`previous` (react-native-tvos `KEYCODE_CHANNEL_UP/DOWN`, `KEYCODE_MEDIA_NEXT/PREVIOUS`; key **release** only). Each press moves a pending target and shows its card; the switch commits after 500ms without another press, so mashing CH+ loads one channel, not every one passed. Disabled while the PIN modal or an ad is on screen (an ad must not be skippable by zapping).
- **The switch resets everything that belonged to the previous channel in ONE batch** (`switchChannel`): the selected recording, ad-done flag, guide drawer, selected day, open row, and the list's first-center flag. Fullscreen deliberately survives.
- **The stream waits for every gating input** (`inputsPending`): the decision, whether a preroll exists (`useAdsQuery` now exposes `isLoading`), the preroll itself, and — when live — today's EPG, which the 18+ (`useParentalGuard`) and per-programme geo (`useLiveProgramBlock`) gates read. This closed a latent window that already existed on first open: a decision resolving before ads/EPG started the stream, so a late preroll cut it, or a restricted programme played for a moment before its gate knew. Before the first start a hold shows the skeleton; after it, a hold keeps the **same** player mounted with no source (`replaceAsync(null)` then the new URL) — device-verified on iOS 2026-10-19: two channel switches, `VideoPlayer.release` called **0** times.
- **Neighbours are warmed lazily** — the playback decision + today's EPG, on touch-down or the first remote press (`onIntent`), not on every open, so users who never swipe add no calls.

## Known gaps

- **iOS: a fast flick can lose to the player route's dismiss pan.** `gestureDirection: 'vertical'` installs a full-screen `RNSPanGestureRecognizer` that begins on movement in any direction and cancels this pan when it recognizes first (`gestureRecognizerShouldBegin` in `RNSScreenStack.mm` has no direction check). Device-verified: with the route gesture disabled every flick committed; with it on, the 20px threshold lost most flicks and the 10px threshold wins most but not all. Android has no swipe-dismiss, so it is unaffected. A deterministic fix needs either a native patch (reject the vertical pan when horizontal velocity dominates) or moving swipe-down-to-dismiss into this same RNGH pan.
- **Screen readers have no next/previous action on the channel screen.** Actions on the swipe container would hide the player controls from VoiceOver/TalkBack. Radio keeps its prev/next buttons.
- **Google TV remotes have no CH± keys** — there the guide drawer remains the way to change channel; D-pad up/down is deliberately not mapped (it moves focus).
- **TV zap device-verified 2026-10-19** on `RTSH_TV_API34` (review account from `store/store.config.json`): all four keys reach JS as release events; CH+ switches channel; two quick CH− presses commit ONCE, on the channel two steps away. **Emulator-only noise, not this feature:** RTSH 2HD fails there with ExoPlayer `BehindLiveWindowException` on a freshly opened player too (the emulator decodes slower than the stream's live window); it plays on iOS. A user **pause** no longer reaches it: resume catches up by the paused time (`PlayerControls`, 2026-10-20; the stream keeps only 4 × 6s segments, and a 75s pause reproduced it every time before the fix). The app still has no auto-recovery for that exception (Media3's documented handling is `seekToDefaultPosition()` + `prepare()`) — a separate item if it shows up in Sentry on real boxes.

---
