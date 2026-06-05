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

export default ChannelCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDERRADIUS.radius_12,
    padding: SPACING.space_12,
  },
});
```

### Key points

- `StyleSheet.create()` lives at the **bottom**, after `export default`.
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
- Don't use `useEffect` to react to query `data`/`error` — use `onSuccess`/`onError` in mutation/query options.
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

## Keychain / Storage

A three-function wrapper in `services/keychain.ts` is the only way to interact with `expo-secure-store`. Nothing calls it directly.

```ts
export const storeOnKeychain = async (key: string, value: string): Promise<void> => { ... };
export const retrieveFromKeychain = async (key: string): Promise<string | null> => { ... };
export const removeFromKeychain = async (key: string): Promise<void> => { ... };
```

| Data | Storage |
|------|---------|
| Refresh token, parental PIN hash | Keychain (`expo-secure-store`) |
| User, settings, theme, favorites | MMKV (Zustand persist) |
| Access token | Memory only (Zustand, not persisted) |
| Resume positions | MMKV (separate key) |

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
`services/`, `store/`) rather than nesting under `utils/`.

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
export { useBootstrap } from './useBootstrap';

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

## Things Worth Avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `../../../` deep relative imports | `@/` aliases |
| `enum` | String literal discriminated union |
| `any` | `unknown` + narrow, or a precise type |
| `Alert.alert` | `ModalSlice` + `ModalWrapper` |
| `console.log` in commits | Sentry breadcrumb or remove |
| Navigation guard in `useEffect` | `Stack.Protected` |
| `useEffect` reacting to query `data`/`error` | `onSuccess`/`onError` in mutation options |
| Direct `expo-secure-store` calls | `services/keychain.ts` wrapper |
| Context for theme | `useAppStore((s) => s.colors)` |
| Inline `StyleSheet` objects in JSX | `styles.xxx` from `StyleSheet.create()` |
| Magic numbers for spacing/font/radius | Token files (`SPACING`, `FONTSIZE`, `BORDERRADIUS`) |
| `React.memo` on non-list components | Memoize only in lists or high-frequency renders |
