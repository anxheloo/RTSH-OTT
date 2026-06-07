/**
 * Font families — **Inter only** (the designer HTML uses Inter 400–900 throughout;
 * Phase 22.2, 2026-06-06). Tokens are weight-named aliases over the loaded Inter
 * families so call sites stay weight-semantic (`Fonts.semiBold`) and a future
 * family swap is a single edit here. Loaded in `_layout.tsx` via `useFonts`
 * (@expo-google-fonts/inter). Anton + Outfit are retired (no longer loaded).
 *
 * Sub-400 weights (`thin`/`extraLight`/`light`) alias to 400 — the design never
 * goes below Regular, and nothing references them; kept for API stability.
 */
export const Fonts = {
  thin: 'Inter_400Regular',
  extraLight: 'Inter_400Regular',
  light: 'Inter_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  // display/heading — design headings are 800–900
  display: 'Inter_800ExtraBold',
  // captions / secondary
  caption: 'Inter_400Regular',
  captionMedium: 'Inter_500Medium',
} as const;

/** Type-safe font size scale — verified against Figma (2026-06-02) */
export const FONTSIZE = {
  xxs: 8,
  xs: 10,
  sm: 12,   // EPG description, caption
  regular: 14, // channel names, tab labels, EPG titles
  md: 16,   // inputs, buttons
  lg: 18,
  xl: 20,   // player channel title
  xxl: 22,
  title: 26,
  display: 32, // large hero titles
} as const;

export const FONTWEIGHT = {
  300: '300',
  400: '400',
  500: '500',
  600: '600',
  700: '700',
  900: '900',
} as const;
