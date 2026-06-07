/** Border radius scale — verified against Figma (2026-06-02) */
export const BORDERRADIUS = {
  none: 0,
  card: 5,       // channel card corners (Figma: 5px)
  radius_8: 8,
  radius_12: 12,
  radius_14: 14, // cards / inputs / sheet corners (design 2026-06-06)
  radius_20: 20, // chips / segmented inner pills (design 20px)
  pill_input: 24, // search / segmented toggle / pill inputs (design 24px)
  button: 27,    // primary button capsule, h54 (design 27px)
  pill_sm: 30,   // legacy tab toggle (Figma 2026-06-02) — superseded by pill_input as screens migrate
  pill: 32,      // legacy inputs/buttons (Figma 2026-06-02) — superseded by pill_input/button
  full: 9999,    // circle avatars / badges
} as const;
