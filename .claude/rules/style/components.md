---
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/hooks/useHaptic.ts"
  - "src/theme/**"
---

# Components — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

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
- **Accessibility on every interactive leaf** (2026-07-03): `accessibilityRole`
  (`button`/`link`), an `accessibilityLabel` when the visual content isn't plain
  text (icon-only buttons, image rows, composed labels), and `accessibilityState`
  for `selected`/`disabled`. Rows whose children are plain text still need the role.
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

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| Context for theme | `useAppStore((s) => s.colors)` |
| Calling `useHaptic()` at the call site | Haptics belong inside the primitive; callers only set `haptic` prop intensity |
| `useEffect` + `useSharedValue` + `withTiming` to drive an enter/exit animation | Declarative `entering`/`exiting` props (`AnimatedView`, e.g. `ZoomIn`/`ZoomOut`) — mount/unmount drives it automatically, no imperative timing or manual dismissal delay |
