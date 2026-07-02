/**
 * Brand top-bar geometry — the mirror of `theme/tabBar.ts` for the top edge.
 *
 * `BRAND_HEADER_BASE_HEIGHT` is the header content height ABOVE the top
 * safe-area inset. The final bar height is `BRAND_HEADER_BASE_HEIGHT +
 * insets.top`, so the frosted bar clears the status bar / notch.
 *
 * `BrandHeader` is `position: absolute`, so screens pad their scroll content top
 * by `useBrandHeaderHeight()` — the bar height PLUS `BRAND_HEADER_CONTENT_GAP`,
 * so the first item clears the frosted bar with a little breathing room instead
 * of sitting flush under it.
 */
export const BRAND_HEADER_BASE_HEIGHT = 73;

/** Extra space below the bar before scroll content begins. */
export const BRAND_HEADER_CONTENT_GAP = 10;
