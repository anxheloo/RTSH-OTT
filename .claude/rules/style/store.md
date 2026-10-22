---
paths:
  - "src/store/**"
  - "src/lib/**"
---

# Store and keychain — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## Store Slices

### Template

```ts
import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export interface ChannelsSlice {
  favorites: string[];
  recentlyWatched: string[];
  updateChannelsSlice: (state: Partial<ChannelsSlice>) => void;
  toggleFavorite: (channelId: string) => void;
  addRecentlyWatched: (channelId: string) => void;
}

export const createChannelsSlice: StateCreator<AppStore, [], [], ChannelsSlice> = (set) => ({
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

- **Type every slice creator as `StateCreator<AppStore, [], [], XSlice>`** — first generic is the full composed store (imported as `import type { AppStore } from './useAppStore'`), last is the slice's own shape. Do **not** self-type as `StateCreator<XSlice>`: it breaks composition under middleware (persist) and forces an `as any` cast in the store. The full-store form is the official Zustand "slices with middleware" pattern and keeps all slices uniform.
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

## Keychain

A three-function wrapper in `lib/keychain.ts` is the only way to interact with `expo-secure-store`. Nothing calls it directly.

```ts
export const storeOnKeychain = async (key: string, value: string): Promise<void> => { ... };
export const retrieveFromKeychain = async (key: string): Promise<string | null> => { ... };
export const removeFromKeychain = async (key: string): Promise<void> => { ... };
```

For the full data → storage matrix (with rationale), see `architecture/persistence-boundaries.md` — the single source of truth.

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| Direct `expo-secure-store` calls | `lib/keychain.ts` wrapper |
