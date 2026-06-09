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

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import Equalizer from '@/components/radio/Equalizer';
import type { RadioStation } from '@/types/domain';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, RadioIcon } from '@/assets/icons';

export interface RadioPlayerProps {
  station: RadioStation;
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
  const colors = useAppStore((s) => s.colors);

  const subtitle = station.bitrateKbps
    ? `${station.genre} · ${station.bitrateKbps} kbps`
    : station.genre;

  return (
    <View style={styles.container}>
      <View style={styles.art}>
        <SceneBackground source={station.artworkUrl} />
        <Icon as={RadioIcon} size={60} color={colors.onPrimary} />
      </View>

      <View style={styles.meta}>
        <ReusableText variant="heading2" themeColor="text" textAlign="center" numberOfLines={2}>
          {station.name}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" textAlign="center" style={styles.sub}>
          {subtitle}
        </ReusableText>
      </View>

      <View style={styles.eq}>
        <Equalizer active={isPlaying} height={28} testID="radio-player-eq" />
      </View>

      <View style={styles.transport}>
        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: colors.surfaceElevated }, !hasPrev && styles.disabled]}
          onPress={onPrev}
          disabled={!hasPrev}
          activeOpacity={0.8}
          testID="radio-prev"
        >
          <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={onTogglePlay}
          activeOpacity={0.85}
          testID="radio-player-toggle"
        >
          <Icon as={isPlaying ? PauseIcon : PlayIcon} size={30} color={colors.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sideBtn, { backgroundColor: colors.surfaceElevated }, !hasNext && styles.disabled]}
          onPress={onNext}
          disabled={!hasNext}
          activeOpacity={0.8}
          testID="radio-next"
        >
          <Icon as={ChevronRightIcon} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RadioPlayer;

const ART = 230;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  art: {
    width: '62%',
    maxWidth: ART,
    aspectRatio: 1,
    marginTop: SPACING.space_20,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    paddingTop: SPACING.space_24,
    paddingHorizontal: SPACING.space_24,
  },
  sub: {
    marginTop: SPACING.space_4,
  },
  eq: {
    paddingVertical: SPACING.space_12,
    alignItems: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_24,
    paddingTop: SPACING.space_12,
  },
  sideBtn: {
    width: 50,
    height: 50,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
