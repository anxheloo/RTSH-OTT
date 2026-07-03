/**
 * CountryPickerInput — a ReusableInput-styled pressable that opens a bottom-sheet
 * modal with a searchable country list. Fully in-house (2026-07-03): the previous
 * react-native-country-picker-modal dependency was unmaintained (and broke web
 * bundling via a dead transitive dep), so the sheet now renders our own FlatList
 * over the static `COUNTRIES` dataset (same English common names — the stored
 * `value`/backend payload is unchanged). Flags are emoji derived from the ISO
 * code, so there are no image assets. We own the Modal, so safe-area insets and
 * theme tokens apply exactly like every other sheet.
 */
import React, { useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { ChevronRightIcon, GlobeIcon } from '@/assets/icons';
import { COUNTRIES, type CountryEntry,countryFlag } from '@/constants/countries';

import ReusableText from './ReusableText';
import SearchBar from './SearchBar';

export interface CountryPickerInputProps {
  value: string;
  onChange: (countryName: string) => void;
  label?: string;
  placeholder?: string;
  errorText?: string;
  testID?: string;
}

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.75);
const ROW_HEIGHT = 52;

const CountryPickerInput: React.FC<CountryPickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Zgjidh shtetin',
  errorText,
  testID,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES as CountryEntry[];
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const handleSelect = (country: CountryEntry) => {
    onChange(country.name);
    setQuery('');
    setOpen(false);
  };

  const handleClose = () => {
    setQuery('');
    setOpen(false);
  };

  const hasError = Boolean(errorText);
  const borderColor = hasError ? colors.error : colors.border;

  const renderRow = ({ item }: { item: CountryEntry }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityState={{ selected: item.name === value }}
      testID={`country-row-${item.code}`}
    >
      <ReusableText variant="body" style={styles.flag}>
        {countryFlag(item.code)}
      </ReusableText>
      <ReusableText
        variant="bodySmall"
        themeColor={item.name === value ? 'primary' : 'text'}
        numberOfLines={1}
        style={styles.rowName}
      >
        {item.name}
      </ReusableText>
    </TouchableOpacity>
  );

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
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: value || placeholder }}
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
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />

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
            <View style={styles.search}>
              <SearchBar
                placeholder={placeholder}
                value={query}
                onChangeText={setQuery}
                testID={testID ? `${testID}-search` : undefined}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              // Fixed row height → cheap layout for a 250-item static list.
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
              testID={testID ? `${testID}-list` : undefined}
            />
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
  search: {
    paddingHorizontal: SPACING.space_16,
    paddingTop: SPACING.space_16,
    paddingBottom: SPACING.space_8,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 22,
  },
  rowName: {
    flex: 1,
  },
});

export default CountryPickerInput;
