/**
 * Quality sheet (design `openQuality`). A native form sheet of ABR options;
 * selecting one stores it in `PlayerSlice`, dismisses back to the player, and
 * shows a confirmation toast. Today only `auto` is enforced (expo-video does ABR
 * automatically and can't cap a variant) — the choice is stored for when the
 * player engine supports capping (plan 15.5 / 22.10: switch to react-native-video
 * if manual capping is required).
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
import { QUALITY_OPTIONS } from '@/constants/player';

const QualitySheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const showToast = useAppStore((s) => s.showToast);
  const insets = useSafeAreaInsets();

  const select = (id: QualityId, label: string) => {
    setVideoQuality(id);
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

      {QUALITY_OPTIONS.map((q) => (
        <SheetOptionRow
          key={q.id}
          label={q.label}
          description={t(q.descriptionKey)}
          trailing="radio"
          selected={q.id === videoQuality}
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
