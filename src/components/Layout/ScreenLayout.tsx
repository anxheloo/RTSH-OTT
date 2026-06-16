/**
 * Top-level screen container — themed background + flex + opt-in safe-area
 * edges. Replaces the repeated `<View style={{ flex: 1, backgroundColor }}>`
 * boilerplate at the root of every app screen. Mirrors Bunk-Art's
 * `MainLayout` / `ContentLayout`, adapted to our theme store.
 *
 * Edges default to `[]`:
 *   - Tab screens pass nothing — `TabHeader` handles the top inset and the
 *     bottom tab bar handles the bottom.
 *   - Full-screen routes (players, modals with no tab bar) pass the edges they
 *     need, e.g. `edges={['bottom']}` or `['top', 'bottom']`.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  /** Safe-area edges to inset. Default `[]` (no insets). */
  edges?: readonly Edge[];
  /** Theme background token. Default `'background'`. */
  backgroundColor?: keyof ThemeColors;
  testID?: string;
}

const EMPTY_EDGES: readonly Edge[] = [];

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  edges = EMPTY_EDGES,
  backgroundColor = 'background',
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors[backgroundColor] }]}
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
