/**
 * Responsive configuration — the ONLY file you tune per project.
 *
 * This whole `responsive/` folder is a self-contained, portable module: it
 * depends only on `react` + `react-native` (no store, theme, or API coupling),
 * so it can be copy-pasted into another app and wired up by editing this file.
 *
 * Two concerns, intentionally separate (industry standard — see the module
 * JSDoc in `useResponsive.ts` / `scale.ts`):
 *   1. GRID_COLUMNS — how many columns a grid shows, by device class + orientation.
 *   2. UI_SCALE     — a discrete per-device-class STEP multiplier for typography /
 *                     spacing / control sizes. NOT a continuous function of width:
 *                     linearly scaling every view turns a tablet into a blown-up
 *                     phone, defeating the point of the bigger screen.
 */

/**
 * A device is "tablet-sized" when its SHORTEST side is ≥ this many dp. The
 * shortest side (`Math.min(width, height)`) is orientation-independent — it
 * doesn't change when the device rotates — so a phone in landscape is never
 * mistaken for a tablet in portrait. This mirrors Android's `sw600dp` qualifier.
 */
export const TABLET_MIN_SHORTEST_SIDE = 600;

/** Grid columns per device class + orientation. TVs are always landscape. */
export const GRID_COLUMNS = {
  phone: { portrait: 2, landscape: 2 },
  tablet: { portrait: 3, landscape: 4 },
  tv: { portrait: 4, landscape: 4 },
} as const;

/**
 * Per-device-class UI scale step. `phone: 1` is the design baseline, so phones
 * render byte-for-byte identically to today (scaled(n) === n). Bigger screens
 * bump tokens a single step — readable, not stretched.
 */
export const UI_SCALE = {
  phone: 1,
  tablet: 1.15,
  tv: 1.3,
} as const;
