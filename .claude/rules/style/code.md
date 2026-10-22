---
paths:
  - "src/**"
  - "app.config.ts"
  - "plugins/**"
  - "scripts/**"
---

# Code structure (all source) — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## In-File Ordering

Every file reads top-to-bottom in the same predictable order. This is the single rule that
keeps 200+ files feeling like one author wrote them. Two principles govern it:

1. **Fixed skeleton.** The top-level shape of a file (imports → module constants → component/hook → exports → styles) never varies.
2. **Cluster by concern, not by keyword.** *Inside* a component or hook, keep everything for one concern together — the selector, derived value, effect, and callback for "quality" sit as a labelled block, rather than scattering all `useState`s at the top and all `useEffect`s at the bottom. Concern-clustering beats mechanical grouping for readability; the section order below is the default skeleton, not a mandate to split a cohesive block apart.

### File skeleton (all files)

1. **File-level JSDoc** — the *why* / contract / known edge cases (every non-trivial file).
2. **Imports** — in the order defined in [Import Order](../STYLE_GUIDE.md#import-order).
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

`refs → state → derived → callbacks → effects/listeners → return`. The return shape is **stable** (never conditionally omit keys). JSDoc explains the *why*. See the [Hooks template](hooks.md#template).

### Slice body order

`state fields → updateXSlice (universal setter) → named domain actions`. Group the interface the same way: fields first, `updateXSlice`, then actions. Do I/O before `set` in async actions. See the [Store Slices template](store.md#template).

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

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `../../../` deep relative imports | `@/` aliases |
| `enum` | String literal discriminated union |
| `any` | `unknown` + narrow, or a precise type |
| `console.log` in commits | Sentry breadcrumb or remove |
| Inline `StyleSheet` objects in JSX | `styles.xxx` from `StyleSheet.create()` |
| Magic numbers for spacing/font/radius | Token files (`SPACING`, `FONTSIZE`, `BORDERRADIUS`) |
| `React.memo` on non-list components | Memoize only in lists or high-frequency renders |
| Multi-statement inline `onPress` (`() => { a(); b(); }`) | Extract a named handler before the JSX return — cleaner, nameable, testable |
| `WebBrowser.openBrowserAsync(url)` at a call site | `openLink(url)` (`@/utils/openLink`). Custom Tabs launches whatever app claims the browser role, and on an Android TV box that is often a video player whose web activity is not exported — the SecurityException is thrown natively inside expo-web-browser's `BrowserProxyActivity.onCreate`, so **no JS `try`/`catch` at the call site can prevent the crash** (REACT-NATIVE-RTSH-OTT-M, a real production crash). `openLink` keeps the in-app browser off-TV and uses `Linking` on TV, where a missing browser rejects instead of crashing. |
