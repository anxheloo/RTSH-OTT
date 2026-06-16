/**
 * Theme sheet — native form sheet of theme modes (system / light / dark),
 * opened from Settings. Selecting one applies it via `ThemeSlice.setTheme`
 * (light theme is a retained feature, plan decision 6) and dismisses.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import type { ThemeMode } from '@/store/createThemeSlice';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { SheetOptionRow } from '@/components/Layout';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

const ThemeSheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);
  const setTheme = useAppStore((s) => s.setTheme);
  const insets = useSafeAreaInsets();

  const select = (value: ThemeMode) => {
    setTheme(value);
    router.back();
  };

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.surface, paddingBottom: insets.bottom + SPACING.space_12 },
      ]}
    >
      <ReusableText variant="heading3" style={styles.title}>
        {t('settings.theme.title')}
      </ReusableText>

      {MODES.map((value) => (
        <SheetOptionRow
          key={value}
          label={t(`settings.theme.${value}`)}
          trailing="radio"
          selected={value === mode}
          onPress={() => select(value)}
          testID={`theme-${value}`}
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
export default ThemeSheet;
