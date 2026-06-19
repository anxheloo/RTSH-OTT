/**
 * CountryPickerInput — a ReusableInput-styled pressable that opens a bottom-sheet
 * modal with the country picker. We own the Modal so safe-area insets are applied
 * correctly; the library renders inline (withModal={false}) inside our sheet.
 */
import React, { useState } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import CountryPicker, { Country, CountryCode, DARK_THEME } from 'react-native-country-picker-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
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

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.75);

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
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>('AL');

  const handleSelect = (country: Country) => {
    setCountryCode(country.cca2);
    onChange(extractName(country.name));
    setOpen(false);
  };

  const handleClose = () => setOpen(false);

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

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.backdrop}>
          {/* Tapping outside the sheet closes the modal */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

          {/* Sheet — onStartShouldSetResponder prevents touches on empty space
              from reaching the backdrop TouchableOpacity */}
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, SPACING.space_16),
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {open && (
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withEmoji
                withAlphaFilter
                withCallingCode={false}
                withCurrencyButton={false}
                withCountryNameButton={false}
                withModal={false}
                visible
                onClose={handleClose}
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
            )}
          </View>
        </View>
      </Modal>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: BORDERRADIUS.radius_20,
    borderTopRightRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
  },
});

export default CountryPickerInput;
