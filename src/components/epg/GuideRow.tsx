/**
 * GuideRow — one channel/station "now & next" row for the Guide (design
 * `.gitem`): a scene tile (`.gch`) with a short logo/icon, the current programme
 * + a "Vijon …" next line + a progress bar (`.gmeta`), and a red time/LIVE badge
 * (`.gt`). Reusable for TV and Radio (pass `leading` to swap the tile content).
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';

export interface GuideRowProps {
  /** Used for the row testID (e.g. "RTSH"); no longer rendered on the tile. */
  logoLabel: string;
  thumbnailUrl?: string;
  /** Currently-airing programme title. */
  nowTitle: string;
  /** Composed next line, e.g. "Vijon 20:00: Magazina". */
  nextLabel: string;
  /** Elapsed fraction 0–1 of the current programme. Hides the bar when omitted. */
  progress?: number;
  /** Red trailing badge — the now start time (TV) or "LIVE" (radio). */
  badge: string;
  /** Overrides the tile content (e.g. a radio glyph) instead of `logoLabel`. */
  leading?: React.ReactNode;
  onPress: () => void;
}

const GuideRow: React.FC<GuideRowProps> = ({
  logoLabel,
  thumbnailUrl,
  nowTitle,
  nextLabel,
  progress,
  badge,
  leading,
  onPress,
}) => {
  const colors = useAppStore((s) => s.colors);
  const pct =
    progress === undefined
      ? undefined
      : (`${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` as const);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`guide-row-${logoLabel}`}
    >
      <View style={styles.tile}>
        <SceneBackground source={thumbnailUrl} />
        {leading}
      </View>

      <View style={styles.meta}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor="text" numberOfLines={1}>
          {nowTitle}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1} style={styles.next}>
          {nextLabel}
        </ReusableText>
        {pct !== undefined ? (
          <View style={[styles.pgTrack, { backgroundColor: colors.surfaceHigh }]}>
            <View style={[styles.pgFill, { width: pct, backgroundColor: colors.primary }]} />
          </View>
        ) : null}
      </View>

      <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" themeColor="primary" style={styles.badge}>
        {badge}
      </ReusableText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tile: {
    width: 46,
    height: 46,
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  next: {
    marginTop: 3,
  },
  pgTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 7,
    overflow: 'hidden',
  },
  pgFill: {
    height: '100%',
    borderRadius: 2,
  },
  badge: {
    flexShrink: 0,
  },
});

export default GuideRow;
