/**
 * Spacing scale — 4px base grid.
 * Off-grid, design-verified values:
 *   space_10 — channel card inner padding (Figma 2026-06-02)
 *   space_15 — legacy screen gutter (Figma 2026-06-02) — superseded by SCREEN_PADDING
 *   space_18 — legacy screen gutter (designer HTML 2026-06-06) — superseded by SCREEN_PADDING
 */
export const SPACING = {
  space_2: 2,
  space_4: 4,
  space_8: 8,
  space_10: 10,
  space_12: 12,
  space_15: 15,
  space_16: 16,
  space_18: 18,
  space_20: 20,
  space_24: 24,
  space_28: 28,
  space_32: 32,
  space_40: 40,
  space_48: 48,
  space_56: 56,
  space_64: 64,
} as const;

/**
 * Screen horizontal padding — the single edge inset every route uses
 * (headers, list content, section rows). One knob: change it here, the whole
 * app follows (decision 2026-06-11).
 */
export const SCREEN_PADDING = SPACING.space_10;
