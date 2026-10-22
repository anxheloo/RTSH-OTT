---
paths:
  - "src/app/**"
  - "src/components/**"
  - "src/responsive/**"
---

# Screens, lists and responsive sizing — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## Loading States — Skeleton Strategy

Data screens never block on a full-screen spinner. Navigation is instant: the screen renders its chrome (header, strips, toggles) immediately and swaps each **data-driven region** for a skeleton while its query is in flight.

- **`Skeleton` (`components/Layout/Skeleton.tsx`) is the only pulsing primitive** — theme `colors.skeleton`, Reanimated opacity pulse. Compose it; never hand-roll shimmer.
- **Every list row component gets an `XSkeleton` sibling in the same folder** (`ChannelCardSkeleton`, `StationRowSkeleton`, `GuideRowSkeleton`, `ProgramRowSkeleton`) mirroring the real row's footprint — same paddings, tile sizes, hairline divider — so data swaps in with no layout jump. Use `FONTSIZE` tokens as text-line heights.
- **Lists drive `ListEmptyComponent` off the full query state, not just `isLoading`.** The placeholder is a three-way pick: `isLoading` → skeleton stack; `error` → `<ErrorState onRetry={refetch} />` (`components/empty`) — the quiet persistent screen state behind the global `apiError` modal, with a Retry; otherwise (genuine `[]`) → the domain `Empty*State`. Compute it once into a `listEmpty` node above the JSX rather than nesting ternaries in the prop. (Or use `AnimatedFlashList`'s `skeletonComponent` for the loading slice.) Headers/toggles stay live.
- **List state-views compose `ListStateView`** (`components/empty/ListStateView.tsx`) — the shared centered title + subtitle + optional-Retry block. `ErrorState` (generic load-failure copy, always offers Retry) and the domain `Empty*State` wrappers (`EmptyChannelsState`, `EmptyStationsState`, `EmptyEpgState`, `EmptyCatchupState` — genuine-empty copy, no Retry) are thin wrappers over it, so every list placeholder is visually identical. Error ≠ empty: a failed load shows Retry, a genuine `[]` doesn't.
- **Detail screens with heavy children** (channel player): mount the heavy component only when its inputs are resolved; until then a `Skeleton` holds its exact slot. Never gate the route on the query. If the child is gated content (adult/geo), wait for **all** gating inputs before mounting — a skeleton must never be replaced by a frame of gated content.
- **`FullScreenLoader` is reserved** for full-screen player surfaces (live/VOD buffering overlays, `program/[id]`) and boot — not for data screens.

## Lists & Screen Composition

A scrolling content screen is built around **one** vertically-scrolling virtualized list (`FlashList`) that owns the whole scroll. The primary vertical dataset — the channel grid, the station list, the guide rows — is that list's `data`. Everything that isn't that dataset (search bar, segmented toggle, a horizontal carousel, the section title) goes into `ListHeaderComponent` so it scrolls with the content. This is the Home (`(tabs)/index.tsx`) + Guide (`(tabs)/guide.tsx`) pattern.

- **Never nest a vertical list inside a vertical scroller.** A `FlashList`/`FlatList` inside a `ScrollView` (or another vertical list) with the same orientation breaks windowing and throws *"VirtualizedLists should never be nested…"*. Put the second region in `ListHeaderComponent` instead — don't reach for a parent `ScrollView`.
- **Horizontal-in-vertical is fine.** A horizontal `FlashList` (hero carousel) nested in the vertical list's header is legal and idiomatic — different orientation, no virtualization conflict.
- **Header pinned vs scroll-away.** Default is scroll-away (controls live in `ListHeaderComponent`, no `stickyHeaderIndices`). Add `stickyHeaderIndices={[0]}` only when the search/toggle must stay reachable mid-scroll.
- **Mode toggles that change list shape re-key, don't restructure.** When a toggle swaps between a grid and a single-column list, `numColumns` changes — neither `FlashList` nor `FlatList` can change `numColumns` in place (both require a fresh instance). Drive it with `key={`${mode}-${numColumns}`}` and swap `data`; the remount is invisible **as long as the header has no animation/internal state** (a state-driven `SegmentedToggle` re-renders synchronously). Resetting scroll-to-top on the swap is correct UX. Do **not** hand-roll a constant-column workaround (e.g. chunking grid items into pairs) to dodge the re-key.
- **Responsive columns (tablet/large screens).** Drive grid `numColumns` from `useResponsiveGrid()` (`@/responsive`), never a hardcoded `2` and no per-screen `floor(width / target)`. It returns columns by **device class + orientation** (phone 2/2, tablet 3/4, TV 4/4 — see `responsive/breakpoints.ts → GRID_COLUMNS`). Classification is by **shortest side** (`Math.min(width, height)`, orientation-independent — `sw600dp` standard), so a phone in landscape never reflows like a tablet. Cards self-size via `flex: 1`; single-column **lists stay single-column** at every size. This is the per-component large-screen mechanism (plan 22.18); full TV focus/D-pad nav is separate.
- **Grid gutters from column position, not separators.** With `numColumns`, compute edge/inner padding per cell from `index % numColumns` (`paddingLeft: col === 0 ? SCREEN_PADDING : GAP/2`), and use `paddingBottom` on the cell for row gaps. `ItemSeparatorComponent` renders between every item (including within a row) and is wrong for grids.
- **`EdgeFade` (`components/Layout/EdgeFade.tsx`) is the reusable fade scrim** — drop it as the last child of a `position: relative` container to dissolve content into the background along an edge (`edge`, `size`, `color`). Compose it; don't hand-roll a `LinearGradient` per screen.
- **`scrollToIndex` on a `FlashList` must wait for `onLoad`.** FlashList deliberately renders no items on its first cycle — it measures itself first — so a scroll issued from a mount effect (even deferred a frame) resolves against an unmeasured list: it lands at an estimated offset and then visibly snaps to the true position on the user's first scroll. Gate it on an `onLoad`-set flag. Make the FIRST center `animated: false` (the screen should simply open there) and later ones animated (the move should read as a change). Both EPG lists do this — see `channel/[id].tsx` → `listReady`.
- **Reanimated layout/state animations must be OFF inside a recycling list.** A `FlashList` cell is re-pointed at a different item in place; Reanimated can't distinguish that from a real state change, so a `layout={LinearTransition}` plays the *swap* as if it were a resize and a `withTiming` in a `useAnimatedStyle` eases to the new item's value — both read as a flicker while scrolling ([FlashList → Reanimated + recycling](https://shopify.github.io/flash-list/docs/guides/reanimated/)). Give the row an explicit opt-out prop the virtualized parent sets (`ProgramRow`'s `recycled`) rather than deleting the animation — an unvirtualized parent (the channel screen's `ScrollView`) has no recycling and should keep it. Same rule for `useSharedValue`: reset it on item-id change, or the previous item's value bleeds in.

## Responsive Sizing (`@/responsive`)

A self-contained, portable module (`src/responsive/`, depends only on `react` + `react-native`) owns every device-size decision. Two concerns, deliberately separate — this mirrors the industry standard (don't linearly scale a UI; a tablet should show *more*, not *bigger*).

- **Layout = reactive, by device class + orientation.** `useResponsive()` → `{ deviceClass, isLandscape, width, height }`; `useResponsiveGrid()` → `numColumns`. Classification is **shortest-side** (`Math.min(width, height) ≥ 600` = tablet; `Platform.isTV` = tv), so it's rotation-stable. Reads the live window via `useWindowDimensions`, so an iPad in split-view correctly drops to the phone layout.
- **Sizing = static step multiplier at the token layer.** `scaled(n)` multiplies a token by a **discrete per-class step** (`UI_SCALE`: phone 1, tablet 1.15, TV 1.3), resolved **once at launch**. Apply it at the token *source* only — `FONTSIZE`, `SPACING`, and the primitive size tables in `ReusableText`/`ReusableBtn` already pass through it. **Never** call `scaled()` (or hand-roll a multiplier) inside a feature component; consume the tokens and you scale for free. Phone factor is `1`, so the phone UI is byte-for-byte unchanged.
- **Why static for type, reactive for layout:** font sizes that jump on rotate/resize are jarring, and a device's class doesn't change mid-session; column counts *should* track the live window.
- **Single-column width = centered cap, not full-bleed.** A single column (a form, a settings/list screen, the inline player) must not stretch edge-to-edge on a wide screen. Apply `useContentWidth(variant)` (`@/responsive`) — it returns a `ViewStyle` that caps the column to `CONTENT_MAX_WIDTH[variant]` (`form` 480 / `content` 640 / `player` 820) and centers it on **tablet/TV**, and is a **no-op on phone** (empty object → phone byte-for-byte unchanged). Drop it onto a `ScrollView`/`FlashList` `contentContainerStyle`, a wrapping `<View>`, or a `FlashList` `renderItem` row wrapper (centers each full-width row). **Do not** use it on a responsive **grid** (Home) — a grid fills the wider screen with more columns (`useResponsiveGrid`), not a capped column. It's reactive + memoized (stable reference), so it's safe in `useCallback`/memoized-row deps.
- **Tune in one place:** `responsive/breakpoints.ts` (`GRID_COLUMNS`, `GRID_GAP`, `UI_SCALE`, `TABLET_MIN_SHORTEST_SIDE`, `CONTENT_MAX_WIDTH`). Do not scatter breakpoints. `GRID_GAP` is the grid gutter per device class (phone 8, tablet/TV 14) — deliberately raw dp, not a `scaled()` token, so tablet and TV share one visibly wider gap.
- **Not for backend device type.** Physical form-factor reporting for the device registry stays in `utils/device.ts` (`getDeviceType()`); it reports the *physical* device, this module reports the *window*. Keep them separate.

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `FullScreenLoader` gating a data screen | Skeleton strategy (see Loading States) |
| Vertical list nested in a vertical `ScrollView`/list | One `FlashList`; secondary regions go in `ListHeaderComponent` (see Lists & Screen Composition) |
| Reanimated `layout`/`withTiming`/`useSharedValue` left on inside a recycling `FlashList` row | Opt the row out in virtualized parents (`ProgramRow`'s `recycled`) / reset shared values on item-id change — otherwise cell reuse animates as a flicker |
| `scrollToIndex` fired from a mount effect on a `FlashList` | Gate it on `onLoad` — items don't exist in the first render cycle, so it lands at an estimated offset and snaps on first scroll |
| Hardcoded `numColumns={2}` or per-screen `floor(width/target)` | `useResponsiveGrid()` from `@/responsive` (device class + orientation) |
| Hand-scaling a component's font/size for tablet | Scale at the token layer — `scaled()` wraps `FONTSIZE`/`SPACING`/primitive size tables once (`@/responsive`) |
| Single-column form/list/player stretching edge-to-edge on tablet | `useContentWidth(variant)` from `@/responsive` (centered cap on tablet/TV, no-op on phone) |
| Per-screen inline `LinearGradient` fade | `EdgeFade` (`components/Layout`) |
| `aspectRatio` + a **percentage** width + `maxWidth` on the SAME node | Clamp **both** axes (`maxWidth` *and* `maxHeight`), or drop the percentage for a fixed width. Yoga derives the aspect height from the percentage-resolved width and clamps only the width, so the box silently becomes a rectangle once the parent exceeds `maxWidth / percent`. Bitten twice: `channel/[id]`'s player (2026-07-28) and `RadioPlayer` + `radio/[id]`'s skeleton (2026-08-06). **Beware `contentWidth`** — it contributes a `maxWidth` from a *different* file, so the two halves of the trap can sit in separate places and look innocent apart. |
