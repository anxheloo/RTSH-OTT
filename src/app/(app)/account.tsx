/**
 * Account details — read-only list of the profile data captured at
 * registration (username, email, age, location, gender). Values come from the
 * persisted `user`; missing fields render a placeholder. Editing lands with
 * the real backend contract. Opened from Profile.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon, IconButton } from '@/components/Icons';
import { ListRow, ScreenLayout, TabHeader } from '@/components/Layout';
import { ChevronLeftIcon } from '@/assets/icons';
import { useContentWidth } from '@/responsive';

const AccountScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const user = useAppStore((s) => s.user);
  // Center the account column on tablet/TV; no-op on phone.
  const contentWidth = useContentWidth('content');

  const empty = t('profile.account.empty');
  const rows: { key: string; value?: string }[] = [
    { key: 'username', value: user?.username },
    { key: 'email', value: user?.email },
    { key: 'age', value: user?.age != null ? String(user.age) : undefined },
    { key: 'location', value: user?.location },
    {
      key: 'gender',
      value:
        user?.gender && user.gender !== 'unspecified'
          ? t(`auth.register.gender.${user.gender}`)
          : undefined,
    },
  ];

  return (
    <ScreenLayout>
      <TabHeader
        title={t('profile.account.title')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="account-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, contentWidth]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {rows.map(({ key, value }, i) => (
            <ListRow
              key={key}
              title={t(`profile.account.${key}`)}
              subtitle={value ?? empty}
              showDivider={i < rows.length - 1}
              testID={`account-${key}-row`}
            />
          ))}
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
  card: {
    marginTop: SPACING.space_24,
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
  },
});

export default AccountScreen;
