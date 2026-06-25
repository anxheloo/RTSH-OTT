/**
 * ProgramRow — a programme list row with a play affordance (design `.prog`): a
 * play glyph, a bold title, a muted meta line, and an optional right-aligned
 * time. Three states drive the look:
 *  - `now`       — airing/selectable: red play glyph, bright title (default).
 *  - `recorded`  — past/catch-up: pale (mutedDim) play glyph, bright title (playable).
 *  - `scheduled` — upcoming/future: no play glyph, dimmed title (info only).
 *
 * Two additive overlays sit on top of `state`, both driven by the channel
 * screen so the list reflects the player:
 *  - `isPlaying`  — this programme is the one loaded in the player right now.
 *    Its play glyph is replaced by the animated `Equalizer` (the same bars the
 *    radio now-playing uses) so the user sees *what* is playing.
 *  - `isLiveNow`  — this programme is airing live now. A red LIVE pill replaces
 *    the `time` so the user can spot it and tap to jump back to live.
 * When watching live the airing row is both (equalizer + LIVE pill).
 *
 * Used by Search results (`now`) and the player's EPG/catch-up list.
 * Presentational — the parent composes `meta`/`time` and supplies `onPress`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BlurView } from 'expo-blur';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { Equalizer } from '@/components/radio';
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
  /** This programme is loaded in the player now — swaps the glyph for the equalizer. */
  isPlaying?: boolean;
  /** This programme is airing live now — shows a LIVE pill in place of the time. */
  isLiveNow?: boolean;
  onPress: () => void;
  testID?: string;
}

const PLAY_SLOT = 24;

const ProgramRow: React.FC<ProgramRowProps> = ({
  title,
  meta,
  time,
  state = 'now',
  isPlaying = false,
  isLiveNow = false,
  onPress,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  // Only future/scheduled rows read as pale + passive; past (recorded) is a
  // playable catch-up item, so it gets a bright title + neutral play glyph.
  const titleColor = state === 'scheduled' ? 'textMuted' : 'text';
  const playColor = state === 'recorded' ? colors.mutedDim : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={state === 'scheduled'}
      testID={testID}
    >
      <View style={styles.playSlot}>
        {isPlaying ? (
          <Equalizer barCount={4} height={20} barWidth={3} testID="prog-now-playing" />
        ) : state === 'scheduled' ? null : (
          <Icon as={PlayIcon} size={PLAY_SLOT} color={playColor} />
        )}
      </View>

      <View style={styles.meta}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor={titleColor} numberOfLines={1}>
          {title}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1} style={styles.sub}>
          {meta}
        </ReusableText>
      </View>

      {isLiveNow ? (
        <View style={[styles.liveChip, { backgroundColor: colors.primary }]} testID="prog-live-badge">
          <View style={styles.liveDot} />
          <ReusableText fontSize={FONTSIZE.xs} fontWeight="bold" themeColor="onPrimary">
            LIVE
          </ReusableText>
        </View>
      ) : time ? (
        <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" themeColor={titleColor} style={styles.time}>
          {time}
        </ReusableText>
      ) : null}

      {state === 'scheduled' ? (
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
    </TouchableOpacity>
  );
};

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
  liveChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});

export default ProgramRow;
