# STYLE_GUIDE.md — RTSH-OTT

> **Scope: project-specific.** This guide names concrete RTSH-OTT components, modules, and files. For the **portable, project-agnostic principles** behind these conventions — reusable on any Expo/RN project — see [`STANDARDS.md`](./STANDARDS.md).

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
`lib/`, `store/`) rather than nesting under `utils/`. **`lib/`** holds
platform/security infra (keychain wrapper, token vault, native module wrappers) —
keep it distinct from **`api/services/`** (domain API calls). Never have two
folders named `services/`; the collision confuses every newcomer.

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

## Scoped conventions

The rest of this guide lives in `rules/style/`, one file per area. Each loads when you read or edit
a file its `paths:` names; before writing code in an area, open its file.

- `style/code.md` — in-file ordering, TypeScript, general things to avoid (all of `src/`)
- `style/components.md` — component template, `activeOpacity`, `React.memo`, haptics
- `style/store.md` — Zustand slice template, imperative access, the keychain wrapper
- `style/hooks.md` — hook template and rules
- `style/api.md` — endpoints, services, query/mutation hooks, error routing, zod schemas
- `style/navigation-and-modals.md` — Expo Router conventions, the modal system and its native-presentation traps
- `style/screens-and-lists.md` — skeleton loading states, list composition, FlashList traps, responsive sizing
- `style/tv.md` — D-pad focus rings, focus zones, nested-focusable traps, TV auto-hide, no endless animations
