---
paths:
  - "src/responsive/**"
  - "src/hooks/useOrientation.ts"
  - "src/components/Inputs/CountryPickerInput.tsx"
---

# Responsive layout & sizing (`@/responsive`)

## How it works today (2026-06-18)

A self-contained, **portable** module (`src/responsive/`) owns every device-size decision. It depends only on `react` + `react-native` — no store, theme, or API coupling — so the folder can be copied into another project and wired by editing one config file. Three deliberately-separate concerns (this is the industry standard: don't linearly scale a UI — a bigger screen should show _more_, not _bigger_):

1. **Layout — reactive, by device class + orientation.**
   - `getDeviceClass(width, height)` (pure) → `'phone' | 'tablet' | 'tv'`. Classifies by **shortest side** (`Math.min(width, height) ≥ TABLET_MIN_SHORTEST_SIDE` (600) ⇒ tablet; `Platform.isTV` ⇒ tv). The shortest side is orientation-independent, so a phone in landscape is never mistaken for a tablet in portrait — the same logic as Android's `sw600dp` qualifier.
   - `useResponsive()` → `{ deviceClass, isLandscape, width, height }` via `useWindowDimensions` (re-renders on rotation / split-view resize). Because it reads the **window**, an iPad in split-view correctly classifies as `phone` for layout.
   - `useResponsiveGrid()` → `numColumns` from `GRID_COLUMNS` (phone 2/2, tablet 3/4, TV 4/4). The Home channel grid consumes this; cards self-size via `flex: 1`. Single-column lists (radio/guide) stay single-column at every size — but are width-capped + centered on tablet/TV via `useContentWidth` (concern 3), not stretched edge-to-edge.

2. **Sizing — static step multiplier at the token layer.**
   - `scaled(n)` multiplies a token by a **discrete per-class step** (`UI_SCALE`: phone 1, tablet 1.15, TV 1.3), snapped to a physical pixel, **resolved once at module load** (`Dimensions.get`). Applied at the token _source_ only: `FONTSIZE`, `SPACING` (`theme/`), and the primitive size tables in `ReusableText`/`ReusableBtn`. Every component scales for free by consuming tokens — never call `scaled()` inside a feature component.

3. **Content width — reactive centered cap for single columns.**
   - `useContentWidth(variant)` returns a `ViewStyle` that caps a single column to `CONTENT_MAX_WIDTH[variant]` (`form` 480 / `content` 640 / `player` 820) and centers it on **tablet/TV**, and is a **no-op on phone** (empty object — phone byte-for-byte unchanged). Reactive (via `useResponsive`) + memoized (stable reference, safe in `useCallback`/memo deps). Applied to a `ScrollView`/`FlashList` `contentContainerStyle`, a wrapping `<View>`, or a `FlashList` `renderItem` row wrapper. Wired on: auth forms (`AuthScreen`), change-password, settings, account, profile, radio now-playing, the channel player (inline video + day-strip + EPG — as a conditional **style** on the same nodes, so it's never applied in fullscreen and never moves the player in the tree → no rotation remount), and the Guide / Search row lists. **Not** used on the Home grid (a grid fills the wider screen with more columns instead).

4. **Orientation — per device class, applied at runtime (2026-07-28).**
   - `hooks/useOrientation.ts` owns the policy; `app.config.ts` stays `orientation: 'default'` (the manifest must declare landscape so the player can rotate into it).
   - **Phone** — portrait-locked (`OrientationLock.PORTRAIT_UP` from `useLockPortrait`, mounted at the app root). Only `useFullscreenOrientation` rotates it, and only on the fullscreen button; there is no sensor-driven rotation.
   - **Tablet** — free rotation (`unlockAsync()`); the fullscreen locks are no-ops there.
   - **TV** — untouched (no portrait concept).
   - The phone-vs-larger check reads `Dimensions.get('screen')` — the **physical screen**, not `'window'` like `useResponsive()` does. Orientation is a device-level concern: an iPad in a narrow split-view window is still a tablet and must stay free to rotate, even though its window classifies as `phone` for layout.

## Why these choices

- **Tablets rotate because the OS already decided that.** For `targetSdk` 36 Android 16 ignores `android:screenOrientation` **and** `setRequestedOrientation()` — what `expo-screen-orientation` calls — on any display ≥ sw600dp, and Apple deprecated `UIRequiresFullScreen` in iPadOS 26. Locking a tablet was already fiction on current OSes; the runtime policy just makes intent match reality on both platforms. The `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` manifest opt-out was considered and rejected — Google removes it at `targetSdk` 37, mid-contract, and it does nothing for iPad.
- **Don't linearly scale; step by class.** Proportionally scaling every view turns a tablet into a blown-up phone and wastes the extra real estate (Apple/Google HIG). A small discrete step (≤1.3×) keeps typography readable and controls tappable without stretching the layout.
- **Static type, reactive layout.** Font/spacing that jumps on rotate or split-view resize is jarring, and a device's class doesn't change mid-session — so sizing is resolved once. Column counts _should_ track the live window, so the grid is reactive.
- **`phone = 1` is the safety net.** On phones `scaled(n) === n`, so the entire existing phone UI is byte-for-byte unchanged; only tablet/TV see the step. The same safety net holds for content width — `useContentWidth` returns an empty style on phone, so a single column there is full-bleed exactly as before; only tablet/TV get the centered cap.
- **A wide single column is wasted, not "bigger".** A login form or settings list at 1200dp wide is unreadable and ugly — the fix is a centered max-width column (every web/native tablet app does this), not stretching. Three caps (form/content/player) instead of one because a single-input form wants a narrower column than a player.
- **Window (layout) vs physical device (registry) are separate.** Layout cares about the live drawable window (split-view shrinks it); the backend device registry cares about the physical form factor. So `@/responsive` (window) and `utils/device.ts → getDeviceType()` (physical) stay decoupled even though both "classify the device".
- **Portable by construction.** Zero project imports inside `responsive/`; the only project-specific wiring (which tokens call `scaled()`, which screen calls `useResponsiveGrid()`) lives outside the folder. Tune everything in `responsive/breakpoints.ts`.

## Known gaps

- **Token scale is fixed at launch** — if a device enters/exits split-view mid-session the typography step does not re-resolve (layout columns do). Accepted: font jumps are worse than a stale step, and full-screen→split transitions are rare. Re-resolve via a context provider if it ever matters.
- **Single multiplier for all token types** — headings/body/spacing share one step. Per-category steps (e.g. headings scale less than body) are a refinement if tablet type feels heavy; not needed at 1.15×.
- **Card badge internals are still literal px** — `ChannelCard`'s frosted badge paddings/icon sizes are hardcoded (not tokens), so they don't scale on tablet. Minor (the card name text does scale via `FONTSIZE`); convert to tokens if badges look small on a real tablet.
- **TV (`4/4`, step 1.3) is only partly validated on device** — the D-pad/focus foundation works (Home grid, focus rings, and the `radio/[id]` walk of 2026-08-06), but the 10-foot sizing pass is still owed. **The 1.3 step is a height cost, not just a type cost:** a 1080p set is 540dp tall at density 320, so a stacked layout drawn for a phone has LESS vertical room on TV while every token is 30% larger. That combination is what made `radio/[id]` unusable (see `→ Android TV / STB`); assume any other stacked screen has the same latent defect until it's checked on a TV.
- ~~**`radio/[id]` landscape untested**~~ — **fixed 2026-07-28.** It did share the channel screen's defect (a fixed two-pane column + the short landscape height ⇒ a schedule list with barely a row of viewport and no way to scroll the rest in), so it got the same split: on **tablet landscape** the now-playing core becomes the left column (42%, content-height, vertically centered via `alignSelf` on the row's cross axis) and the day strip + schedule the right column (`flex: 58`, full screen height). Applied the same way as the channel screen — a style swap on the existing `body`/pane nodes with both directions written explicitly, never an added/removed wrapper. Its column cap also moved from `useContentWidth('content')` (640) to **`'player'` (820)**, matching `channel/[id]`: at 640 a tablet in portrait (800dp) rendered 80dp gutters while the channel screen went full-bleed, so two sibling player screens disagreed on width. Verified on a 1280×800dp tablet emulator 2026-07-28: portrait renders edge-to-edge, landscape shows the two columns with the schedule scrolling through the full day.
- **`CountryPickerInput` sheet height is frozen at launch** — `SHEET_HEIGHT` reads `Dimensions.get('window').height` at **module scope** (`components/Inputs/CountryPickerInput.tsx`), so on a tablet the sheet keeps its launch-orientation height after a rotation until the app restarts. Latent before (nothing rotated); live now that tablets do.

---
