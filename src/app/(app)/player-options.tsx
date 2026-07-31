/**
 * Player options sheet (design `.sheet` → `openPlayerOpts`). A native form sheet
 * (decision 7) listing playback settings: video quality (drills into the
 * quality sheet). Presented via
 * `getModalScreenOptions` from the (app) layout; reads/writes the store so it
 * stays decoupled from the player route underneath.
 *
 * Cast to TV was REMOVED here (2026-07-31): it was a stub row that fired a
 * "Casting to TV" toast and did nothing. See `VideoPlayer.tsx` for why the
 * underlying AirPlay path is also disabled, and CLAUDE.md → Out of scope for v1.
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

const PlayerOptionsSheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const insets = useSafeAreaInsets();

  // Auto shows the localized ABR hint; a pinned rendition shows its backend key verbatim.
  const qualityLabel = videoQuality === 'auto' ? t('player.quality_value_auto') : videoQuality;

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
