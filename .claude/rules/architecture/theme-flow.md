---
paths:
  - "src/theme/**"
  - "src/store/createThemeSlice.ts"
  - "src/hooks/useSystemTheme.ts"
  - "src/app/**/theme.tsx"
  - "docs/design/tokens.json"
---

# Theme flow

## How it works today (post 5.5a)

- **Token files:** `src/theme/{colors,fonts,borders,spacing}.ts`. `ThemeColors` interface + `lightTheme` / `darkTheme` objects (15 semantic tokens each — placeholder palette).
- **Slice:** `createThemeSlice` holds `mode: 'light' | 'dark' | 'system'` + full `colors` object. Components read `useAppStore((s) => s.colors)` directly — no Context, no ThemeProvider.
- **`'system'` resolution:** `resolveColors(mode)` consults `Appearance.getColorScheme()` for `'system'`. Called at:
  - Slice init (lazy default for `colors`).
  - `onRehydrateStorage` after MMKV rehydration.
  - `Appearance.addChangeListener` in `useSystemTheme` (mounted in `RootLayoutNav`) for runtime OS toggles.
- **Toggle:** `toggleTheme` cycles `system → light → dark → system`. Direct mode selection via `setTheme(mode)`.

## Why these choices

- **No ThemeProvider.** Zustand selector subscription is already O(1) and skips re-renders that don't touch `colors`. Adding a Context provider would duplicate that mechanism.
- **Full `colors` object on the slice (not just `mode`).** Lets components access `s.colors.background` directly without going through a derived selector. Toggle swaps the object reference, triggering re-renders only for subscribers that read `colors`.
- **`Appearance.addChangeListener` lives in `useSystemTheme`.** A dedicated single-purpose hook, mounted once in `RootLayoutNav`, with cleanup. The slice can't subscribe to RN APIs without coupling the store to platform.

## Known gaps

- Missing semantic tokens (`overlay`, `disabled`, `onSurface`, `link`, `focus`, `skeleton`) — **5.X.6**.
- Missing `SHADOWS`, `OPACITY`, `Z_INDEX`, `ANIMATION` token files — **5.X.7**.
- `BORDERRADIUS` missing `pill`, `full`, `none` — **5.X.7**.
- `SPACING.space_2`, `space_10`, `space_15`, `space_18` off the 4px grid — **5.X.8**. **Corrected 2026-08-08** (counted from `spacing.ts`, not from this note): this previously read "`space_10` + `space_28`", but **`space_28` is `4x7` — on-grid** and never belonged on the list, while `space_2`, `space_15` and `space_18` were missing from it. `space_10` is the expensive one to change: it *is* `SCREEN_PADDING`, the single horizontal inset every route uses, so retrofitting it is a diff across every screen — which is the real reason this item has aged.
- ~~Current `lightTheme` / `darkTheme` values are reasonable defaults but will need full replacement when design lands.~~ **Stale — design landed.** The palette in `colors.ts` came from the designer HTML (2026-06-06, Phase 22.1); it is no longer a placeholder set. Since 2026-08-08 it also has a machine-readable form at **`docs/design/tokens.json`**, reverse-derived from `theme/{colors,spacing,borders,fonts}.ts` so the two cannot drift. One value in it is deliberately still wrong — see **→ Android TV / STB → Known gaps** (`colors.focus` === `colors.primary`).

---
