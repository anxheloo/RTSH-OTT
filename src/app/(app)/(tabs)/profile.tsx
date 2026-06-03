/**
 * Profile tab — user account, settings, logout.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import type { Locale } from '@/store/createSettingsSlice';
import type { ThemeMode } from '@/store/createThemeSlice';
import { useAppStore } from '@/store/useAppStore';
import { useLogoutMutation } from '@/api/mutations';
import ReusableText from '@/components/Inputs/ReusableText';
import TabHeader from '@/components/Layout/TabHeader';
import { ParentalPinModal } from '@/components/ParentalPin';
import { setI18nLocale } from '@/i18n';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
  testID?: string;
};

const ToggleRow: React.FC<ToggleRowProps> = ({ label, value, onToggle, testID }) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onToggle}
      activeOpacity={0.8}
      testID={testID}
    >
      <ReusableText fontSize={FONTSIZE.regular} themeColor="text">
        {label}
      </ReusableText>
      <View style={[styles.toggle, { backgroundColor: value ? colors.primary : colors.surfaceElevated }]}>
        <View style={[styles.toggleThumb, { transform: [{ translateX: value ? 18 : 2 }] }]} />
      </View>
    </TouchableOpacity>
  );
};

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const isPinSet = useAppStore((s) => s.isPinSet);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const user = useAppStore((s) => s.user);
  const mode = useAppStore((s) => s.mode);
  const locale = useAppStore((s) => s.locale);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLocale = useAppStore((s) => s.setLocale);
  const autoplayEnabled = useAppStore((s) => s.autoplayEnabled);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);
  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const dataSaverEnabled = useAppStore((s) => s.dataSaverEnabled);
  const setAutoplayEnabled = useAppStore((s) => s.setAutoplayEnabled);
  const setHapticsEnabled = useAppStore((s) => s.setHapticsEnabled);
  const setCellularPlaybackAllowed = useAppStore((s) => s.setCellularPlaybackAllowed);
  const setDataSaverEnabled = useAppStore((s) => s.setDataSaverEnabled);
  const { mutate: logout, isPending } = useLogoutMutation();

  const handleSetLocale = (value: Locale) => {
    setLocale(value);
    setI18nLocale(value);
  };

  const THEME_OPTIONS: { labelKey: string; value: ThemeMode }[] = [
    { labelKey: 'profile.theme.system', value: 'system' },
    { labelKey: 'profile.theme.light', value: 'light' },
    { labelKey: 'profile.theme.dark', value: 'dark' },
  ];

  const LANGUAGE_OPTIONS: { label: string; value: Locale }[] = [
    { label: 'Shqip', value: 'sq' },
    { label: 'English', value: 'en' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title={t('profile.title')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* User info */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <ReusableText fontSize={FONTSIZE.xl} themeColor="onPrimary">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </ReusableText>
          </View>
          <ReusableText variant="heading3" themeColor="text" textAlign="center">
            {user?.displayName ?? t('profile.user_default')}
          </ReusableText>
          <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" textAlign="center">
            {user?.email ?? ''}
          </ReusableText>
        </View>

        {/* Theme */}
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" style={styles.sectionLabel}>
          {t('profile.theme.label')}
        </ReusableText>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.segmentRow}>
            {THEME_OPTIONS.map(({ labelKey, value }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.segment,
                  { backgroundColor: mode === value ? colors.primary : colors.surfaceElevated },
                ]}
                onPress={() => setTheme(value)}
                activeOpacity={0.8}
                testID={`theme-option-${value}`}
              >
                <ReusableText
                  fontSize={FONTSIZE.sm}
                  themeColor={mode === value ? 'onPrimary' : 'textMuted'}
                >
                  {t(labelKey)}
                </ReusableText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language */}
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" style={styles.sectionLabel}>
          {t('profile.language.label')}
        </ReusableText>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.segmentRow}>
            {LANGUAGE_OPTIONS.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.segment,
                  { backgroundColor: locale === value ? colors.primary : colors.surfaceElevated },
                ]}
                onPress={() => handleSetLocale(value)}
                activeOpacity={0.8}
                testID={`lang-option-${value}`}
              >
                <ReusableText
                  fontSize={FONTSIZE.sm}
                  themeColor={locale === value ? 'onPrimary' : 'textMuted'}
                >
                  {label}
                </ReusableText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Playback settings */}
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" style={styles.sectionLabel}>
          {t('profile.playback.label')}
        </ReusableText>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <ToggleRow
            label={t('profile.playback.autoplay')}
            value={autoplayEnabled}
            onToggle={() => setAutoplayEnabled(!autoplayEnabled)}
            testID="toggle-autoplay"
          />
          <ToggleRow
            label={t('profile.playback.cellular')}
            value={cellularPlaybackAllowed}
            onToggle={() => setCellularPlaybackAllowed(!cellularPlaybackAllowed)}
            testID="toggle-cellular"
          />
          <ToggleRow
            label={t('profile.playback.data_saver')}
            value={dataSaverEnabled}
            onToggle={() => setDataSaverEnabled(!dataSaverEnabled)}
            testID="toggle-data-saver"
          />
        </View>

        {/* App settings */}
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" style={styles.sectionLabel}>
          {t('profile.app_settings.label')}
        </ReusableText>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <ToggleRow
            label={t('profile.app_settings.haptics')}
            value={hapticsEnabled}
            onToggle={() => setHapticsEnabled(!hapticsEnabled)}
            testID="toggle-haptics"
          />
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: 'transparent' }]}
            onPress={() => setPinModalVisible(true)}
            activeOpacity={0.8}
            testID="parental-pin-row"
          >
            <ReusableText fontSize={FONTSIZE.regular} themeColor="text">
              {t('profile.app_settings.parental_pin')}
            </ReusableText>
            <ReusableText fontSize={FONTSIZE.sm} themeColor={isPinSet ? 'primary' : 'textMuted'}>
              {isPinSet ? t('profile.app_settings.pin_active') : t('profile.app_settings.pin_set')}
            </ReusableText>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.error }]}
          onPress={() => logout()}
          disabled={isPending}
          activeOpacity={0.8}
          testID="logout-btn"
        >
          <ReusableText fontSize={FONTSIZE.regular} themeColor="onPrimary" textAlign="center">
            {isPending ? t('profile.logging_out') : t('profile.logout')}
          </ReusableText>
        </TouchableOpacity>
      </ScrollView>

      <ParentalPinModal
        visible={pinModalVisible}
        mode="set"
        onSuccess={() => setPinModalVisible(false)}
        onDismiss={() => setPinModalVisible(false)}
      />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
    gap: 0,
  },
  sectionLabel: {
    marginTop: SPACING.space_24,
    marginBottom: SPACING.space_10,
    marginLeft: 4,
  },
  section: {
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
    paddingHorizontal: SPACING.space_15,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.space_10,
    marginTop: SPACING.space_15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.space_15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.space_10,
    paddingVertical: SPACING.space_12,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_8,
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_12,
    paddingVertical: SPACING.space_15,
  },
});
