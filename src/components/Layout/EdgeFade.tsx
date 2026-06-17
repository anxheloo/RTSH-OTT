/**
 * EdgeFade — a reusable gradient scrim that dissolves content into the
 * background along one edge of its parent, instead of clipping it hard. Drop it
 * as the last child of a `position: relative` container (a list wrapper, a card,
 * a scroll view) and it overlays that edge.
 *
 * Generic on purpose: any surface that wants a soft fade — a scrolling list's
 * top/bottom, a horizontal carousel's sides, an image overlay — reuses this
 * rather than hand-rolling a `LinearGradient`. Defaults to a top fade over the
 * theme background; `color` overrides the base when fading into a non-background
 * surface (e.g. a card).
 */
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';

type FadeEdge = 'top' | 'bottom' | 'left' | 'right';

export interface EdgeFadeProps {
  /** Which edge the solid color sits on; it fades to transparent inward. */
  edge?: FadeEdge;
  /** Thickness of the fade band (height for top/bottom, width for left/right). */
  size?: number;
  /** Base color the band fades from. Defaults to the theme background. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Gradient start/end per edge — solid color anchored on `edge`, transparent opposite. */
const DIRECTION: Record<FadeEdge, { start: { x: number; y: number }; end: { x: number; y: number } }> = {
  top: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  bottom: { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
  left: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  right: { start: { x: 1, y: 0 }, end: { x: 0, y: 0 } },
};

const EdgeFade: React.FC<EdgeFadeProps> = ({ edge = 'top', size = SPACING.space_48, color, style }) => {
  const background = useAppStore((s) => s.colors.background);
  const base = color ?? background;
  const { start, end } = DIRECTION[edge];

  const isHorizontal = edge === 'left' || edge === 'right';
  const band = isHorizontal ? { width: size } : { height: size };
  const anchor =
    edge === 'top'
      ? styles.top
      : edge === 'bottom'
        ? styles.bottom
        : edge === 'left'
          ? styles.left
          : styles.right;

  return (
    <LinearGradient
      colors={[base, `${base}B3`, `${base}00`]}
      locations={[0, 0.35, 1]}
      start={start}
      end={end}
      style={[styles.base, anchor, band, style]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
  },
  left: {
    top: 0,
    bottom: 0,
    left: 0,
  },
  right: {
    top: 0,
    bottom: 0,
    right: 0,
  },
});

export default EdgeFade;