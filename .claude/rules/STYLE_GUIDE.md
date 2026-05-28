# STYLE_GUIDE.md — RTSH-OTT

Coding conventions derived from prior project (SOLITAR). Read before writing components, hooks, or store code.

## Principles

- **One responsibility per file.** A component file exports one component (default). A hook file exports one hook. A slice file exports one slice + its type.
- **Reusable primitives prefixed with `Reusable`** (`ReusableBtn`, `ReusableInput`, `ReusableText`, `ReusableImage`). Generic design-system pieces only. Feature components keep their domain name (`ChannelCard`, `EpgRow`, `LivePlayer`).
- **Default export + barrel re-export.** Component files use `export default`; folder-level `index.ts` re-exports.
- **No layout/styling in shared components.** Position with margins comes from the parent; primitives manage their own internals only.
- **Read theme directly from the store.** `const colors = useAppStore((s) => s.colors)`. No `useTheme()` hook, no Context wrapper.
- **Async actions live inside slices.** No "thunk" pattern — slice methods are `async` when they touch I/O (keychain, MMKV, network).

## File naming

| Kind | Convention | Example |
|------|------------|---------|
| Component file | `PascalCase.tsx` | `ChannelCard.tsx` |
| Hook file | `useCamelCase.ts` | `useChannels.ts` |
| Store slice | `createXSlice.ts` | `createUserSlice.ts` |
| Service / util | `camelCase.ts` | `formatters.ts` |
| Type-only | `kebab-case.ts` or grouped in `types/` | `types/api.ts` |
| Route file | exact route name | `app/(tabs)/index.tsx`, `app/player/[id].tsx` |
| Folder | `PascalCase` for component groups, `lowercase` for domain | `Buttons/`, `Inputs/`, `Layout/`, `chat/`, `contacts/` |

## TypeScript

- `strict: true`. Path alias `@/*` rooted at project root.
- Props type defined **above** the component, named `XProps` or `TXProps`. Inline if trivial.
- `React.FC<Props>` for components (matches SOLITAR style).
- `as const` on lookup tables (`STORAGE_KEYS`, `BORDERRADIUS`, `FONTSIZE`).
- Discriminated unions over enums for state machines (`MessageStatus`, `PlayerStatus`).
- Never use `any`. `unknown` + narrow, or a precise type.

## Component template

```tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { Fonts, FONTSIZE } from '@/theme/fonts';
import { BORDERRADIUS } from '@/theme/borders';
import { useAppStore } from '@/store/useAppStore';

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
      {/* ... */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDERRADIUS.radius_12,
    padding: 12,
  },
});

export default ChannelCard;
```

Rules:
- JSDoc block at top of non-trivial files.
- StyleSheet always at the bottom of the file.
- `React.memo` only for components in lists or that re-render frequently. When memoized, set `displayName`.
- `activeOpacity`: `0.8` for buttons, `0.7` for text-as-button, `0.9` for images.
- `testID` on every interactive leaf — needed for Expo MCP automation.

## Store slice template

```ts
import { StateCreator } from 'zustand';

export interface ChannelsSlice {
  favorites: string[];
  recentlyWatched: string[];
  toggleFavorite: (channelId: string) => void;
  addRecentlyWatched: (channelId: string) => void;
}

export const createChannelsSlice: StateCreator<ChannelsSlice> = (set) => ({
  favorites: [],
  recentlyWatched: [],

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

Rules:
- Interface declares state + actions together.
- `set` is the only mutator; never expose raw `set` to components.
- Async actions: declare `async`, do I/O first, then `set`.
- Selectors live at call site: `useAppStore((s) => s.favorites)`. Avoid wrapping every read in a custom hook unless reused 3+ times.

## API service template

```ts
import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';
import type { Channel } from '@/types';

export const getChannels = async (): Promise<Channel[]> => {
  const res = await apiClient.get(CHANNELS_ROUTES);
  return res.data.channels;
};

export const getChannelById = async (id: string): Promise<Channel> => {
  const res = await apiClient.get(`${CHANNELS_ROUTES}/${id}`);
  return res.data.channel;
};
```

## Query hook template

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

Rules:
- Query keys: array, first element is the resource (`['channels']`, `['epg', date]`). No factory yet — add when 5+ keys per resource.
- Always return safe defaults (`data ?? []`) so consumers don't null-check on every render.

## Hook template

```ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Locks app when returning from 30s+ in background.
 * Uses timestamp check on resume (RN timers are throttled when suspended).
 */
export function useAppLock() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  const token = useAppStore((s) => s.token);
  const lockApp = useAppStore((s) => s.lockApp);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      // ...
    });
    return () => sub.remove();
  }, [token, lockApp]);
}
```

Rules:
- JSDoc explains WHY at the top.
- `useRef` for instance state that shouldn't trigger renders.
- Return a stable object shape — never conditionally omit keys.

## Imports order

1. React + RN core
2. Third-party libs
3. Blank line
4. `@/` internal imports grouped by layer: `theme/`, `store/`, `api/`, `hooks/`, `components/`, `utils/`, `types/`

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { getChannels } from '@/api/services/channels';
import ChannelCard from '@/components/Media/ChannelCard';
import { Fonts, FONTSIZE } from '@/theme/fonts';
```

## Folder structure

```
src/
  api/
    client.ts                   # axios + queryClient
    endpoints.ts                # route constants
    index.ts                    # big barrel
    services/                   # axios wrappers per domain
      auth.ts
      channels.ts
      epg.ts
      catchup.ts
      radio.ts
      streams.ts
      users.ts
      config.ts
    queries/                    # TanStack Query hooks
    mutations/                  # TanStack Mutation hooks
    mocks/                      # MSW handlers + fixtures
  app/                          # expo-router (thin)
    _layout.tsx
    unlock.tsx
    (auth)/
    (app)/
      _layout.tsx
      (tabs)/
        _layout.tsx
        index.tsx               # Live
        epg.tsx
        catchup.tsx
        radio.tsx
        profile.tsx
      player/[id].tsx
      channel/[id].tsx
      program/[id].tsx
  components/
    Buttons/
      ReusableBtn.tsx
      index.ts
    Inputs/
      ReusableInput.tsx
      ReusableText.tsx
      index.ts
    Layout/
      FullScreenLoader.tsx
      TabHeader.tsx
      OfflineBanner.tsx
      index.ts
    Media/
      ReusableImage.tsx
      VideoPlayer.tsx
      LivePlayer.tsx
      VodPlayer.tsx
      RadioPlayer.tsx
      PlayerControls.tsx
      index.ts
    channels/                   # feature components
    epg/
    catchup/
    radio/
    empty/                      # empty-state variants
    ModalWrapper.tsx
  config/
    auth.ts                     # AUTH_TOKEN_KEY, BIOMETRIC_KEY
    env.ts                      # zod-validated env
    permissions.ts
  constants/
    storage.ts                  # STORAGE_KEYS
    player.ts                   # SEEK_STEP_S, DEFAULT_QUALITY
  hooks/
    index.ts                    # barrel
    useAppState.ts
    useAppLock.ts
    useCheckToken.ts
    useOTA.ts
    useKeyboard.ts
    useOrientation.ts
    useNetworkReconnect.ts
    useNotifications.ts
    useHaptic.ts
  i18n/
    index.ts
    locales/
      sq.json
      en.json
  services/
    keychain.ts                 # expo-secure-store wrapper
    sentry.ts
    analytics.ts
    push.ts
  store/
    storage.ts                  # MMKV + zustandStorage adapter
    useAppStore.ts              # main store
    createUserSlice.ts
    createSettingsSlice.ts
    createThemeSlice.ts
    createPlayerSlice.ts
    createModalSlice.ts
    createChannelsSlice.ts
    createEpgSlice.ts
  theme/
    colors.ts                   # lightTheme + darkTheme
    fonts.ts                    # Fonts, FONTSIZE, FONTWEIGHT
    borders.ts                  # BORDERRADIUS
    spacing.ts                  # SPACING
  types/
    index.ts
    api.ts
    domain.ts
    theme.ts
  utils/
    index.ts
    formatters.ts               # formatProgramTime, formatDuration
    helpers.ts
    constants.ts
```

## Don'ts

- No relative `../../../` imports. Use `@/`.
- No magic numbers in component files. Pull from `BORDERRADIUS`, `FONTSIZE`, `SPACING`.
- No `useEffect` for navigation guards — use `Stack.Protected` (Expo Router v7).
- No raw strings in JSX. Use `t('namespace:key')` from `react-i18next`.
- No `localStorage` / `sessionStorage` — MMKV or SecureStore.
- No throwing inside `useEffect` cleanup. Catch and log.
- No `console.log` left in committed code. Use Sentry breadcrumb or remove.

## Comments

- JSDoc block at top of every file that's not trivial.
- Inline `//` only when the WHY is non-obvious. The WHAT is in the code.
- TODOs include initials + date: `// TODO(anx 2026-05-28): refactor when API contract lands`.

## Commit format

Conventional Commits: `feat(player): add fullscreen toggle`, `fix(auth): clear store on refresh failure`, `chore: bump expo to 55.0.1`.

Branches: `feat/<scope>-<short>`, `fix/<scope>-<short>`.
