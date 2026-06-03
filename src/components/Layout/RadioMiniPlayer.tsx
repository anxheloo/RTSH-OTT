/**
 * RadioMiniPlayer — 60px docked strip above the tab bar.
 * Reads PlayerSlice; renders nothing when no radio channel is active.
 * Tap navigates to the Radio tab; play/pause and close in-strip.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

const STRIP_HEIGHT = 60;

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
      style={[styles.strip, { backgroundColor: colors.surfaceElevated }]}
      onPress={() => router.push('/(app)/(tabs)/radio')}
      activeOpacity={0.9}
      testID="radio-mini-player"
    >
      {/* Artwork dot */}
      <View
        style={[
          styles.dot,
          { backgroundColor: radioArtworkUrl ? 'transparent' : colors.primary },
        ]}
        testID="radio-mini-artwork"
      >
        {!radioArtworkUrl && (
          <ReusableText fontSize={FONTSIZE.xs} themeColor="onPrimary">
            ♪
          </ReusableText>
        )}
      </View>

      {/* Title */}
      <ReusableText
        fontSize={FONTSIZE.sm}
        themeColor="text"
        numberOfLines={1}
        style={styles.title}
      >
        {radioTitle ?? 'Radio'}
      </ReusableText>

      {/* Play / pause */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setRadioPlaying(!radioIsPlaying)}
        activeOpacity={0.7}
        testID="radio-mini-toggle"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ReusableText fontSize={FONTSIZE.md} themeColor="text">
          {radioIsPlaying ? '⏸' : '▶'}
        </ReusableText>
      </TouchableOpacity>

      {/* Close */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={clearRadio}
        activeOpacity={0.7}
        testID="radio-mini-close"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ReusableText fontSize={FONTSIZE.md} themeColor="textMuted">
          ✕
        </ReusableText>
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
    gap: SPACING.space_10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
