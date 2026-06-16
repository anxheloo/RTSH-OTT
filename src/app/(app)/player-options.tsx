/**
 * Player options sheet (design `.sheet` → `openPlayerOpts`). A native form sheet
 * (decision 7) listing playback settings: video quality (drills into the
 * quality sheet), audio language, subtitles, and cast. Presented via
 * `getModalScreenOptions` from the (app) layout; reads/writes the store so it
 * stays decoupled from the player route underneath.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { SheetOptionRow } from '@/components/Layout';
import { QUALITY_OPTIONS } from '@/constants/player';

const PlayerOptionsSheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const showToast = useAppStore((s) => s.showToast);
  const insets = useSafeAreaInsets();

  const qualityLabel =
    videoQuality === 'auto'
      ? `${t('player.quality_value_auto')}`
      : (QUALITY_OPTIONS.find((q) => q.id === videoQuality)?.label ?? videoQuality);

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.space_12 },
      ]}
    >
      <ReusableText variant="heading3" style={styles.title}>
        {t('player.options_title')}
      </ReusableText>

      <SheetOptionRow
        label={t('player.video_quality')}
        description={qualityLabel}
        onPress={() => router.replace('/(app)/quality')}
        testID="opt-quality"
      />
      {/* TODO(anx 2026-06-09): audio-track + subtitle sub-sheets (own step). */}
      <SheetOptionRow
        label={t('player.audio_language')}
        description={t('player.audio_default')}
        onPress={() => {}}
        testID="opt-audio"
      />
      <SheetOptionRow
        label={t('player.subtitles')}
        description={t('player.subtitles_off')}
        onPress={() => {}}
        testID="opt-subtitles"
      />
      <SheetOptionRow
        label={t('player.cast')}
        onPress={() => {
          router.back();
          showToast(t('player.cast_toast'));
        }}
        testID="opt-cast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingTop: SPACING.space_8,
  },
  title: {
    paddingHorizontal: SPACING.space_20,
    paddingTop: SPACING.space_8,
    paddingBottom: SPACING.space_12,
  },
});

export default PlayerOptionsSheet;
