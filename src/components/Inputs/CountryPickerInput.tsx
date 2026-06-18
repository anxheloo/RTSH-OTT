/**
 * CountryPickerInput — a ReusableInput-styled pressable that opens the
 * react-native-country-picker-modal search modal. The selected country
 * name (string) is surfaced via `onChange`; the ISO cca2 code is tracked
 * internally so the modal highlights the correct entry on re-open.
 */
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import CountryPicker, { Country, CountryCode, DARK_THEME } from 'react-native-country-picker-modal';

import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { ChevronRightIcon, GlobeIcon } from '@/assets/icons';

import ReusableText from './ReusableText';

export interface CountryPickerInputProps {
  value: string;
  onChange: (countryName: string) => void;
  label?: string;
  placeholder?: string;
  errorText?: string;
  testID?: string;
}

/** world-countries `name` can be a string or a `{ common, official }` object. */
const extractName = (name: unknown): string => {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') {
    const obj = name as Record<string, string>;
    return obj.common ?? obj.official ?? Object.values(obj)[0] ?? '';
  }
  return '';
};

const CountryPickerInput: React.FC<CountryPickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Zgjidh shtetin',
  errorText,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>('AL');

  const handleSelect = (country: Country) => {
    setCountryCode(country.cca2);
    onChange(extractName(country.name));
    setOpen(false);
  };

  const hasError = Boolean(errorText);
  const borderColor = hasError ? colors.error : colors.border;

  return (
    <View>
      {label ? (
        <ReusableText variant="label" themeColor="textMuted" style={styles.label}>
          {label}
        </ReusableText>
      ) : null}

      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={[styles.field, { backgroundColor: colors.inputBackground, borderColor }]}
        testID={testID}
      >
        <Icon as={GlobeIcon} size={19} color={colors.textMuted} />

        <ReusableText
          variant="bodySmall"
          style={[styles.value, { color: value ? colors.text : colors.textMuted }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </ReusableText>

        <View style={styles.chevronDown}>
          <Icon as={ChevronRightIcon} size={18} color={colors.mutedDim} />
        </View>
      </TouchableOpacity>

      {hasError ? (
        <ReusableText variant="caption" themeColor="error" style={styles.subtext}>
          {errorText}
        </ReusableText>
      ) : null}

      {/* Renders nothing visible — modal is fully controlled via `visible`. */}
      <CountryPicker
        countryCode={countryCode}
        withFilter
        withFlag
        withEmoji
        withAlphaFilter
        withCallingCode={false}
        withCurrencyButton={false}
        withCountryNameButton={false}
        visible={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        renderFlagButton={() => null}
        theme={{
          ...DARK_THEME,
          backgroundColor: colors.surface,
          primaryColor: colors.primary,
          primaryColorVariant: colors.surfaceElevated,
          onBackgroundTextColor: colors.text,
          filterPlaceholderTextColor: colors.textMuted,
          fontSize: 15,
          flagSize: 24,
          itemHeight: 52,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  field: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    flex: 1,
    fontSize: 15,
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  subtext: {
    marginTop: 6,
  },
});

export default CountryPickerInput;
