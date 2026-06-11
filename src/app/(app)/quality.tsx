/**
 * Quality sheet (design `openQuality`). A native form sheet of resolution options.
 * `target=default` (opened from Settings) writes the persisted
 * `SettingsSlice.defaultQuality` and lists every option (a channel-independent
 * preference). Otherwise it writes the active player's `PlayerSlice.videoQuality`
 * and lists Auto + only the renditions the current stream actually offers
 * (`availableQualities`) — Auto only when the stream is a single/master source.
 * Manual selection swaps the player source (the resolver handles the URL); see
 * `utils/resolveStreamSource`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router, useLocalSearchParams } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { SheetOptionRow } from '@/components/Layout';
import type { QualityId } from '@/types/domain';
import { QUALITY_OPTIONS } from '@/constants/player';

const QualitySheet: React.FC = () => {
  const { t } = useTranslation();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const isDefault = target === 'default';
  const colors = useAppStore((s) => s.colors);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const defaultQuality = useAppStore((s) => s.defaultQuality);
  const availableQualities = useAppStore((s) => s.availableQualities);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const setDefaultQuality = useAppStore((s) => s.setDefaultQuality);
  const showToast = useAppStore((s) => s.showToast);
  const insets = useSafeAreaInsets();

  const current = isDefault ? defaultQuality : videoQuality;

  // Default target → every option (preference, channel-independent). Active player
  // → Auto + only the qualities this stream can actually be pinned to.
  const options = isDefault
    ? QUALITY_OPTIONS
    : QUALITY_OPTIONS.filter((q) => q.id === 'auto' || availableQualities.includes(q.id));

  const select = (id: QualityId, label: string) => {
    if (isDefault) {
      setDefaultQuality(id);
    } else {
      setVideoQuality(id);
    }
    router.back();
    showToast(t('player.quality_changed', { quality: label }));
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

      {options.map((q) => (
        <SheetOptionRow
          key={q.id}
          label={q.label}
          description={t(q.descriptionKey)}
          trailing="radio"
          selected={q.id === current}
          onPress={() => select(q.id, q.label)}
          testID={`quality-${q.id}`}
        />
      ))}
    </View>
  );
};

export default QualitySheet;

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
