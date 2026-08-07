/**
 * Quality sheet (design `openQuality`). A native form sheet of resolution options
 * for the active player: writes `PlayerSlice.videoQuality` and lists Auto + only
 * the renditions the current stream actually offers (`availableQualities`) — Auto
 * only when the stream is a single/master source. The pick is per-session (not
 * persisted); manual selection swaps the player source (the resolver handles the
 * URL); see `utils/resolveStreamSource`.
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
import type { QualityId } from '@/types/domain';

const QualitySheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const availableQualities = useAppStore((s) => s.availableQualities);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const showToast = useAppStore((s) => s.showToast);
  const insets = useSafeAreaInsets();

  // Auto + the rendition keys this stream actually offers (verbatim from backend).
  const options: QualityId[] = ['auto', ...availableQualities];
  const labelFor = (id: QualityId) => (id === 'auto' ? t('player.quality_value_auto') : id);

  const select = (id: QualityId) => {
    setVideoQuality(id);
    router.back();
    showToast(t('player.quality_changed', { quality: labelFor(id) }));
  };

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.space_12 },
      ]}
    >
      <ReusableText variant="heading3" style={styles.title}>
        {t('player.quality_title')}
      </ReusableText>

      {options.map((id) => (
        <SheetOptionRow
          key={id}
          label={labelFor(id)}
          trailing="radio"
          selected={id === videoQuality}
          onPress={() => select(id)}
          testID={`quality-${id}`}
        />
      ))}
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

export default QualitySheet;
