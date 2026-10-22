---
paths:
  - "src/app/**"
  - "src/utils/navigation.ts"
  - "src/components/ModalWrapper.tsx"
  - "src/store/createModalSlice.ts"
  - "src/components/ParentalPin/**"
  - "src/components/Media/AdOverlay.tsx"
  - "src/components/Brand/TVNavButton.tsx"
---

# Navigation and modals — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## Navigation

- Expo Router v7 file-based routing. No `useNavigation` + stack manipulation.
- Auth guard via `Stack.Protected` in root `_layout.tsx` — no guard `useEffect`.
- Full-screen player routes are root-level modals: `player/[id]`, `channel/[id]`.
- **Transitions:** pushed screens use `animation: 'slide_from_right'` (stack-level `screenOptions` default in both the auth and app stacks); full-screen player modals (`channel/[id]`, `program/[id]`) use `slide_from_bottom`. Sheets animate natively via `formSheet`.
- Platform-specific presentation where it matters:

```ts
presentation: Platform.OS === 'ios' ? 'modal' : 'formSheet',
sheetAllowedDetents: [0.5, 1.0],
sheetGrabberVisible: true,
sheetCornerRadius: BORDERRADIUS.radius_20,
```

## Modals

Single-modal slice (`currentModal` + `modalData`), one modal at a time — matches RTSH + SOLITAR. All modals route through `ModalSlice` + `ModalWrapper`, callable from anywhere (React components, async flows, axios interceptors). `ModalWrapper` owns the default i18n copy per type, so alert-style triggers (e.g. `noInternet`) pass no text. Up to three buttons via `button`/`button2`/`button3` + `action`/`action2`/`action3`; `button` defaults to "OK".

**A route that opens global modals must NOT be presented as a native modal.** `ModalWrapper` lives at the app root, so its RN `<Modal>` presents from the *root* view controller. A screen with `presentation: 'fullScreenModal' | 'modal' | 'formSheet'` is a second natively-presented VC from that same controller, and on iOS the two race — the loser is orphaned: visible for ~1s, then an invisible full-screen modal window that eats every touch app-wide (nothing clears `currentModal` on unmount, so it survives navigation). This bit `channel/[id]` for real, and **retesting on react-native-screens 4.26 / iOS 26.1 (2026-08-07) confirmed it is NOT fixed upstream** — the probe (`formSheet` + a timer raising `noInternet`) rendered the sheet fine but never showed the modal, then froze the app to touch on back. Re-probe with that recipe at the next SDK upgrade; do not assume either outcome.

`presentation: 'formSheet'` sheets (`getModalScreenOptions()`) are fine _because they never raise a global modal_ — don't add one to a sheet route.

**Modal semantics on a screen that CAN raise a global modal — use `getPlayerScreenOptions()`** (`utils/navigation.ts`): a card push with `animation: 'slide_from_bottom'` + **`gestureEnabled: true` + `gestureDirection: 'vertical'`**, which gives swipe-down-to-dismiss without a native VC (iOS-only; Android keeps back). Note that `gestureDirection: 'vertical'` forces a full-screen dismiss pan regardless of `fullScreenGestureEnabled` (react-native-screens source, verified 2026-10-19) — it begins on movement in any direction, so a horizontal gesture on these screens must activate early (see `ChannelSwipeArea` and `architecture/channel-switching.md`). What this **cannot** give you is the rounded top corners: those are a native-sheet affordance (`sheetCornerRadius` on `formSheet`; UIKit's own radius on an iOS `modal`, which is where SOLITAR's iOS corners actually come from — its `sheetCornerRadius` is dead on that branch). Lifting that limit means moving `ModalWrapper` off RN `<Modal>` onto route-based `transparentModal` screens first.

**Sheet routes live in a `(modals)/` route group.** A push and a sheet are indistinguishable in a flat file tree; the group makes presentation legible from the structure alone. The group is **not** elided from typed-route hrefs — push `/(app)/(modals)/language`, not `/(app)/language`.

**Raise a global modal only from a USER GESTURE — never from an effect.** A tap
can only happen when no native sheet is presented, but an effect driven by a
timer, a socket push or a programme boundary can fire at any moment — including
while a `(modals)` `formSheet` is on screen. An RN `<Modal>` raised over a native
presentation is the race described above, and it reproduced on device
(2026-08-20): `useParentalGuard` auto-raised `signInRequired` when a live 18+
programme rolled in while the player-options sheet was open. The modal mounted
**invisibly** (present in the component tree, absent from the screen) and
swallowed every touch — back button, both swipe directions, everything — leaving
the app unusable. If a background condition needs to prompt, render it as
in-screen UI (the blocked overlay's own CTA) and let the user tap.

**Every RN `<Modal>` that can open while the player is fullscreen must declare `supportedOrientations={['portrait', 'landscape']}`.** An iPhone Modal defaults to portrait-only; presented while the app is locked to landscape it shares no orientation with the app and iOS throws `UIApplicationInvalidInterfaceOrientation` — a fatal crash that **dev builds only log** (RN returns all orientations in DEV), so it surfaces only in release. This was the top iOS crash (REACT-NATIVE-RTSH-OTT-12: the cellular gate firing on a Wi-Fi → cellular switch mid-fullscreen). `ModalWrapper`, `ParentalPinModal`, `AdOverlay` and `TVNavButton` declare it; `ModalWrapper.test.tsx` pins every global modal type.

**A route-owned modal must clear itself on unmount.** Anything that opens `currentModal` from a screen's effect must clear it in that effect's cleanup — see `useCellularGate`. Otherwise leaving the screen strands an undismissable overlay over whatever comes next.

```ts
useAppStore.getState().updateModalSlice({
  currentModal: 'confirmation',
  modalData: {
    title: t('common:confirm'),
    description: t('settings:logout_confirm'),
    button: t('common:ok'),
    action: () => logout(),
    button2: t('common:cancel'),
    action2: () => {}, // ModalWrapper closes after the action runs
  },
});

// close from anywhere
useAppStore.getState().updateModalSlice({ currentModal: null });
```

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `Alert.alert` | `ModalSlice` + `ModalWrapper` |
| Navigation guard in `useEffect` | `Stack.Protected` |
| `presentation: 'modal'`/`'formSheet'`/`'fullScreenModal'` on a route that raises a global modal | `getPlayerScreenOptions()` — card push + `gestureDirection: 'vertical'`. The native VC races `ModalWrapper`'s RN `<Modal>` and strands an invisible touch-eating window (re-confirmed broken on screens 4.26 / iOS 26.1, 2026-08-07) |
| A sheet route sitting flat beside pushed routes | Put it in the `(modals)/` route group; href keeps the group (`/(app)/(modals)/theme`) |
| `<NavigationBar hidden />` (expo-navigation-bar component) | The `expo-navigation-bar` config plugin (`hidden: true`) — applied natively on every Activity start. The component resets the bar on unmount via a floating `setStyle` promise, which rejects when the Activity is already destroyed (Back / low memory with JS alive) — REACT-NATIVE-RTSH-OTT-3, 117 users on build 20. Until every build carries the plugin, `_layout.tsx` hides it with `setVisibilityAsync('hidden').catch()`. |
| `router.setParams({ id })` to switch what the current screen shows (channel, station) | Local state seeded once from the param (`const [activeId, setActiveId] = useState(id)`). Changing a **route** param remounts the screen (Expo Router docs), rebuilding every native child — a player restarts and fullscreen drops. `channel/[id]` + `radio/[id]` do this. |
