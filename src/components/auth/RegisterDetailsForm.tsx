/**
 * Register · step 3 — profile details (birthday / gender / city / country /
 * education). Presentational: owns its RHF form + field-level zod errors and
 * hands the valid payload up via `onSubmit`. Gender is a chip row bound through
 * a Controller. Birthday is a plain `YYYY-MM-DD` input for now — swap for a
 * native date picker in a later pass (see plan).
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import {
  type Gender,
  GENDERS,
  type RegisterDetailsData,
  registerDetailsSchema,
} from '@/features/auth/schemas';

export interface RegisterDetailsFormProps {
  onSubmit: (data: RegisterDetailsData) => void;
  isSubmitting?: boolean;
  errorText?: string;
}

const RegisterDetailsForm: React.FC<RegisterDetailsFormProps> = ({
  onSubmit,
  isSubmitting = false,
  errorText,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const { control, handleSubmit } = useForm<RegisterDetailsData>({
    resolver: zodResolver(registerDetailsSchema),
    defaultValues: { birthday: '', city: '', country: '', education: '' },
  });

  return (
    <>
      <ReusableText variant="heading3" themeColor="text">
        {t('auth.register.details_title')}
      </ReusableText>

      <Controller
        control={control}
        name="birthday"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.birthday_placeholder')}
            autoCapitalize="none"
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-birthday-input"
          />
        )}
      />

      {/* Gender chips */}
      <Controller
        control={control}
        name="gender"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View>
            <ReusableText variant="label" themeColor="textMuted" style={styles.genderLabel}>
              {t('auth.register.gender_label')}
            </ReusableText>
            <View style={styles.genderRow}>
              {GENDERS.map((g: Gender) => {
                const selected = value === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => onChange(g)}
                    activeOpacity={0.8}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.inputBackground,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    testID={`register-gender-${g}`}
                  >
                    <ReusableText
                      variant="bodySmall"
                      style={{ color: selected ? colors.onPrimary : colors.text }}
                    >
                      {t(`auth.register.gender.${g}`)}
                    </ReusableText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error?.message ? (
              <ReusableText variant="caption" themeColor="error" style={styles.genderError}>
                {error.message}
              </ReusableText>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="city"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.city_placeholder')}
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-city-input"
          />
        )}
      />

      <Controller
        control={control}
        name="country"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.country_placeholder')}
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-country-input"
          />
        )}
      />

      <Controller
        control={control}
        name="education"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.education_placeholder')}
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-education-input"
          />
        )}
      />

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.register.submit')}
        onPress={handleSubmit(onSubmit)}
        variant="primary"
        isLoading={isSubmitting}
        isFullWidth
        height={60}
        borderRadius={BORDERRADIUS.pill}
        labelFontSize={FONTSIZE.md}
        testID="register-details-submit"
      />
    </>
  );
};

export default RegisterDetailsForm;

const styles = StyleSheet.create({
  genderLabel: {
    marginBottom: SPACING.space_8,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.space_8,
  },
  chip: {
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.pill,
    borderWidth: 1,
  },
  genderError: {
    marginTop: SPACING.space_8,
  },
});
