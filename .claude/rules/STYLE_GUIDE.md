# STYLE_GUIDE.md — RTSH-OTT

Distilled from real code across RTSH and SOLITAR-FRONTEND_EMERGENT, then elevated to world-class standards. This is the recommended approach for writing clean, professional, self-explanatory React Native / Expo code in this project. Where patterns from those repos were solid, they're kept. Where something more professional exists, it's here instead.

---

## Core Principles

- **One responsibility per file.** One component, one hook, one slice.
- **Reusable primitives are prefixed `Reusable`.** `ReusableBtn`, `ReusableInput`, `ReusableText`, `ReusableImage`. Feature components keep domain names: `ChannelCard`, `EpgRow`, `LivePlayer`.
- **Theme comes from the store, not Context.** `const colors = useAppStore((s) => s.colors)`. No ThemeProvider, no `useTheme()`.
- **Shared primitives own their internals only.** Margins and positioning belong to the parent.
- **No magic numbers.** Fonts, radii, and spacing always come from token files.
- **Modals flow through `ModalSlice` + `ModalWrapper`.** No `Alert.alert`, no local modal state.
- **No `console.log` in committed code.** Use a Sentry breadcrumb or remove it.
- **No deep relative imports.** Use `@/` aliases throughout.

---

## In-File Ordering

Every file reads top-to-bottom in the same predictable order. This is the single rule that
keeps 200+ files feeling like one author wrote them. Two principles govern it:

1. **Fixed skeleton.** The top-level shape of a file (imports → module constants → component/hook → exports → styles) never varies.
2. **Cluster by concern, not by keyword.** *Inside* a component or hook, keep everything for one concern together — the selector, derived value, effect, and callback for "quality" sit as a labelled block, rather than scattering all `useState`s at the top and all `useEffect`s at the bottom. Concern-clustering beats mechanical grouping for readability; the section order below is the default skeleton, not a mandate to split a cohesive block apart.

### File skeleton (all files)

1. **File-level JSDoc** — the *why* / contract / known edge cases (every non-trivial file).
2. **Imports** — in the order defined in [Import Order](#import-order).
3. **Module constants & pure helpers** — `as const` tables, `const FOO = …`, file-local pure functions (e.g. `toDateKey`). Above the component, never inside it.
4. **Types** — `XProps` / local `type`s, immediately above the thing they describe.
5. **The component / hook / slice** (body order below).
6. **`StyleSheet.create()`** — after the component (components only).
7. **`export default`** — the file's **final statement**, after the styles block.

### Component body order

```tsx
const ChannelCard: React.FC<ChannelCardProps> = (props) => {
  // 1. Hooks — store selectors first, then router/query/mutation, then refs.
  const colors = useAppStore((s) => s.colors);
  const { t } = useTranslation();

  // 2. Local state (useState / useReducer).
  const [open, setOpen] = useState(false);

  // 3. Derived values & memos (computed from props/state/queries).
  const label = useMemo(() => formatTitle(props.title), [props.title]);

  // 4. Effects & listeners — each its own block with its cleanup. Co-locate
  //    a listener's subscribe + teardown; never split them across the file.
  useEffect(() => { /* … */ }, []);

  // 5. Callbacks / handlers (useCallback or plain fns).
  const onPress = useCallback(() => setOpen((v) => !v), []);

  // 6. Early returns (loading / gated / error). A skeleton must never be
  //    replaced by a frame of gated content — wait for all gating inputs.
  if (isLoading) return <Skeleton />;

  // 7. JSX.
  return <View />;
};
```

When a screen has several concerns (e.g. quality, parental gate, day strip), keep each as a **labelled block** that internally follows 1–5, rather than interleaving them. A one-line `// Quality —` comment above each block is the marker.

### Hook body order

`refs → state → derived → callbacks → effects/listeners → return`. The return shape is **stable** (never conditionally omit keys). JSDoc explains the *why*. See the [Hooks template](#template-1).

### Slice body order

`state fields → updateXSlice (universal setter) → named domain actions`. Group the interface the same way: fields first, `updateXSlice`, then actions. Do I/O before `set` in async actions. See the [Store Slices template](#template).

---

## TypeScript

### `interface` vs `type`

`interface` for contracts and shapes. `type` for unions, aliases, and inferred types.

```ts
// interface: component props, slice shape, API response contracts
interface ChannelCardProps { ... }
interface UserSlice { ... }
interface ChannelResponse { ... }

// type: unions, discriminated types, z.infer, store composition
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
type ThemeMode = 'light' | 'dark' | 'system';
type AppState = UserSlice & ThemeSlice & SettingsSlice & ...;
type LoginFormType = z.infer<typeof LoginSchema>;
```

### Discriminated unions over enums

String literal unions are lighter, narrow better, and don't require an import.

```ts
// avoid
enum CallStatus { Ringing, Active, Ended, Missed }

// prefer
type CallStatus = 'ringing' | 'active' | 'ended' | 'missed';
```

### `as const` on all lookup tables

```ts
export const BORDERRADIUS = {
  radius_8: 8,
  radius_12: 12,
  radius_14: 14,
  radius_20: 20,
} as const;

export const STORAGE_KEYS = {
  USER: 'user',
  SETTINGS: 'settings',
  RESUME_POSITIONS: 'resume_positions',
} as const;
```

### General

- Avoid `any`. Use `unknown` + narrow, or a precise type.
- `error: unknown` in catch blocks — cast only after narrowing.
- Props type named `XProps` (e.g. `ChannelCardProps`), defined above the component.
- `React.FC<Props>` for every component.

---

## Components

### Template

```tsx
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

type ChannelCardProps = {
  channelId: string;
  title: string;
  logoUrl?: string;
  onPress: () => void;
};

const ChannelCard: React.FC<ChannelCardProps> = ({ channelId, title, logoUrl, onPress }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`channel-card-${channelId}`}
    >
      <ReusableText text={title} size={FONTSIZE.sm} color={colors.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDERRADIUS.radius_12,
    padding: SPACING.space_12,
  },
});

export default ChannelCard;
```

### Key points

- `export default` is the file's **last statement**; `StyleSheet.create()` sits just above it, after the component.
- Props type defined **above** the component, named `XProps`.
- Wrap shared primitives with `Animated.View` from `react-native-reanimated` even when not animating yet — avoids a refactor later.
- `testID` on every interactive leaf.
- JSDoc block at the top of every non-trivial file.

### `activeOpacity`

| Context | Value |
|---------|-------|
| Buttons | `0.8` |
| Text acting as a button | `0.7` |
| Image containers | `0.9` |

### `React.memo`

Only memoize components inside `FlashList`/`FlatList` or those that re-render at high frequency. When memoized, always set `displayName`.

```ts
const ChannelCard = React.memo(({ ... }) => { ... });
ChannelCard.displayName = 'ChannelCard';
```

---

## Store Slices

### Template

```ts
import { StateCreator } from 'zustand';

export interface ChannelsSlice {
  favorites: string[];
  recentlyWatched: string[];
  updateChannelsSlice: (state: Partial<ChannelsSlice>) => void;
  toggleFavorite: (channelId: string) => void;
  addRecentlyWatched: (channelId: string) => void;
}

export const createChannelsSlice: StateCreator<ChannelsSlice> = (set) => ({
  favorites: [],
  recentlyWatched: [],

  updateChannelsSlice: (state) => set(state),

  toggleFavorite: (channelId) =>
    set((s) => ({
      favorites: s.favorites.includes(channelId)
        ? s.favorites.filter((id) => id !== channelId)
        : [...s.favorites, channelId],
    })),

  addRecentlyWatched: (channelId) =>
    set((s) => ({
      recentlyWatched: [channelId, ...s.recentlyWatched.filter((id) => id !== channelId)].slice(0, 20),
    })),
});
```

### Key points

- Every slice exposes `updateXSlice: set` as a universal partial setter for simple batched updates from outside the slice.
- Complex domain actions get explicit named methods alongside it.
- `set` is the only mutator — never expose raw `set` to components.
- Async slice actions: do I/O first (`SecureStore`, MMKV, network), then `set`.
- Selectors live at the call site: `useAppStore((s) => s.favorites)`. Extract to a custom hook only when reused in 3+ places.

### Imperative access outside React

Inside axios interceptors, service functions, or async callbacks — use `useAppStore.getState()`.

```ts
useAppStore.getState().updateModalSlice({ currentModal: 'apiError', modalData: { description } });
useAppStore.getState().logout();
```

---

## Hooks

### Template

```ts
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Fires `onResume` when app returns from background after `thresholdMs`.
 * Uses a timestamp ref because RN timers are throttled when suspended —
 * setTimeout-based approaches fire late on iOS.
 */
export function useAppResumeGuard(onResume: () => void, thresholdMs = 30_000) {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  const handleChange = useCallback(
    (next: AppStateStatus) => {
      if (appStateRef.current === 'active' && next.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
      }
      if (next === 'active' && backgroundedAtRef.current !== null) {
        if (Date.now() - backgroundedAtRef.current >= thresholdMs) onResume();
        backgroundedAtRef.current = null;
      }
      appStateRef.current = next;
    },
    [onResume, thresholdMs],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [handleChange]);
}
```

### Key points

- `useCallback` wraps async functions used in `useEffect` deps — keeps deps stable, avoids stale closures.
- `useEffect(() => { fn(); }, [fn])` — the callback is the dep.
- `useRef` for instance state that must not trigger re-renders (timestamps, handles, previous values).
- Return a stable object shape — never conditionally omit keys.
- JSDoc at the top explaining the **why**, not the what.
- Cleanup functions only `.remove()` / `.unsubscribe()` — never throw inside cleanup.
- Module-level singletons (cached state, subscriber Sets) are appropriate for hooks that must only initialize once across all mounts (e.g. `useNetworkReconnect`).

---

## API Layer

### Endpoint constants

Composable string constants. Parametrized routes as inline functions.

```ts
export const AUTH_ROUTES = 'api/auth';
export const CHANNELS_ROUTES = 'api/channels';

export const LOGIN_ROUTE = `${AUTH_ROUTES}/login`;
export const REGISTER_ROUTE = `${AUTH_ROUTES}/register`;
export const REFRESH_ROUTE = `${AUTH_ROUTES}/refresh`;

export const CHANNEL_BY_ID = (id: string) => `${CHANNELS_ROUTES}/${id}`;
export const STREAM_BY_ID = (id: string) => `${CHANNELS_ROUTES}/${id}/stream`;
```

### Service

Pure functions — no hooks, no store reads.

```ts
import { apiClient } from '../client';
import { CHANNELS_ROUTES, CHANNEL_BY_ID } from '../endpoints';
import type { Channel } from '@/types/domain';

export const getChannels = async (): Promise<Channel[]> => {
  const res = await apiClient.get(CHANNELS_ROUTES);
  return res.data.channels;
};

export const getChannelById = async (id: string): Promise<Channel> => {
  const res = await apiClient.get(CHANNEL_BY_ID(id));
  return res.data.channel;
};
```

### Query hook

```ts
import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../services/channels';

export const useChannels = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });
  return { channels: data ?? [], isLoading, error, refetch };
};
```

### Mutation hook

The `mutationFn` logic is a **named async function** defined above the hook, not an inline arrow.

```ts
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { login } from '../services/auth';
import type { LoginFormType } from '@/types/auth';

async function loginFlow(data: LoginFormType) {
  const res = await login(data);
  return res;
}

export const useLogin = () => {
  const updateUserSlice = useAppStore((s) => s.updateUserSlice);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);

  return useMutation({
    mutationFn: loginFlow,
    onSuccess: ({ user, accessToken }) => {
      updateUserSlice({ user, token: accessToken, isAuthenticated: true });
    },
    onError: (error) => {
      updateModalSlice({ currentModal: 'apiError', modalData: { description: error.message } });
    },
  });
};
```

### Key points

- Query keys are always arrays: `['channels']`, `['epg', date]`, `['channel', id]`. First element is the resource name.
- Always return safe defaults from query hooks (`data ?? []`, `data ?? null`).
- Don't use `useEffect` to react to query `data`/`error`. v5 removed per-`useQuery` `onSuccess`/`onError`, so **unexpected** errors are handled once, centrally, by the `QueryCache`/`MutationCache` `onError` on the `queryClient` (`client.ts`) — they open the `apiError` modal (query → Retry/refetch, mutation → dismiss). Mutations keep `onError` for *expected* failures rendered inline.
- **Route form errors through `meta: INLINE_CLIENT_ERROR`** (exported from `client.ts`) — the hybrid model. Auth forms, change-password, and the register/reset wizards set it: the global modal is suppressed only for **client (4xx)** failures — the field-actionable ones they render inline — while **unexpected** failures (5xx, network, timeout) still fire the modal. The inline side mirrors the same boundary: `authErrorMessage` returns `undefined` for 5xx/network, so the form renders nothing and never doubles up with the modal. Keep `client.ts → isClientError` and `authErrorMessage`'s 4xx gate in lock-step. The global handler also skips 401/403/426 (owned by the interceptor: refresh-or-logout, force-update).
- A bare axios instance (`refreshClient`) handles the refresh endpoint only — prevents interceptor deadlock on 401.

---

## Schemas & Validation

Zod schema and inferred type co-located in the same file.

```ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('auth:invalid_email'),
  password: z.string().min(8, 'auth:password_too_short'),
});

export type LoginFormType = z.infer<typeof LoginSchema>;
```

Schemas live in `types/` alongside domain types, not inside form files.

---

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

---

## Modals

Single-modal slice (`currentModal` + `modalData`), one modal at a time — matches RTSH + SOLITAR. All modals route through `ModalSlice` + `ModalWrapper`, callable from anywhere (React components, async flows, axios interceptors). `ModalWrapper` owns the default i18n copy per type, so alert-style triggers (e.g. `noInternet`) pass no text. Up to three buttons via `button`/`button2`/`button3` + `action`/`action2`/`action3`; `button` defaults to "OK".

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

---

## Loading States — Skeleton Strategy

Data screens never block on a full-screen spinner. Navigation is instant: the screen renders its chrome (header, strips, toggles) immediately and swaps each **data-driven region** for a skeleton while its query is in flight.

- **`Skeleton` (`components/Layout/Skeleton.tsx`) is the only pulsing primitive** — theme `colors.skeleton`, Reanimated opacity pulse. Compose it; never hand-roll shimmer.
- **Every list row component gets an `XSkeleton` sibling in the same folder** (`ChannelCardSkeleton`, `StationRowSkeleton`, `GuideRowSkeleton`, `ProgramRowSkeleton`) mirroring the real row's footprint — same paddings, tile sizes, hairline divider — so data swaps in with no layout jump. Use `FONTSIZE` tokens as text-line heights.
- **Lists drive `ListEmptyComponent` off the full query state, not just `isLoading`.** The placeholder is a three-way pick: `isLoading` → skeleton stack; `error` → `<ErrorState onRetry={refetch} />` (`components/empty`) — the quiet persistent screen state behind the global `apiError` modal, with a Retry; otherwise (genuine `[]`) → the domain `Empty*State`. Compute it once into a `listEmpty` node above the JSX rather than nesting ternaries in the prop. (Or use `AnimatedFlashList`'s `skeletonComponent` for the loading slice.) Headers/toggles stay live.
- **List state-views compose `ListStateView`** (`components/empty/ListStateView.tsx`) — the shared centered title + subtitle + optional-Retry block. `ErrorState` (generic load-failure copy, always offers Retry) and the domain `Empty*State` wrappers (`EmptyChannelsState`, `EmptyStationsState`, `EmptyEpgState`, `EmptyCatchupState` — genuine-empty copy, no Retry) are thin wrappers over it, so every list placeholder is visually identical. Error ≠ empty: a failed load shows Retry, a genuine `[]` doesn't.
- **Detail screens with heavy children** (channel player): mount the heavy component only when its inputs are resolved; until then a `Skeleton` holds its exact slot. Never gate the route on the query. If the child is gated content (adult/geo), wait for **all** gating inputs before mounting — a skeleton must never be replaced by a frame of gated content.
- **`FullScreenLoader` is reserved** for full-screen player surfaces (live/VOD buffering overlays, `program/[id]`) and boot — not for data screens.

A three-function wrapper in `lib/keychain.ts` is the only way to interact with `expo-secure-store`. Nothing calls it directly.

```ts
export const storeOnKeychain = async (key: string, value: string): Promise<void> => { ... };
export const retrieveFromKeychain = async (key: string): Promise<string | null> => { ... };
export const removeFromKeychain = async (key: string): Promise<void> => { ... };
```

For the full data → storage matrix (with rationale), see `rules/ARCHITECTURE.md` → Persistence boundaries — the single source of truth.

---

## Lists & Screen Composition

A scrolling content screen is built around **one** vertically-scrolling virtualized list (`FlashList`) that owns the whole scroll. The primary vertical dataset — the channel grid, the station list, the guide rows — is that list's `data`. Everything that isn't that dataset (search bar, segmented toggle, a horizontal carousel, the section title) goes into `ListHeaderComponent` so it scrolls with the content. This is the Home (`(tabs)/index.tsx`) + Guide (`(tabs)/guide.tsx`) pattern.

- **Never nest a vertical list inside a vertical scroller.** A `FlashList`/`FlatList` inside a `ScrollView` (or another vertical list) with the same orientation breaks windowing and throws *"VirtualizedLists should never be nested…"*. Put the second region in `ListHeaderComponent` instead — don't reach for a parent `ScrollView`.
- **Horizontal-in-vertical is fine.** A horizontal `FlashList` (hero carousel) nested in the vertical list's header is legal and idiomatic — different orientation, no virtualization conflict.
- **Header pinned vs scroll-away.** Default is scroll-away (controls live in `ListHeaderComponent`, no `stickyHeaderIndices`). Add `stickyHeaderIndices={[0]}` only when the search/toggle must stay reachable mid-scroll.
- **Mode toggles that change list shape re-key, don't restructure.** When a toggle swaps between a grid and a single-column list, `numColumns` changes — neither `FlashList` nor `FlatList` can change `numColumns` in place (both require a fresh instance). Drive it with `key={`${mode}-${numColumns}`}` and swap `data`; the remount is invisible **as long as the header has no animation/internal state** (a state-driven `SegmentedToggle` re-renders synchronously). Resetting scroll-to-top on the swap is correct UX. Do **not** hand-roll a constant-column workaround (e.g. chunking grid items into pairs) to dodge the re-key.
- **Responsive columns (tablet/large screens).** Drive grid `numColumns` from `useResponsiveGrid()` (`@/responsive`), never a hardcoded `2` and no per-screen `floor(width / target)`. It returns columns by **device class + orientation** (phone 2/2, tablet 3/4, TV 4/4 — see `responsive/breakpoints.ts → GRID_COLUMNS`). Classification is by **shortest side** (`Math.min(width, height)`, orientation-independent — `sw600dp` standard), so a phone in landscape never reflows like a tablet. Cards self-size via `flex: 1`; single-column **lists stay single-column** at every size. This is the per-component large-screen mechanism (plan 22.18); full TV focus/D-pad nav is separate.
- **Grid gutters from column position, not separators.** With `numColumns`, compute edge/inner padding per cell from `index % numColumns` (`paddingLeft: col === 0 ? SCREEN_PADDING : GAP/2`), and use `paddingBottom` on the cell for row gaps. `ItemSeparatorComponent` renders between every item (including within a row) and is wrong for grids.
- **`EdgeFade` (`components/Layout/EdgeFade.tsx`) is the reusable fade scrim** — drop it as the last child of a `position: relative` container to dissolve content into the background along an edge (`edge`, `size`, `color`). Compose it; don't hand-roll a `LinearGradient` per screen.

---

## Responsive Sizing (`@/responsive`)

A self-contained, portable module (`src/responsive/`, depends only on `react` + `react-native`) owns every device-size decision. Two concerns, deliberately separate — this mirrors the industry standard (don't linearly scale a UI; a tablet should show *more*, not *bigger*).

- **Layout = reactive, by device class + orientation.** `useResponsive()` → `{ deviceClass, isLandscape, width, height }`; `useResponsiveGrid()` → `numColumns`. Classification is **shortest-side** (`Math.min(width, height) ≥ 600` = tablet; `Platform.isTV` = tv), so it's rotation-stable. Reads the live window via `useWindowDimensions`, so an iPad in split-view correctly drops to the phone layout.
- **Sizing = static step multiplier at the token layer.** `scaled(n)` multiplies a token by a **discrete per-class step** (`UI_SCALE`: phone 1, tablet 1.15, TV 1.3), resolved **once at launch**. Apply it at the token *source* only — `FONTSIZE`, `SPACING`, and the primitive size tables in `ReusableText`/`ReusableBtn` already pass through it. **Never** call `scaled()` (or hand-roll a multiplier) inside a feature component; consume the tokens and you scale for free. Phone factor is `1`, so the phone UI is byte-for-byte unchanged.
- **Why static for type, reactive for layout:** font sizes that jump on rotate/resize are jarring, and a device's class doesn't change mid-session; column counts *should* track the live window.
- **Single-column width = centered cap, not full-bleed.** A single column (a form, a settings/list screen, the inline player) must not stretch edge-to-edge on a wide screen. Apply `useContentWidth(variant)` (`@/responsive`) — it returns a `ViewStyle` that caps the column to `CONTENT_MAX_WIDTH[variant]` (`form` 480 / `content` 640 / `player` 820) and centers it on **tablet/TV**, and is a **no-op on phone** (empty object → phone byte-for-byte unchanged). Drop it onto a `ScrollView`/`FlashList` `contentContainerStyle`, a wrapping `<View>`, or a `FlashList` `renderItem` row wrapper (centers each full-width row). **Do not** use it on a responsive **grid** (Home) — a grid fills the wider screen with more columns (`useResponsiveGrid`), not a capped column. It's reactive + memoized (stable reference), so it's safe in `useCallback`/memoized-row deps.
- **Tune in one place:** `responsive/breakpoints.ts` (`GRID_COLUMNS`, `UI_SCALE`, `TABLET_MIN_SHORTEST_SIDE`, `CONTENT_MAX_WIDTH`). Do not scatter breakpoints.
- **Not for backend device type.** Physical form-factor reporting for the device registry stays in `utils/device.ts` (`getDeviceType()`); it reports the *physical* device, this module reports the *window*. Keep them separate.

---

## File Naming

| Kind | Convention | Example |
|------|------------|---------|
| Component | `PascalCase.tsx` | `ChannelCard.tsx` |
| Hook | `useCamelCase.ts` | `useChannels.ts` |
| Store slice | `createXSlice.ts` | `createChannelsSlice.ts` |
| Service | `camelCase.ts` | `channels.ts` |
| Types | grouped in `types/` | `types/domain.ts` |
| Route file | exact route name | `(tabs)/index.tsx`, `player/[id].tsx` |
| Component folder | `PascalCase` | `Buttons/`, `Inputs/`, `Media/` |
| Domain folder | lowercase | `channels/`, `epg/`, `catchup/` |

### `utils/` organization

Keep `utils/` flat while small. Once a category reaches ~3+ files, bucket it into a
domain subfolder with its own barrel — mirrors SOLITAR / Bunk-Art (`utils/format/`,
`utils/crypto/`, `utils/storage/`, …). Don't create single-file folders preemptively.
Cross-cutting infra that isn't a pure helper stays at its own top level (`hooks/`,
`lib/`, `store/`) rather than nesting under `utils/`.

---

## Import Order

1. React + React Native core
2. Third-party libraries
3. *(blank line)*
4. `@/` internal imports, grouped by layer: `theme/` → `store/` → `api/` → `hooks/` → `components/` → `utils/` → `types/`

```tsx
import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { getChannels } from '@/api/services/channels';
import ChannelCard from '@/components/channels/ChannelCard';
import { formatDuration } from '@/utils/formatters';
import type { Channel } from '@/types/domain';
```

---

## Barrel Exports

Every component/hook folder has an `index.ts` with a short JSDoc header. Group with comments in large barrels.

**Barrels export the component/hook only — never its `Props` type.** Props stay as a named `export interface XProps` in the component file and are imported directly from that file when a sibling needs them (`import VideoPlayer, { VideoStatus } from './VideoPlayer'`). Re-exporting types through the barrel adds noise and a second place to keep in sync.

```ts
// src/components/epg/index.ts

/**
 * EPG components barrel.
 * Import from '@/components/epg' instead of individual files.
 */
export { default as EpgRow } from './EpgRow';
```

```ts
// src/hooks/index.ts

// Auth
export { useCheckToken } from './useCheckToken';

// Network
export { useNetworkReconnect } from './useNetworkReconnect';

// App lifecycle
export { useAppState } from './useAppState';
export { useOTA } from './useOTA';
```

---

## Comments

- JSDoc block at the top of every non-trivial file: the **why**, the contract, known edge cases.
- Inline `//` only for things a reader would otherwise have to discover the hard way: a hidden constraint, a subtle invariant, a platform-specific workaround.
- TODOs include initials + date: `// TODO(anx 2026-06-02): replace when API contract lands`.
- Never describe what the code does — the code does that.

---

## Commit Format

Conventional Commits.

```
feat(player): add fullscreen toggle
fix(auth): clear store on refresh failure
chore: bump expo to 56.0.1
refactor(store): extract PlayerSlice
```

Branch naming: `feat/<scope>-<short>`, `fix/<scope>-<short>`.

---

## Haptics

Haptic feedback follows the native mobile model: **the primitive owns it, callers configure intensity**. `useHaptic()` is called inside the component, not by the caller. It gates on `settings.hapticsEnabled` automatically — no per-call guard needed.

Three semantic families, used as intended:

| Method | When | Examples |
|--------|------|---------|
| `selection()` | Discrete value change | `Switch` toggle, `Checkbox`, `SegmentedToggle`, `FilterChipRow`, PIN backspace |
| `light()` / `medium()` | Physical-feeling input | PIN digit press (`light`), opt-in on `ReusableBtn` via `haptic` prop |
| `success()` / `warning()` / `error()` | Task outcome | PIN correct/wrong, mutation success/failure |

**`ReusableBtn` haptic prop** defaults to `'none'` — opt-in only. Use `haptic="medium"` on consequential CTAs (confirm, submit, destructive). Use `haptic="light"` for low-stakes actions that benefit from feedback. Never add haptics to navigation / cancel buttons.

**Guard pattern for selection components** (segmented, chips): extract a named `handleSelect` before the JSX — never inline a multi-statement `onPress`. Early-return on no-op (same value selected):

```tsx
const handleSelect = (next: T) => {
  if (next === value) return;
  haptics.selection();
  onChange(next);
};
// in JSX:
onPress={() => handleSelect(opt.value)}
```

---

## Things Worth Avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `../../../` deep relative imports | `@/` aliases |
| `enum` | String literal discriminated union |
| `any` | `unknown` + narrow, or a precise type |
| `Alert.alert` | `ModalSlice` + `ModalWrapper` |
| `console.log` in commits | Sentry breadcrumb or remove |
| Navigation guard in `useEffect` | `Stack.Protected` |
| `FullScreenLoader` gating a data screen | Skeleton strategy (see Loading States) |
| `useEffect` reacting to query `data`/`error` | Global `QueryCache`/`MutationCache` `onError` (`client.ts`); forms render 4xx inline + modal on 5xx/network via `meta: INLINE_CLIENT_ERROR` |
| Direct `expo-secure-store` calls | `lib/keychain.ts` wrapper |
| Context for theme | `useAppStore((s) => s.colors)` |
| Inline `StyleSheet` objects in JSX | `styles.xxx` from `StyleSheet.create()` |
| Magic numbers for spacing/font/radius | Token files (`SPACING`, `FONTSIZE`, `BORDERRADIUS`) |
| `React.memo` on non-list components | Memoize only in lists or high-frequency renders |
| Ad-hoc `setInterval` countdown in a component | `useCountdown` (`hooks/useCountdown.ts`) — deadline-based, background-aware (`proceedInBackground: false` to pause while backgrounded) |
| Multi-statement inline `onPress` (`() => { a(); b(); }`) | Extract a named handler before the JSX return — cleaner, nameable, testable |
| Calling `useHaptic()` at the call site | Haptics belong inside the primitive; callers only set `haptic` prop intensity |
| `useEffect` + `useSharedValue` + `withTiming` to drive an enter/exit animation | Declarative `entering`/`exiting` props (`AnimatedView`, e.g. `ZoomIn`/`ZoomOut`) — mount/unmount drives it automatically, no imperative timing or manual dismissal delay |
| Vertical list nested in a vertical `ScrollView`/list | One `FlashList`; secondary regions go in `ListHeaderComponent` (see Lists & Screen Composition) |
| Hardcoded `numColumns={2}` or per-screen `floor(width/target)` | `useResponsiveGrid()` from `@/responsive` (device class + orientation) |
| Hand-scaling a component's font/size for tablet | Scale at the token layer — `scaled()` wraps `FONTSIZE`/`SPACING`/primitive size tables once (`@/responsive`) |
| Single-column form/list/player stretching edge-to-edge on tablet | `useContentWidth(variant)` from `@/responsive` (centered cap on tablet/TV, no-op on phone) |
| Per-screen inline `LinearGradient` fade | `EdgeFade` (`components/Layout`) |
