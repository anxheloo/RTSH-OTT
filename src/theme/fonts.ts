/**
 * Font families — **Inter only** (the designer HTML uses Inter 400–900 throughout;
 * Phase 22.2, 2026-06-06). Tokens are weight-named aliases over the loaded Inter
 * families so call sites stay weight-semantic (`Fonts.semiBold`) and a future
 * family swap is a single edit here. Loaded in `_layout.tsx` via `useFonts`
 * (@expo-google-fonts/inter). Anton + Outfit are retired (no longer loaded).
 *
 * Sub-400 weights (`thin`/`extraLight`/`light`) alias to 400 — the design never
 * goes below Regular, and nothing references them; kept for API stability.
 *
 * `FONTSIZE` values pass through `scaled()` so type ramps up a step on tablet/TV
 * (phone factor is 1 → identical to the Figma values). Apply scaling here at the
 * token source, not at call sites. See `responsive/scale.ts`.
 */
import { scaled } from '@/responsive';
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

/** Type-safe font size scale — verified against Figma (2026-06-02), scaled per device class. */
export const FONTSIZE = {
  xxs: scaled(8),
  xs: scaled(10),
  sm: scaled(12), // EPG description, caption
  regular: scaled(14), // channel names, tab labels, EPG titles
  md: scaled(16), // inputs, buttons
  lg: scaled(18),
  xl: scaled(20), // player channel title
  xxl: scaled(22),
  title: scaled(26),
  display: scaled(32), // large hero titles
} as const;

export const FONTWEIGHT = {
  300: '300',
  400: '400',
  500: '500',
  600: '600',
  700: '700',
  900: '900',
} as const;
