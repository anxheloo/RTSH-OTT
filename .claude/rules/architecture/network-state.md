---
paths:
  - "src/hooks/useNetworkMonitor.ts"
  - "src/hooks/useCellularGate.ts"
  - "src/store/createNetworkSlice.ts"
  - "src/api/client.ts"
  - "src/api/focusManager.ts"
  - "src/components/ModalWrapper.tsx"
  - "src/components/empty/**"
  - "src/utils/navigation.ts"
  - "src/app/**/channel/**"
  - "src/app/**/radio/**"
---

# Network state

## How it works today (post 5.5a + 5.8)

`src/hooks/useNetworkReconnect.ts`:

- **`useNetworkMonitor`** — one NetInfo listener for the whole app, mounted once at root in `RootLayoutNav` (RTSH `useNetworkMonitor` pattern). On each change it:
  - bridges NetInfo into TanStack `onlineManager` (queries pause offline, refetch on reconnect),
  - mirrors connectivity into the store via `updateNetworkSlice({ isOnline, connectionType })` — components read `useAppStore((s) => s.isOnline)`; the cellular gate reads `connectionType`,
  - opens the `noInternet` modal on disconnect and closes it on reconnect.
- **Online = `isConnected && (isInternetReachable ?? true)`** — captive-portal safe.
- **Modal copy owned by `ModalWrapper`** (i18n), so the listener passes no text. Auto-close on reconnect is an improvement over RTSH (which leaves the modal up).
- **Store default `isOnline: true`** (optimistic) — avoids a false "offline" flash before NetInfo's first report.
- **Why not a singleton + `useSyncExternalStore`?** Earlier this was a module-level singleton so it could be mounted by many components without leaking. But it's mounted once at root and the Zustand store is already a shared subscribable source — so `isOnline` lives in `NetworkSlice` and the singleton machinery was removed as over-engineering (2026-06-05).

## Why these choices

- **Mounted once at root, not per-component.** A single NetInfo subscription + one `onlineManager` listener, owned by `RootLayoutNav`. This eliminates the leak from the original `useEffect`-per-mount pattern (CRITICAL P5#4 from audit) without needing module-level singleton machinery — root is the only mount, so there is nothing to deduplicate.
- **Store as the shared source.** Connectivity lives in `NetworkSlice`; any component reads it via `useAppStore((s) => s.isOnline)`. Zustand is already a concurrent-safe subscribable store, so a hand-rolled singleton + `useSyncExternalStore` would only duplicate what the store provides (removed 2026-06-05).

## Known gaps

- No offline **banner** UI (the unused `OfflineBanner` component exists). Currently offline is surfaced via the `noInternet` modal triggered from the listener; a persistent banner is optional/future.
- Data screens now distinguish list states (2026-06-17): `ListEmptyComponent` is a three-way pick — skeleton while `isLoading`, `ErrorState` (with Retry → `refetch`) on a failed load, else the domain `Empty*State` for a genuine `[]`. Wired on Home (TV + radio) and Guide; built on the reusable `ListStateView` (`components/empty`). The live screen no longer spins forever offline (loader gated on `isOnline`). (Catch-up has no screen yet; Search reuses already-loaded data so it has no separate load-error surface.)
- **Unhandled query/mutation errors are no longer silent (2026-06-17).** The `queryClient` (`client.ts`) carries a `QueryCache`/`MutationCache` `onError` that opens the `apiError` modal for any **unexpected** failure (5xx, network, 404…) — a query offers Retry (`query.fetch()`), a mutation dismisses. It deliberately stays silent on 401/403/426 (the interceptor owns refresh-or-logout + force-update). Forms render their own errors via a **hybrid** opt-out — `meta: INLINE_CLIENT_ERROR` (auth forms, change-password, register/reset wizards, reworked 2026-06-17): the modal is suppressed only for **client (4xx)** failures the form shows inline (`isClientError(status)` in `client.ts`), but **unexpected** failures (5xx, network, timeout) still fire the modal. The inline side mirrors that boundary — `authErrorMessage` (`features/auth/errors.ts`) returns `undefined` for 5xx/network — so a request never shows both an inline message and a modal. This is the v5-idiomatic replacement for per-`useQuery` `onError` (removed in v5), chosen over a per-hook `useEffect(error→modal)` to avoid boilerplate and the banned "react to query state in useEffect" smell.
- ~~No cellular-data gate UI~~ — **built 2026-07-31.** `useCellularGate()` mounts at the top of both player routes (`channel/[id]`, `radio/[id]`) and returns `{ pending }`, which those routes gate playback on: the channel screen holds the player skeleton until playback has first started (`holdForCellular || mediaPending || adPending`, so on entry `LivePlayer` never mounts and no stream is fetched); once playback has started, a later `pending` only **pauses** the mounted player (`paused={… || cellular.pending}`) instead of unmounting it (2026-09-21) — tearing a player down and rebuilding it raced expo-video's Android playback service (REACT-NATIVE-RTSH-OTT-B) and dropped the viewer out of fullscreen, and the radio screen skips its `setRadioChannel` selection (`RadioAudioHost` is store-driven, so nothing reaches the speakers). `pending` is **derived, not stored** — exactly `connectionType === cellular && !cellularPlaybackAllowed && !cellularAcknowledged`. Continue sets the session-only `cellularAcknowledged`, which clears `pending` in the same render and releases the player; Cancel `router.back()`s. Because `pending` is reactive rather than mount-once, a mid-session Wi-Fi → cellular switch re-asks and re-holds playback — the behavior `createNetworkSlice` always documented as the intent but the old mount-only effect never delivered. The effect also clears its own modal on unmount: a route-owned `confirmation` must never outlive its route. Locked by `hooks/__tests__/useCellularGate.test.tsx`.

- **Both player routes are plain card pushes, NOT a native presentation — load-bearing, do not "restore" it.** `ModalWrapper` lives at the app root, so its RN `<Modal>` presents from the root view controller. `fullScreenModal` made the player a _second_ natively-presented VC from that same controller, and on iOS the two race: ANY global modal opened while the player is on screen (the cellular gate, `noInternet` on a mid-stream drop, `apiError`) flashed ~1s, was orphaned when the presentation settled, and — since nothing cleared `currentModal` — stranded the store at `'confirmation'`: an invisible full-screen modal window swallowing every touch app-wide once the user went back to the tabs. The card push keeps the player in the root controller's own stack, so global modals present cleanly over it. **Device-verified 2026-09-22** (iPhone 12 Pro Max, iOS 26.4, local Release preview build, live backend): automatic PiP on swipe-home plays video + audio and returns to the app on tap, with no background-playback service enabled; `noInternet` and the cellular gate both present in fullscreen landscape without crashing (REACT-NATIVE-RTSH-OTT-12), and OK resumes the paused player.

  **RETESTED 2026-08-07 — react-native-screens 4.26 / iOS 26.1, live backend: STILL BROKEN.** This is not stale caution carried forward from an old SDK. `channel/[id]` was temporarily switched to `formSheet` (`detents: [1]`) with a timer raising `noInternet` 3s after mount. The **sheet itself rendered correctly** — inset, grabber, rounded corners, stream playing — but the modal **never appeared**, and returning via the back button **froze the app to touch**. Re-probe with that exact recipe at the next SDK upgrade rather than assuming it either persists or is fixed. Separately, the probe proved `formSheet` (and `fitToContents`) work fine on iOS at 4.26 — the SDK-54-era belief that iOS formSheet is broken is version-specific and does **not** apply here, so the four `(modals)/` sheets need no platform conditional.

  **Presentation options live in `utils/navigation.ts`, not inline:** `getPlayerScreenOptions()` (card push, `slide_from_bottom`, `gestureEnabled: true` + `gestureDirection: 'vertical'`) and `getModalScreenOptions()` (formSheet). The vertical gesture — added 2026-08-07, device-verified — restores swipe-down-to-dismiss on **both** `channel/[id]` and `radio/[id]` without a native VC; ~~`fullScreenGestureEnabled` is deliberately left off so the gesture starts at the screen edge~~ — **corrected 2026-10-19, read from react-native-screens' source:** `gestureDirection: 'vertical'` FORCES `fullScreenSwipeEnabled: true` + `customAnimationOnSwipe: true` (`react-native-screens/src/types.tsx`), so the dismiss pan is full-screen and begins on movement in ANY direction — leaving the flag off changes nothing. It coexists with the EPG list through rn-screens' scroll-view simultaneity rules, and it races horizontal gestures — see → Channel switching. `radio/[id]` had **no `Stack.Screen` entry at all** until then, so it slid in from the right like a settings page while `channel/[id]` slid up — the two player screens now match. **The accepted cost is rounded top corners**, which are a native-sheet affordance and unreachable on a card push; lifting that means moving `ModalWrapper` off RN `<Modal>` onto route-based `transparentModal` screens (not scoped).

---
