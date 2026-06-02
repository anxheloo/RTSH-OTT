/**
 * Font families loaded in _layout.tsx via useFonts.
 * Anton — display/heading (channel names, titles, EPG headers)
 * Outfit — UI body text (settings, profile, misc)
 * Inter  — secondary/caption text (EPG descriptions, subtitles)
 * System — form inputs (SF Pro on iOS, Roboto on Android — no loading needed)
 */
export const Fonts = {
  // Anton (display)
  display: 'Anton_400Regular',
  // Outfit (body)
  light: 'OutfitLight',
  regular: 'OutfitRegular',
  medium: 'OutfitMedium',
  bold: 'OutfitBold',
  semiBold: 'OutfitSemiBold',
  extraLight: 'OutfitExtraLight',
  extraBold: 'OutfitExtraBold',
  thin: 'OutfitThin',
  black: 'OutfitBlack',
  // Inter (captions / secondary)
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
