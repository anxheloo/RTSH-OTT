/**
 * RadioMiniPlayer — 60px docked strip above the tab bar (design dock). Reads
 * `PlayerSlice`; renders nothing when no station is active. A scene tile + the
 * station title, a live Equalizer while playing, then play/pause + close. Tap
 * the strip to reopen the full player route. Audio is owned by `RadioAudioHost`,
 * so the strip only flips store flags — playback continues across navigation.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import Equalizer from '@/components/radio/Equalizer';
import { CloseIcon, PauseIcon, PlayIcon, RadioIcon } from '@/assets/icons';

const STRIP_HEIGHT = 60;
const TILE = 40;

const RadioMiniPlayer: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const radioTitle = useAppStore((s) => s.radioTitle);
  const radioArtworkUrl = useAppStore((s) => s.radioArtworkUrl);
  const setRadioPlaying = useAppStore((s) => s.setRadioPlaying);
  const clearRadio = useAppStore((s) => s.clearRadio);

  if (!radioChannelId) return null;

  return (
    <TouchableOpacity
      style={[styles.strip, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}
      onPress={() => router.push(`/(app)/radio/${radioChannelId}`)}
      activeOpacity={0.9}
      testID="radio-mini-player"
    >
      <View style={styles.tile} testID="radio-mini-artwork">
        <SceneBackground source={radioArtworkUrl ?? undefined} />
        <Icon as={RadioIcon} size={18} color={colors.onPrimary} />
      </View>

      <ReusableText
        fontSize={FONTSIZE.sm}
        fontWeight="medium"
        themeColor="text"
        numberOfLines={1}
        style={styles.title}
      >
        {radioTitle ?? 'Radio'}
      </ReusableText>

      {radioIsPlaying ? <Equalizer height={14} barWidth={3} testID="radio-mini-eq" /> : null}

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setRadioPlaying(!radioIsPlaying)}
        activeOpacity={0.7}
        testID="radio-mini-toggle"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon as={radioIsPlaying ? PauseIcon : PlayIcon} size={20} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={clearRadio}
        activeOpacity={0.7}
        testID="radio-mini-close"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon as={CloseIcon} size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  strip: {
    height: STRIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_15,
    gap: SPACING.space_12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

export default RadioMiniPlayer;
