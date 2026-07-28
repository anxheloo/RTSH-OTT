/**
 * ProgramRow — a programme list row with a play affordance (design `.prog`): a
 * play glyph, a bold title, a muted meta line, and an optional right-aligned
 * time. Three states drive the look:
 *  - `now`       — airing/selectable: red play glyph, bright title (default).
 *  - `recorded`  — past/catch-up: pale (mutedDim) play glyph, bright title (playable).
 *  - `scheduled` — upcoming/future: no play glyph, dimmed title (info only).
 *    On Android a frosted `BlurView` reinforces the passive state; on iOS that
 *    same overlay renders as a heavy real blur, so iOS relies on the dimmed
 *    (textMuted) + non-clickable row alone — the user can still read what's next.
 *
 * Two additive overlays sit on top of `state`, both driven by the channel
 * screen so the list reflects the player:
 *  - `isPlaying`  — this programme is the one loaded in the player right now.
 *    Its play glyph turns red (`primary`); every other playable row (live or
 *    past) keeps a neutral (mutedDim) play glyph, so the red glyph marks *what*
 *    is playing.
 *  - `isLiveNow`  — this programme is airing live now. A red LIVE pill replaces
 *    the `time` so the user can spot it and tap to jump back to live.
 * When watching live the airing row is both (red play glyph + LIVE pill).
 *
 * `ageRating` adds a compact `12+` pill beside the title. It is INFORMATIONAL —
 * an unrated programme (no value) simply renders no pill, and the pill never
 * gates playback; the parental gate keys off `isAdult` (see `useParentalGuard`).
 *
 * Passing `onToggleExpand` turns the row into an EXPANDER: `meta` (the
 * programme description) un-clamps from one line to its full height, and the
 * press targets split — the row body toggles, the play glyph becomes the only
 * thing that starts playback. A future (`scheduled`) row is therefore readable
 * without being playable. `expanded` is owned by the parent (one id → one open
 * row); this component never holds it.
 *
 * On TV that split is inverted deliberately: a focusable play button inside a
 * focusable row traps the D-pad (STYLE_GUIDE → TV), so there the glyph stays
 * inert, row press still plays, and the parent expands the row from `onFocus`.
 * Focus is unique, so "one open row" holds on both platforms from one field.
 *
 * Used by Search results (`now`) and the player's EPG/catch-up list.
 * Presentational — the parent composes `meta`/`time` and supplies `onPress`.
 */
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { BlurView } from 'expo-blur';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ChevronRightIcon, PlayIcon } from '@/assets/icons';
import { isTV, useTVFocus } from '@/tv';

export type ProgramRowState = 'now' | 'recorded' | 'scheduled';

export interface ProgramRowProps {
  title: string;
  /** Pre-composed secondary line, e.g. "RTSH Sport HD · 21:30" or a description. */
  meta: string;
  /** Optional right-aligned time (design `.prog time`). */
  time?: string;
  /**
   * Minimum viewer age (`EpgItem.ageRating`). Renders a compact `12+` pill next
   * to the title; omit/`undefined` for an unrated programme → no pill at all.
   * Informational only — it never changes what the row can play (the parental
   * gate keys off `isAdult`, not this).
   */
  ageRating?: number;
  /** Visual + interaction state. Default `'now'`. */
  state?: ProgramRowState;
  /** This programme is loaded in the player now — swaps the glyph for the equalizer. */
  isPlaying?: boolean;
  /** This programme is airing live now — shows a LIVE pill in place of the time. */
  isLiveNow?: boolean;
  /** Starts playback. Fired by the play glyph when expandable, by the whole row otherwise. */
  onPress: () => void;
  /**
   * Presence makes the row expandable: the body toggles `meta` between one line
   * and full height instead of playing, and a chevron marks the affordance.
   */
  onToggleExpand?: () => void;
  /** Parent-owned open state (ignored without `onToggleExpand`). */
  expanded?: boolean;
  /** Fires when the row gains D-pad focus on TV (parent uses it to scroll it into view). Inert off-TV. */
  onFocus?: () => void;
  /**
   * Set when the row lives in a VIRTUALIZED list (`FlashList`). Recycled cells
   * are re-pointed at a different programme in place, and Reanimated can't tell
   * that apart from a real state change — so the height transition plays the
   * swap as if it were an expand, and the chevron eases to its new angle. Both
   * read as a ~180ms flicker while scrolling. Disables the animations (the
   * expand still works, it just snaps); an unvirtualized parent leaves this off
   * and keeps them. See the FlashList "Reanimated + recycling" guide.
   */
  recycled?: boolean;
  /** Forwarded to the row's outer box — the EPG list measures row offsets to auto-center the active one. */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** TV: request initial D-pad focus on mount (e.g. the now-airing row when the guide opens). Inert off-TV. */
  hasTVPreferredFocus?: boolean;
  testID?: string;
}

const PLAY_SLOT = 24;
const CHEVRON_SIZE = 16;
/** Lifts the 24px glyph to a ~44pt target now that it's pressed on its own. */
const PLAY_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;
const EXPAND_DURATION = 180;

const ProgramRow: React.FC<ProgramRowProps> = ({
  title,
  meta,
  time,
  ageRating,
  state = 'now',
  isPlaying = false,
  isLiveNow = false,
  onPress,
  onToggleExpand,
  expanded = false,
  onFocus,
  onLayout,
  hasTVPreferredFocus,
  recycled = false,
  testID,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const { focused, focusProps } = useTVFocus();

  const expandable = !!onToggleExpand;
  const isExpanded = expandable && expanded;
  const canPlay = state !== 'scheduled';
  // Only mobile splits the press targets. On TV the glyph must stay out of the
  // focus order (nested focusables trap the D-pad), so row press keeps playing
  // and expansion rides the parent's onFocus instead.
  const splitPress = expandable && !isTV;

  // Only future/scheduled rows read as pale + passive; past (recorded) is a
  // playable catch-up item, so it gets a bright title + neutral play glyph.
  const titleColor = state === 'scheduled' ? 'textMuted' : 'text';
  // Red marks only the row playing now; every other playable row gets a neutral glyph.
  const playColor = isPlaying ? colors.primary : colors.mutedDim;

  // Points down when collapsed, up when open. `withTiming` inside the worklet
  // retimes on every `isExpanded` flip — no effect, no shared value to own.
  // In a recycling list the flip can mean "this cell now shows a different
  // programme", which must snap, not ease (see `recycled`).
  const chevronStyle = useAnimatedStyle(() => {
    const angle = isExpanded ? '-90deg' : '90deg';
    return {
      transform: [{ rotate: recycled ? angle : withTiming(angle, { duration: EXPAND_DURATION }) }],
    };
  });

  const playGlyph = canPlay ? (
    <Icon
      as={PlayIcon}
      size={PLAY_SLOT}
      color={playColor}
      testID={isPlaying ? 'prog-now-playing' : undefined}
    />
  ) : null;

  return (
    <Animated.View
      onLayout={onLayout}
      // Grows/shrinks the row and slides its siblings when the description
      // un-clamps. Mobile-expander only: on TV every D-pad move would animate a
      // height while scrollToIndex is already animating, and a non-expandable
      // row (search) never changes height at all. Also off in a recycling list,
      // where a cell swapping to a taller/shorter programme would animate the
      // swap as if it were an expand (see `recycled`).
      layout={
        splitPress && !recycled ? LinearTransition.duration(EXPAND_DURATION) : undefined
      }
    >
      <TouchableOpacity
        {...focusProps}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => {
          // Track internally for the ring, then let the parent scroll us into
          // view (TV only — this never fires on a phone/tablet build).
          focusProps.onFocus();
          onFocus?.();
        }}
        style={[
          styles.row,
          { borderBottomColor: colors.border },
          // TV D-pad focus: a full-width list row reads best with a solid fill +
          // a bold left accent bar (a thin scaled ring is easy to miss on a 10-foot
          // screen). `focused` is only ever true on TV, so mobile is unchanged.
          focused && {
            backgroundColor: colors.surfaceHigh,
            borderLeftWidth: 4,
            borderLeftColor: colors.focus,
          },
        ]}
        onPress={splitPress ? onToggleExpand : onPress}
        activeOpacity={0.7}
        // An expandable row stays pressable even when it can't be played — a
        // future programme is readable, just not playable.
        disabled={!expandable && !canPlay}
        accessibilityRole="button"
        accessibilityLabel={`${time}. ${title}`}
        accessibilityState={{
          disabled: !expandable && !canPlay,
          selected: isPlaying,
          ...(expandable ? { expanded: isExpanded } : null),
        }}
        testID={testID}
      >
        {splitPress && canPlay ? (
          <TouchableOpacity
            style={styles.playSlot}
            onPress={onPress}
            activeOpacity={0.7}
            hitSlop={PLAY_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('epg.a11y_play', { title })}
            testID={testID ? `${testID}-play` : undefined}
          >
            {playGlyph}
          </TouchableOpacity>
        ) : (
          <View style={styles.playSlot}>{playGlyph}</View>
        )}

        <View style={styles.meta}>
          {/* Row, not an inline span: a `numberOfLines={1}` title truncates its
              own text but would push a sibling out of the box, so the title
              shrinks (`flexShrink`) and the pill keeps its intrinsic width. */}
          <View style={styles.titleRow}>
            <ReusableText
              fontSize={FONTSIZE.regular}
              fontWeight="bold"
              themeColor={titleColor}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </ReusableText>
            {ageRating ? (
              <View
                style={[styles.ageBadge, { borderColor: colors.border, backgroundColor: colors.surfaceHigh }]}
                testID={testID ? `${testID}-age` : undefined}
              >
                <ReusableText fontSize={FONTSIZE.xs} fontWeight="bold" themeColor="textMuted">
                  {`${ageRating}+`}
                </ReusableText>
              </View>
            ) : null}
          </View>
          {/* `undefined` = RN's unlimited default, so the text wraps to as many
              lines as it needs and the row height flows from it — nothing here
              pins a height. */}
          <ReusableText
            fontSize={FONTSIZE.sm}
            themeColor="textMuted"
            numberOfLines={isExpanded ? undefined : 1}
            style={styles.sub}
          >
            {meta}
          </ReusableText>
        </View>

        <View style={styles.tail}>
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

          {/* Without this nothing signals the body is tappable — the row reads
              as a dead label and the description is never discovered. */}
          {expandable && meta ? (
            <Animated.View style={[styles.chevron, chevronStyle]} pointerEvents="none">
              <Icon as={ChevronRightIcon} size={CHEVRON_SIZE} color={colors.mutedDim} />
            </Animated.View>
          ) : null}
        </View>

        {/* Android renders the frosted overlay; iOS would render a heavy real blur,
            so there the row stays pale (textMuted) + non-clickable instead.
            `pointerEvents` none — absoluteFill would otherwise eat the expand tap. */}
        {state === 'scheduled' && Platform.OS !== 'ios' ? (
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
  },
  title: {
    flexShrink: 1,
  },
  ageBadge: {
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  sub: {
    marginTop: 2,
  },
  // Top-aligned so the time + chevron stay level with the title when the
  // description expands the row to several lines.
  tail: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.space_8,
  },
  time: {
    flexShrink: 0,
    marginTop: 1,
  },
  chevron: {
    marginTop: 2,
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
