/**
 * Navigation helpers.
 *
 * `getModalScreenOptions` is the single source of truth for our route-based
 * sheets (decision 7 — native sheets, not `@gorhom`). It returns Expo Router
 * `Stack.Screen` options that present a route as a content-sized form sheet with
 * a grabber and rounded top corners. Tune per sheet via `detents` /
 * `cornerRadius`; defaults suit small option/quality sheets.
 */
import { BORDERRADIUS } from '@/theme/borders';

export interface ModalScreenOptionsConfig {
  /** Sheet detents — fractions of the screen, or 'fitToContents' (default). */
  detents?: number[] | 'fitToContents';
  /** Top corner radius (design sheets: 20–24). */
  cornerRadius?: number;
}

export function getModalScreenOptions({
  detents = 'fitToContents',
  cornerRadius = BORDERRADIUS.radius_20,
}: ModalScreenOptionsConfig = {}) {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: cornerRadius,
    headerShown: false,
  } as const;
}
