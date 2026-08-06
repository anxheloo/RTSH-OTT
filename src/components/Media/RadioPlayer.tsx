/**
 * RadioPlayer — the "now playing" core of the radio player screen (design
 * `rp-art` + `.eq` + transport row): a square scene artwork with the radio
 * glyph, the station name + "genre · NNN kbps" subtitle, a live Equalizer, and
 * a prev / play-pause / next transport row.
 *
 * Presentational only. Audio playback lives in `RadioAudioHost` (driven by
 * `PlayerSlice`); this component renders state and reports intent via callbacks.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import Equalizer from '@/components/radio/Equalizer';
import type { Channel } from '@/types/domain';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, RadioIcon } from '@/assets/icons';
import { tvFocusHighlight, useTVFocus } from '@/tv';

export interface RadioPlayerProps {
  station: Channel;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const RadioPlayer: React.FC<RadioPlayerProps> = ({
  station,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const prevFocus = useTVFocus();
  const playFocus = useTVFocus();
  const nextFocus = useTVFocus();

  return (
    <View style={styles.container}>
      <View style={styles.art}>
        <SceneBackground source={station.imageUrl} />
        <Icon as={RadioIcon} size={60} color={colors.onPrimary} />
      </View>

      <View style={styles.meta}>
        <ReusableText variant="heading2" themeColor="text" textAlign="center" numberOfLines={2}>
          {station.name}
        </ReusableText>
      </View>

      <View style={styles.eq}>
        <Equalizer active={isPlaying} height={28} testID="radio-player-eq" />
      </View>

      <View style={styles.transport}>
        <TouchableOpacity
          {...prevFocus.focusProps}
          style={[
            styles.sideBtn,
            { backgroundColor: colors.surfaceElevated },
            !hasPrev && styles.disabled,
            tvFocusHighlight(colors.focus, prevFocus.focused),
          ]}
          onPress={onPrev}
          disabled={!hasPrev}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('radio.previous')}
          testID="radio-prev"
        >
          <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          {...playFocus.focusProps}
          style={[
            styles.playBtn,
            { backgroundColor: colors.primary },
            // `onPrimary`, NOT `colors.focus` — the focus token is '#EB122F',
            // the SAME value as `colors.primary`, so the standard ring is a red
            // border on this button's red fill: invisible. On TV that made the
            // primary transport control the one control you couldn't tell was
            // focused. Same precedent as `AdOverlay` (rings on a bright fill use
            // white). Any ring must contrast with the fill it sits on, not with
            // the page background.
            tvFocusHighlight(colors.onPrimary, playFocus.focused),
          ]}
          onPress={onTogglePlay}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t('common.pause') : t('common.play')}
          testID="radio-player-toggle"
        >
          <Icon as={isPlaying ? PauseIcon : PlayIcon} size={30} color={colors.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          {...nextFocus.focusProps}
          style={[
            styles.sideBtn,
            { backgroundColor: colors.surfaceElevated },
            !hasNext && styles.disabled,
            tvFocusHighlight(colors.focus, nextFocus.focused),
          ]}
          onPress={onNext}
          disabled={!hasNext}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('radio.next')}
          testID="radio-next"
        >
          <Icon as={ChevronRightIcon} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Compact sizing — this screen pins the whole player above a sibling
// (non-scrolling) pane, so its footprint must reliably fit above the fold on
// short screens rather than assuming a generous, scrollable column.
const ART = 160;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  art: {
    width: '48%',
    maxWidth: ART,
    // LOAD-BEARING, not redundant with `aspectRatio` — do not delete. Yoga
    // derives the aspect-ratio height from the PERCENTAGE-resolved width, then
    // clamps only the width to `maxWidth`. So on any parent wider than
    // ART / 0.48 ≈ 334dp the box came out 160 wide by (48% of parent) tall — a
    // tower, not a square. On TV (an 820dp `useContentWidth('player')` column)
    // that was 160×394: it ate 73% of the 540dp screen height and pushed the
    // transport, day strip and whole EPG list below the fold of a screen that
    // deliberately doesn't scroll. Clamping BOTH axes makes it square at every
    // width — below 334dp neither clamp binds and the 48% square still applies.
    maxHeight: ART,
    aspectRatio: 1,
    marginTop: SPACING.space_12,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    paddingTop: SPACING.space_12,
    paddingHorizontal: SPACING.space_24,
  },
  sub: {
    marginTop: SPACING.space_4,
  },
  eq: {
    paddingVertical: SPACING.space_8,
    alignItems: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_16,
    paddingTop: SPACING.space_8,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default RadioPlayer;
