/**
 * Spacing scale — 4px base grid, scaled per device class via `scaled()` so
 * whitespace grows a step on tablet/TV (phone factor is 1 → identical values).
 * Apply scaling here at the token source. See `responsive/scale.ts`.
 *
 * Off-grid, design-verified values:
 *   space_10 — channel card inner padding (Figma 2026-06-02)
 *   space_15 — legacy screen gutter (Figma 2026-06-02) — superseded by SCREEN_PADDING
 *   space_18 — legacy screen gutter (designer HTML 2026-06-06) — superseded by SCREEN_PADDING
 */
import { scaled } from '@/responsive';

export const SPACING = {
  space_2: scaled(2),
  space_4: scaled(4),
  space_8: scaled(8),
  space_10: scaled(10),
  space_12: scaled(12),
  space_15: scaled(15),
  space_16: scaled(16),
  space_18: scaled(18),
  space_20: scaled(20),
  space_24: scaled(24),
  space_28: scaled(28),
  space_32: scaled(32),
  space_40: scaled(40),
  space_48: scaled(48),
  space_56: scaled(56),
  space_64: scaled(64),
} as const;

/**
 * Screen horizontal padding — the single edge inset every route uses
 * (headers, list content, section rows). One knob: change it here, the whole
 * app follows (decision 2026-06-11).
 */
export const SCREEN_PADDING = SPACING.space_10;
