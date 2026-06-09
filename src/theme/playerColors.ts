/**
 * Player chrome palette — intentionally theme-independent.
 *
 * The video surface is always dark (white text + RTSH red on black) regardless
 * of the app's light/dark mode, so player controls do NOT read the theme. These
 * constants give that chrome a single source of truth instead of scattering hex
 * + rgba literals across the media components. `brand` mirrors the theme
 * `primary` value but is kept separate on purpose — the player must stay dark
 * even when the app is in light mode.
 */
export const PLAYER_COLORS = {
  /** Player background (behind the video). */
  surface: '#000000',
  /** Primary text / icons on the video surface. */
  onSurface: '#FFFFFF',
  /** Secondary text (e.g. program subtitle). */
  onSurfaceDim: 'rgba(255,255,255,0.7)',
  /** Tertiary text (e.g. time labels). */
  onSurfaceMuted: 'rgba(255,255,255,0.8)',
  /** RTSH red — live badge, seek fill, accents. */
  brand: '#EB122F',
  /** Top / bottom control strips. */
  scrim: 'rgba(0,0,0,0.5)',
  /** Full-bleed error overlay. */
  scrimStrong: 'rgba(0,0,0,0.85)',
  /** Translucent control surface (e.g. play button). */
  controlBg: 'rgba(255,255,255,0.15)',
  /** Glass chrome buttons over the video (design `.iconbtn.glass`). */
  glass: 'rgba(0,0,0,0.4)',
  /** Seek-bar track (unfilled). */
  track: 'rgba(255,255,255,0.3)',
  /** Knob glow ring (design `box-shadow` around the seek knob). */
  knobGlow: 'rgba(235,18,47,0.3)',
} as const;
