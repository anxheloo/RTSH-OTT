/**
 * Top-level screen container — themed background + flex + opt-in safe-area
 * edges. Replaces the repeated `<View style={{ flex: 1, backgroundColor }}>`
 * boilerplate at the root of every app screen. Mirrors Bunk-Art's
 * `MainLayout` / `ContentLayout`, adapted to our theme store.
 *
 * Edges default to `['left', 'right']`:
 *   - Horizontal insets are on by default because iPhone Duo puts the status bar
 *     (and the Dynamic Island) in an 84pt vertical rail on the left or right edge,
 *     and Split View moves it to either side. Every iPhone in portrait reports
 *     0 there, so phones are unchanged. Absolutely positioned children (the
 *     frosted `BrandHeader`) still span the full width, so their background runs
 *     under the rail while their content pads itself clear of it.
 *   - Tab screens pass nothing — `TabHeader` handles the top inset and the
 *     bottom tab bar handles the bottom.
 *   - Full-screen routes (players, modals with no tab bar) pass the edges they
 *     need, e.g. `edges={['bottom', 'left', 'right']}`.
 */
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  /** Safe-area edges to inset. Default `['left', 'right']` (clear of the iPhone Duo rail). */
  edges?: readonly Edge[];
  /** Theme background token. Default `'background'`. */
  backgroundColor?: keyof ThemeColors;
  /**
   * Extra style for the root container, merged AFTER `flex: 1` + background.
   *
   * Exists so a screen can change its own root's `flexDirection` (portrait
   * column → landscape row on a tablet) WITHOUT wrapping its children in an
   * extra `<View>`. That matters on the player: an added or removed wrapper is a
   * tree change, and a tree change across a rotation remounts the `VideoView`,
   * restarting playback and losing the live edge. A style swap on an existing
   * node does not.
   */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HORIZONTAL_EDGES: readonly Edge[] = ['left', 'right'];

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  edges = HORIZONTAL_EDGES,
  backgroundColor = 'background',
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors[backgroundColor] }, style]}
      testID={testID}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

export default ScreenLayout;
