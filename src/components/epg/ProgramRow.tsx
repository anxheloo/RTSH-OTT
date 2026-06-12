/**
 * ProgramRow — a programme list row with a play affordance (design `.prog`): a
 * play glyph, a bold title, a muted meta line, and an optional right-aligned
 * time. Three states drive the look:
 *  - `now`       — airing/selectable: red play glyph, bright title (default).
 *  - `recorded`  — past/catch-up: muted play glyph, dimmed title.
 *  - `scheduled` — upcoming today: no play glyph, dimmed title (info only).
 *
 * Used by Search results (`now`) and the player's EPG/catch-up list.
 * Presentational — the parent composes `meta`/`time` and supplies `onPress`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { PlayIcon } from '@/assets/icons';

export type ProgramRowState = 'now' | 'recorded' | 'scheduled';

export interface ProgramRowProps {
  title: string;
  /** Pre-composed secondary line, e.g. "RTSH Sport HD · 21:30" or a description. */
  meta: string;
  /** Optional right-aligned time (design `.prog time`). */
  time?: string;
  /** Visual + interaction state. Default `'now'`. */
  state?: ProgramRowState;
  onPress: () => void;
  testID?: string;
}

const PLAY_SLOT = 24;

const ProgramRow: React.FC<ProgramRowProps> = ({
  title,
  meta,
  time,
  state = 'now',
  onPress,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  const isDim = state !== 'now';
  const titleColor = isDim ? 'textMuted' : 'text';
  const playColor = state === 'recorded' ? colors.mutedDim : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.playSlot}>
        {state === 'scheduled' ? null : <Icon as={PlayIcon} size={PLAY_SLOT} color={playColor} />}
      </View>

      <View style={styles.meta}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor={titleColor} numberOfLines={1}>
          {title}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1} style={styles.sub}>
          {meta}
        </ReusableText>
      </View>

      {time ? (
        <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" themeColor={titleColor} style={styles.time}>
          {time}
        </ReusableText>
      ) : null}
    </TouchableOpacity>
  );
};

export default ProgramRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playSlot: {
    width: PLAY_SLOT,
    marginTop: 1,
  },
  meta: {
    flex: 1,
  },
  sub: {
    marginTop: 2,
  },
  time: {
    flexShrink: 0,
    marginTop: 1,
  },
});
