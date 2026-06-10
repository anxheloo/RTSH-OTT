/**
 * Settings — design screen 10 (`sSettings`). Two grouped sections of
 * `ListRow`s: "Luajtja" (playback — cellular toggle, default-quality sheet,
 * parental toggle) and "Aplikacioni" (language sheet, notifications toggle,
 * cast stub, terms link, theme sheet, version). Toggles write `SettingsSlice`;
 * the parental toggle gates on the keychain PIN. Opened from Profile.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { clearParentalPin } from '@/api/services/users';
import { Icon, IconButton } from '@/components/Icons';
import { Switch } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ListRow, ScreenLayout, TabHeader } from '@/components/Layout';
import { ParentalPinModal } from '@/components/ParentalPin';
import {
  BellIcon,
  CastIcon,
  ChevronLeftIcon,
  DocIcon,
  InfoIcon,
  LanguageIcon,
  LayersIcon,
  QualityIcon,
  ShieldIcon,
  WifiIcon,
} from '@/assets/icons';
import { PARENTAL_PIN_KEY } from '@/config/auth';
import { LINKS } from '@/config/links';
import { QUALITY_OPTIONS } from '@/constants/player';
import { removeFromKeychain } from '@/services/keychain';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const setCellularPlaybackAllowed = useAppStore((s) => s.setCellularPlaybackAllowed);
  const defaultQuality = useAppStore((s) => s.defaultQuality);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const locale = useAppStore((s) => s.locale);
  const mode = useAppStore((s) => s.mode);
  const isPinSet = useAppStore((s) => s.isPinSet);
  const clearPin = useAppStore((s) => s.clearPin);

  // null = closed · 'set' = create a PIN · 'verify' = confirm PIN before disabling.
  const [pinMode, setPinMode] = useState<'set' | 'verify' | null>(null);

  const qualityLabel =
    defaultQuality === 'auto'
      ? t('settings.quality.subtitle_auto')
      : (QUALITY_OPTIONS.find((q) => q.id === defaultQuality)?.label ?? defaultQuality);

  // Turning the gate ON → set a PIN. Turning it OFF → require the PIN first, so a
  // child can't simply flip the switch to bypass the control.
  const handleParentalToggle = (next: boolean) => setPinMode(next ? 'set' : 'verify');

  const handlePinSuccess = async () => {
    if (pinMode === 'verify') {
      // PIN confirmed → tear down. Backend is source of truth; also drop the
      // local keychain cache so the gate can't be re-verified offline.
      await clearParentalPin();
      await removeFromKeychain(PARENTAL_PIN_KEY);
      clearPin();
    }
    // 'set' marks isPinSet inside the modal itself; nothing more to do here.
    setPinMode(null);
  };

  const version = Constants.expoConfig?.version ?? '';

  return (
    <ScreenLayout>
      <TabHeader
        title={t('settings.title')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="settings-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Playback */}
        <ReusableText
          fontSize={FONTSIZE.sm}
          fontWeight="semiBold"
          themeColor="textMuted"
          style={styles.sectionLabel}
        >
          {t('settings.section_playback')}
        </ReusableText>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ListRow
            title={t('settings.cellular.title')}
            subtitle={t('settings.cellular.subtitle')}
            leading={<Icon as={WifiIcon} size={20} color={colors.text} />}
            right={
              <Switch
                value={cellularPlaybackAllowed}
                onValueChange={setCellularPlaybackAllowed}
                testID="settings-cellular-switch"
              />
            }
            testID="settings-cellular-row"
          />
          <ListRow
            title={t('settings.quality.title')}
            subtitle={qualityLabel}
            leading={<Icon as={QualityIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/quality?target=default')}
            testID="settings-quality-row"
          />
          <ListRow
            title={t('settings.parental.title')}
            subtitle={
              isPinSet
                ? t('settings.parental.subtitle_active')
                : t('settings.parental.subtitle_inactive')
            }
            leading={<Icon as={ShieldIcon} size={20} color={colors.text} />}
            right={
              <Switch
                value={isPinSet}
                onValueChange={handleParentalToggle}
                testID="settings-parental-switch"
              />
            }
            showDivider={false}
            testID="settings-parental-row"
          />
        </View>

        {/* Application */}
        <ReusableText
          fontSize={FONTSIZE.sm}
          fontWeight="semiBold"
          themeColor="textMuted"
          style={styles.sectionLabel}
        >
          {t('settings.section_app')}
        </ReusableText>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ListRow
            title={t('settings.language.title')}
            subtitle={t(`settings.language.${locale}`)}
            leading={<Icon as={LanguageIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/language')}
            testID="settings-language-row"
          />
          <ListRow
            title={t('settings.notifications.title')}
            subtitle={t('settings.notifications.subtitle')}
            leading={<Icon as={BellIcon} size={20} color={colors.text} />}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                testID="settings-notifications-switch"
              />
            }
            testID="settings-notifications-row"
          />
          <ListRow
            title={t('settings.cast.title')}
            subtitle={t('settings.cast.subtitle')}
            leading={<Icon as={CastIcon} size={20} color={colors.text} />}
            right={<Switch value={false} onValueChange={() => {}} isDisabled testID="settings-cast-switch" />}
            testID="settings-cast-row"
          />
          <ListRow
            title={t('settings.theme.title')}
            subtitle={t(`settings.theme.${mode}`)}
            leading={<Icon as={LayersIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/theme')}
            testID="settings-theme-row"
          />
          <ListRow
            title={t('settings.terms.title')}
            leading={<Icon as={DocIcon} size={20} color={colors.text} />}
            onPress={() => WebBrowser.openBrowserAsync(LINKS.TERMS)}
            testID="settings-terms-row"
          />
          <ListRow
            title={t('settings.version.title')}
            subtitle={t('settings.version.subtitle', { version })}
            leading={<Icon as={InfoIcon} size={20} color={colors.text} />}
            showDivider={false}
            testID="settings-version-row"
          />
        </View>
      </ScrollView>

      <ParentalPinModal
        visible={pinMode !== null}
        mode={pinMode ?? 'set'}
        onSuccess={handlePinSuccess}
        onDismiss={() => setPinMode(null)}
      />
    </ScreenLayout>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
  sectionLabel: {
    marginTop: SPACING.space_24,
    marginBottom: SPACING.space_10,
    marginLeft: SPACING.space_4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
  },
});
