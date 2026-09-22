/**
 * SearchablePickerInput — a ReusableInput-styled pressable that opens a
 * bottom-sheet modal with a searchable list of options. Fully in-house
 * (2026-07-03): replaced the unmaintained react-native-country-picker-modal,
 * and since 2026-09-22 shared by the country and city pickers. We own the
 * Modal, so safe-area insets and theme tokens apply exactly like every other
 * sheet. `disabled` greys the field out and keeps the sheet closed (the city
 * picker waits for a country).
 */
import React, { useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { ChevronRightIcon } from '@/assets/icons';

import ReusableText from './ReusableText';
import SearchBar from './SearchBar';

export interface PickerOption {
  /** Stored value and list key; also the label unless `label` is set. */
  value: string;
  /** Display text when it differs from the stored value (e.g. translated). */
  label?: string;
  /** Optional glyph rendered before the label (e.g. a flag emoji). */
  leading?: string;
  /** Always listed first and never filtered out by search (e.g. "Other"). */
  pinned?: boolean;
}

export interface SearchablePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly PickerOption[];
  icon?: React.FC<SvgProps>;
  label?: string;
  placeholder?: string;
  errorText?: string;
  disabled?: boolean;
  testID?: string;
}

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.75);
const ROW_HEIGHT = 52;

const SearchablePickerInput: React.FC<SearchablePickerInputProps> = ({
  value,
  onChange,
  options,
  icon,
  label,
  placeholder,
  errorText,
  disabled = false,
  testID,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? options.filter((o) => !o.pinned && (o.label ?? o.value).toLowerCase().includes(q))
      : options.filter((o) => !o.pinned);
    return [...options.filter((o) => o.pinned), ...matches];
  }, [options, query]);

  const displayValue = options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = (option: PickerOption) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  const handleClose = () => {
    setQuery('');
    setOpen(false);
  };

  const hasError = Boolean(errorText);
  const borderColor = hasError ? colors.error : colors.border;

  const renderRow = ({ item }: { item: PickerOption }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.label ?? item.value}
      accessibilityState={{ selected: item.value === value }}
      testID={testID ? `${testID}-row-${item.value}` : undefined}
    >
      {item.leading ? (
        <ReusableText variant="body" style={styles.flag}>
          {item.leading}
        </ReusableText>
      ) : null}
      <ReusableText
        variant="bodySmall"
        themeColor={item.pinned || item.value === value ? 'primary' : 'text'}
        numberOfLines={1}
        style={styles.rowName}
      >
        {item.label ?? item.value}
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
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.field,
          { backgroundColor: colors.inputBackground, borderColor, opacity: disabled ? 0.5 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: displayValue || placeholder }}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {icon ? <Icon as={icon} size={19} color={colors.textMuted} /> : null}

        <ReusableText
          variant="bodySmall"
          style={[styles.value, { color: value ? colors.text : colors.textMuted }]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
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
                placeholder={placeholder ?? ''}
                value={query}
                onChangeText={setQuery}
                testID={testID ? `${testID}-search` : undefined}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              // Fixed row height → cheap layout even for 10k+ cities (US).
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

export default SearchablePickerInput;
