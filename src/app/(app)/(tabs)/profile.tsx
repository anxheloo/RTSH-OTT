/**
 * Profile tab — shares the brand header with Home (logo taps back to Kreu);
 * avatar, package badge, and navigation rows to account details / settings +
 * a logout confirmation. Parental control lives inside Settings (no separate
 * Profile row). All toggles live in Settings.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useDeleteAccountMutation, useLogoutMutation } from '@/api/mutations';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ListRow, ScreenLayout } from '@/components/Layout';
import { OutIcon, SettingsIcon, UserIcon, WarningIcon } from '@/assets/icons';
import { useContentWidth } from '@/responsive';

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const tabBarHeight = useTabBarHeight();
  const user = useAppStore((s) => s.user);
  // Center the profile column on tablet/TV; no-op on phone.
  const contentWidth = useContentWidth('content');
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);
  const { mutate: logout } = useLogoutMutation();
  const { mutate: deleteAccount } = useDeleteAccountMutation();

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const packageBadge = user?.subscription
    ? t('profile.package_badge', {
        package: user.subscription.package,
        count: user.subscription.channelCount,
      })
    : t('profile.package_default');

  const handleLogout = () => {
    updateModalSlice({
      currentModal: 'confirmation',
      modalData: {
        title: t('profile.logout_confirm_title'),
        description: t('profile.logout_confirm_message'),
        button: t('profile.logout'),
        action: () => logout(),
        button2: t('common.cancel'),
        action2: () => {},
      },
    });
  };

  const handleDeleteAccount = () => {
    updateModalSlice({
      currentModal: 'confirmation',
      modalData: {
        title: t('profile.delete_confirm_title'),
        description: t('profile.delete_confirm_message'),
        button: t('profile.delete_account'),
        action: () => deleteAccount(),
        button2: t('common.cancel'),
        action2: () => {},
      },
    });
  };

  return (
    <ScreenLayout>
      <BrandHeader
        testID="profile-header"
        onLogoPress={() => router.navigate('/(app)/(tabs)')}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          contentWidth,
          { paddingBottom: tabBarHeight + SPACING.space_24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + user info */}
        <View style={styles.avatarBlock}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <ReusableText fontSize={28} fontWeight="extraBold" themeColor="onPrimary">
              {initials}
            </ReusableText>
          </View>
          <ReusableText
            variant="heading2"
            themeColor="text"
            style={styles.displayName}
            numberOfLines={1}
          >
            {user?.displayName ?? t('profile.user_default')}
          </ReusableText>
          <ReusableText
            fontSize={FONTSIZE.regular}
            themeColor="textMuted"
            style={styles.email}
            numberOfLines={1}
          >
            {user?.email ?? ''}
          </ReusableText>
          <View style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <ReusableText fontSize={FONTSIZE.sm} fontWeight="semiBold" themeColor="textMuted">
              {packageBadge}
            </ReusableText>
          </View>
        </View>

        {/* Navigation rows */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ListRow
            title={t('profile.account.title')}
            subtitle={t('profile.account.subtitle')}
            leading={<Icon as={UserIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/account')}
            testID="profile-account-row"
          />
          <ListRow
            title={t('profile.settings_row.title')}
            subtitle={t('profile.settings_row.subtitle')}
            leading={<Icon as={SettingsIcon} size={20} color={colors.text} />}
            onPress={() => router.push('/(app)/settings')}
            showDivider={false}
            testID="profile-settings-row"
          />
        </View>

        {/* Logout + delete account */}
        <View style={[styles.card, styles.cardLast, { backgroundColor: colors.surface }]}>
          <ListRow
            title={t('profile.logout')}
            leading={<Icon as={OutIcon} size={20} color={colors.error} />}
            titleColor="error"
            onPress={handleLogout}
            testID="profile-logout-row"
          />
          <ListRow
            title={t('profile.delete_account')}
            leading={<Icon as={WarningIcon} size={20} color={colors.error} />}
            titleColor="error"
            onPress={handleDeleteAccount}
            showDivider={false}
            testID="profile-delete-account-row"
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SPACING.space_24,
  },
  avatarBlock: {
    alignItems: 'center',
    paddingTop: SPACING.space_20,
    paddingBottom: SPACING.space_20,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    marginTop: SPACING.space_16,
  },
  email: {
    marginTop: SPACING.space_4,
  },
  badge: {
    marginTop: SPACING.space_10,
    borderWidth: 1,
    borderRadius: BORDERRADIUS.pill,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: 5,
  },
  card: {
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
    marginBottom: SPACING.space_12,
  },
  cardLast: {
    marginTop: SPACING.space_4,
  },
});

export default ProfileScreen;
