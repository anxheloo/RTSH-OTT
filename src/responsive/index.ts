/**
 * Responsive module — portable, self-contained (react + react-native only).
 * Import from '@/responsive' instead of individual files.
 *
 * - Config:   breakpoints (GRID_COLUMNS, UI_SCALE, TABLET_MIN_SHORTEST_SIDE)
 * - Classify: getDeviceClass (pure), useResponsive (reactive)
 * - Grid:     useResponsiveGrid → numColumns
 * - Scale:    scaled() → device-class step multiplier for design tokens
 */
export { GRID_COLUMNS, TABLET_MIN_SHORTEST_SIDE, UI_SCALE } from './breakpoints';
export { type DeviceClass,getDeviceClass } from './deviceClass';
export { scaled, UI_SCALE_FACTOR } from './scale';
export { type ResponsiveInfo,useResponsive } from './useResponsive';
export { useResponsiveGrid } from './useResponsiveGrid';
