/**
 * Change password — authenticated screen, opened from Settings → Account.
 *
 * Form: current password, new password (+ confirm), and a "log out other
 * devices" switch. On valid submit → `useChangePasswordMutation`, which calls
 * `POST /users/me/change-password`. That endpoint ROTATES the refresh token, so
 * the mutation rewrites the keychain copy + in-memory access token; this screen
 * only handles UX (success notice → back, error message). A screen (not a sheet)
 * because of the three secure fields + toggle + keyboard.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChangePasswordMutation } from '@/api/mutations';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import { Icon, IconButton } from '@/components/Icons';
import { ReusableInput, ReusableText, Switch } from '@/components/Inputs';
import { ListRow, ScreenLayout, TabHeader } from '@/components/Layout';
import { ChevronLeftIcon, KeyIcon } from '@/assets/icons';
import { authErrorMessage } from '@/features/auth/errors';
import { type ChangePasswordFormData, changePasswordSchema } from '@/features/auth/schemas';

const ChangePasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);

  const { mutate: changePassword, isPending, error } = useChangePasswordMutation();

  const { control, handleSubmit } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      logoutOtherDevices: false,
    },
  });

  // Zod error messages are i18n keys (RTSH pattern) — resolve at render time.
  const tr = (key?: string) => (key ? t(key) : undefined);

  const onSubmit = handleSubmit(({ oldPassword, newPassword, logoutOtherDevices }) =>
    changePassword(
      { oldPassword, newPassword, logoutOtherDevices },
      {
        onSuccess: () => {
          updateModalSlice({
            currentModal: 'notify',
            modalData: { title: t('settings.change_password.title'), description: t('settings.change_password.success') },
          });
          router.back();
        },
      },
    ),
  );

  // Prefer the stable backend `code`; 400 alone is ambiguous (wrong old vs unchanged).
  const errorText = error
    ? authErrorMessage(
        error,
        undefined,
        {
          'auth.invalid_old_password': t('settings.change_password.old_incorrect'),
          'auth.password_unchanged': t('auth.errors.password_unchanged'),
        },
      )
    : null;

  return (
    <ScreenLayout>
      <TabHeader
        title={t('settings.change_password.title')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="change-password-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="oldPassword"
          render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
            <ReusableInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('settings.change_password.current_placeholder')}
              leftIcon={<Icon as={KeyIcon} size={19} color={colors.textMuted} />}
              isPassword
              autoComplete="current-password"
              errorText={tr(fieldError?.message)}
              testID="change-password-old-input"
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
            <ReusableInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('settings.change_password.new_placeholder')}
              leftIcon={<Icon as={KeyIcon} size={19} color={colors.textMuted} />}
              isPassword
              autoComplete="new-password"
              errorText={tr(fieldError?.message)}
              testID="change-password-new-input"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
            <ReusableInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('settings.change_password.confirm_placeholder')}
              leftIcon={<Icon as={KeyIcon} size={19} color={colors.textMuted} />}
              isPassword
              autoComplete="new-password"
              errorText={tr(fieldError?.message)}
              testID="change-password-confirm-input"
            />
          )}
        />

        <View style={[styles.toggleCard, { backgroundColor: colors.surface }]}>
          <Controller
            control={control}
            name="logoutOtherDevices"
            render={({ field: { value, onChange } }) => (
              <ListRow
                title={t('settings.change_password.logout_others.title')}
                subtitle={t('settings.change_password.logout_others.subtitle')}
                right={<Switch value={value} onValueChange={onChange} testID="change-password-logout-others" />}
                showDivider={false}
                testID="change-password-logout-others-row"
              />
            )}
          />
        </View>

        {errorText ? (
          <ReusableText variant="caption" themeColor="error" textAlign="center" style={styles.error}>
            {errorText}
          </ReusableText>
        ) : null}

        <ReusableBtn
          label={t('settings.change_password.submit')}
          onPress={onSubmit}
          variant="primary"
          size="large"
          isLoading={isPending}
          style={styles.submit}
          testID="change-password-submit"
        />
      </ScrollView>
    </ScreenLayout>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_24,
    paddingBottom: SPACING.space_24,
    gap: SPACING.space_16,
  },
  toggleCard: {
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
  },
  error: {
    marginTop: SPACING.space_4,
  },
  submit: {
    marginTop: SPACING.space_8,
  },
});
