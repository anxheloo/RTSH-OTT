/** Border radius scale — verified against Figma (2026-06-02) */
export const BORDERRADIUS = {
  none: 0,
  card: 5,       // channel card corners (Figma: 5px)
  radius_8: 8,
  radius_12: 12,
  radius_14: 14,
  pill_sm: 30,   // tab toggle (Figma: 30px)
  pill: 32,      // inputs and buttons (Figma: 32px)
  full: 9999,    // circle avatars / badges
} as const;
