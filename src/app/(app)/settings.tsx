/**
 * Settings — design screen 10 (`sSettings`). Grouped sections of `ListRow`s:
 * "Luajtja" (playback — cellular toggle, parental toggle), "Aplikacioni"
 * (language sheet, haptics toggle, terms link, theme sheet, version), and
 * "Llogaria" (change password). Toggles write `SettingsSlice`; the parental
 * toggle drives the device-level `ParentalSlice` (client-only — no network;
 * verify-then-disable). Opened from Profile. (Quality is player-only — picked
 * per session in the player options sheet.)
 *
 * A GUEST sees this screen too — device preferences are theirs — minus the
 * "Llogaria" section, since they have no account. The parental row IS shown to
 * them, unchanged, but every interaction routes to the sign-in prompt instead of
 * the PIN modal: showing the feature and asking for an account is a better
 * answer than hiding it, and it gives a concrete reason to register. Their
 * `parentalEnabled` therefore stays false, which is why `channel/[id]` passes
 * `enabled: parentalEnabled || isGuest` — the 18+ gate must not depend on a flag
 * a guest can never set.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon, IconButton } from '@/components/Icons';
import { Switch } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ListRow, ScreenLayout, TabHeader } from '@/components/Layout';
import { ParentalPinModal } from '@/components/ParentalPin';
import {
  ChevronLeftIcon,
  DocIcon,
  InfoIcon,
  KeyIcon,
  LanguageIcon,
  LayersIcon,
  MobileIcon,
  ShieldIcon,
  WifiIcon,
} from '@/assets/icons';
import { LINKS } from '@/constants/links';
import { promptSignIn } from '@/features/auth/signInPrompt';
import { useContentWidth } from '@/responsive';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  // Center the settings column on tablet/TV; no-op on phone.
  const contentWidth = useContentWidth('content');

  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const setCellularPlaybackAllowed = useAppStore((s) => s.setCellularPlaybackAllowed);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useAppStore((s) => s.setHapticsEnabled);
  // Analytics disabled for now — re-enable when telemetry is wanted.
  // const analyticsEnabled = useAppStore((s) => s.analyticsEnabled);
  // const setAnalyticsEnabled = useAppStore((s) => s.setAnalyticsEnabled);
  const locale = useAppStore((s) => s.locale);
  const mode = useAppStore((s) => s.mode);
  const isGuest = useAppStore((s) => s.isGuest);
  const parentalEnabled = useAppStore((s) => s.parentalEnabled);
  const hasPin = useAppStore((s) => !!s.parentalPin);
  const setParentalConfig = useAppStore((s) => s.setParentalConfig);

  // null = closed · 'set' = create first PIN · 'disable' = verify before turning off · 'change' = verify+re-set
  const [pinMode, setPinMode] = useState<'set' | 'disable' | 'change' | null>(null);

  // Toggle semantics (device-level, client-only — no network):
  //   OFF→ON, no PIN yet  → 'set' (first-time create; the modal stores it)
  //   OFF→ON, PIN exists  → re-enable directly (no re-entry — turning protection ON is safe)
  //   ON→OFF              → verify PIN locally first, then disable — removing the gate is sensitive
  const handleToggleParental = () => {
    if (!parentalEnabled) {
      if (!hasPin) {
        setPinMode('set');
        return;
      }
      setParentalConfig({ enabled: true });
    } else {
      setPinMode('disable');
    }
  };

  // The parental row is shown to guests exactly as it is to members, but every
  // interaction routes to sign-in rather than the PIN modal: a PIN is device
  // state tied to an account here, and a guest who set one would be configuring
  // a gate for content they cannot reach anyway. Showing it and asking for an
  // account beats hiding the feature.
  const onParentalPress = isGuest ? promptSignIn : handleToggleParental;

  // Modal resolved: 'set'/'change' stored the new PIN inside the modal;
  // 'disable' verified locally → turn the gate off.
  const handlePinSuccess = () => {
    if (pinMode === 'disable') {
      setParentalConfig({ enabled: false });
    }
    setPinMode(null);
  };

  // The modal mode maps: 'change' → 'change', 'disable' → 'verify', 'set' → 'set'.
  const modalMode = pinMode === 'change' ? 'change' : pinMode === 'disable' ? 'verify' : 'set';

  // `Updates.updateId` is null while the app runs the JS bundle embedded in the
  // binary, and a UUID once an OTA update has been applied — so appending it
  // makes this row the ONE user-visible answer to "which JS is this device
  // actually running?". Over a 48-month contract that turns a vague bug report
  // into an exact bundle, and it is also what makes an `eas update` verifiable
  // on-device at all (identical JS otherwise looks identical). Short prefix
  // only: the full UUID is unreadable on a phone row and the first 8 chars are
  // enough to match against `eas update:list`.
  const version = Constants.expoConfig?.version ?? '';
  const updateSuffix = Updates.updateId ? ` (${Updates.updateId.slice(0, 8)})` : '';

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

      <ScrollView
        contentContainerStyle={[styles.scroll, contentWidth]}
        showsVerticalScrollIndicator={false}
      >
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
            title={t('settings.parental.title')}
            subtitle={
              parentalEnabled
                ? t('settings.parental.subtitle_active')
                : t('settings.parental.subtitle_inactive')
            }
            leading={<Icon as={ShieldIcon} size={20} color={colors.text} />}
            onPress={onParentalPress}
            right={
              <Switch
                value={parentalEnabled}
                onValueChange={onParentalPress}
                testID="settings-parental-switch"
              />
            }
            showDivider={parentalEnabled && hasPin}
            testID="settings-parental-row"
          />
          {parentalEnabled && hasPin ? (
            <ListRow
              title={t('settings.parental.change_pin')}
              leading={<Icon as={KeyIcon} size={20} color={colors.text} />}
              onPress={() => setPinMode('change')}
              showDivider={false}
              testID="settings-change-pin-row"
            />
          ) : null}
        </View>

        {/* Account — nothing here applies without one. */}
        {!isGuest ? (
          <>
            <ReusableText
              fontSize={FONTSIZE.sm}
              fontWeight="semiBold"
              themeColor="textMuted"
              style={styles.sectionLabel}
            >
              {t('settings.section_account')}
            </ReusableText>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <ListRow
                title={t('settings.change_password.title')}
                subtitle={t('settings.change_password.subtitle')}
                leading={<Icon as={KeyIcon} size={20} color={colors.text} />}
                onPress={() => router.push('/(app)/change-password')}
                showDivider={false}
                testID="settings-change-password-row"
              />
            </View>
          </>
        ) : null}

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
            onPress={() => router.push('/(app)/(modals)/language')}
            testID="settings-language-row"
          />
          <ListRow
            title={t('settings.haptics.title')}
            subtitle={t('settings.haptics.subtitle')}
            leading={<Icon as={MobileIcon} size={20} color={colors.text} />}
            right={
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                testID="settings-haptics-switch"
              />
            }
            testID="settings-haptics-row"
          />
          {/* Analytics disabled for now — re-enable when telemetry is wanted.
          <ListRow
            title={t('settings.analytics.title')}
            subtitle={t('settings.analytics.subtitle')}
            leading={<Icon as={InfoIcon} size={20} color={colors.text} />}
            right={
              <Switch
                value={analyticsEnabled}
                onValueChange={setAnalyticsEnabled}
                testID="settings-analytics-switch"
              />
            }
            testID="settings-analytics-row"
          /> */}
          <ListRow
            title={t('settings.theme.title')}
            subtitle={t(`settings.theme.${mode}`)}
            leading={<Icon as={LayersIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/(modals)/theme')}
            testID="settings-theme-row"
          />
          <ListRow
            title={t('settings.terms.title')}
            leading={<Icon as={DocIcon} size={20} color={colors.text} />}
            onPress={() => WebBrowser.openBrowserAsync(LINKS.TERMS)}
            testID="settings-terms-row"
          />
          <ListRow
            title={t('settings.privacy.title')}
            leading={<Icon as={ShieldIcon} size={20} color={colors.text} />}
            onPress={() => WebBrowser.openBrowserAsync(LINKS.PRIVACY)}
            testID="settings-privacy-row"
          />
          <ListRow
            title={t('settings.version.title')}
            subtitle={t('settings.version.subtitle', { version: `${version}${updateSuffix}` })}
            leading={<Icon as={InfoIcon} size={20} color={colors.text} />}
            showDivider={false}
            testID="settings-version-row"
          />
        </View>
      </ScrollView>

      <ParentalPinModal
        visible={pinMode !== null}
        mode={modalMode}
        onSuccess={handlePinSuccess}
        onDismiss={() => setPinMode(null)}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
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

export default SettingsScreen;
