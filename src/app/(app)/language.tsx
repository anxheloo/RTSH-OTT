/**
 * Language sheet — native form sheet of app locales (Albanian / English),
 * opened from Settings. Selecting one updates `SettingsSlice.locale` and
 * applies it to i18next, then dismisses.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import type { Locale } from '@/store/createSettingsSlice';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { SheetOptionRow } from '@/components/Layout';
import { setI18nLocale } from '@/i18n';

const LOCALES: Locale[] = ['sq', 'en'];

const LanguageSheet: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const insets = useSafeAreaInsets();

  const select = (value: Locale) => {
    setLocale(value);
    setI18nLocale(value);
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
        {t('settings.language.title')}
      </ReusableText>

      {LOCALES.map((value) => (
        <SheetOptionRow
          key={value}
          label={t(`settings.language.${value}`)}
          trailing="radio"
          selected={value === locale}
          onPress={() => select(value)}
          testID={`language-${value}`}
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
export default LanguageSheet;
