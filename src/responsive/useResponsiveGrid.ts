/**
 * Resolves the number of grid columns for the current device class + orientation
 * from the `GRID_COLUMNS` config. Reactive (rotation / split-view aware).
 *
 * Drive a grid's `numColumns` with this. Because FlashList/FlatList can't change
 * `numColumns` in place, also re-key the list on the returned value.
 */
import { GRID_COLUMNS } from './breakpoints';
import { useResponsive } from './useResponsive';

export const useResponsiveGrid = (): number => {
  const { deviceClass, isLandscape } = useResponsive();
  return GRID_COLUMNS[deviceClass][isLandscape ? 'landscape' : 'portrait'];
};
