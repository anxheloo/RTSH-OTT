/**
 * DatePickerInput — a ReusableInput-styled pressable that opens the native
 * date picker. Android uses the imperative DateTimePickerAndroid.open() which
 * shows the native calendar dialog. iOS shows a spinner in a bottom sheet
 * modal with a Confirm button (so the user controls when the value commits).
 *
 * Value in / out: ISO YYYY-MM-DD string (matching the register schema).
 * Display: locale-formatted long date via Intl.DateTimeFormat.
 */
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import { Icon } from '@/components/Icons';
import { ClockIcon } from '@/assets/icons';

import ReusableText from './ReusableText';

export interface DatePickerInputProps {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  placeholder?: string;
  errorText?: string;
  testID?: string;
}

const MAX_DATE = new Date();
const MIN_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(1990, 0, 1);

const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISO = (iso: string): Date => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? DEFAULT_DATE : d;
};

const formatDisplay = (iso: string): string | null => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('sq-AL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(parseISO(iso));
  } catch {
    return iso;
  }
};

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Zgjidh datën e lindjes',
  errorText,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ? parseISO(value) : DEFAULT_DATE);

  const currentDate = value ? parseISO(value) : DEFAULT_DATE;

  const handleOpen = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        display: 'spinner',
        maximumDate: MAX_DATE,
        minimumDate: MIN_DATE,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(toISO(date));
          }
        },
      });
    } else {
      setTempDate(currentDate);
      setShowIOSModal(true);
    }
  };

  const confirmIOS = () => {
    onChange(toISO(tempDate));
    setShowIOSModal(false);
  };

  // Extracted so TypeScript resolves the union-typed onValueChange outside JSX.
  const handleSpinnerChange = (_e: DateTimePickerChangeEvent, d: Date) => setTempDate(d);

  const hasError = Boolean(errorText);
  const borderColor = hasError ? colors.error : colors.border;
  const displayText = formatDisplay(value);

  return (
    <View>
      {label ? (
        <ReusableText variant="label" themeColor="textMuted" style={styles.label}>
          {label}
        </ReusableText>
      ) : null}

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[styles.field, { backgroundColor: colors.inputBackground, borderColor }]}
        testID={testID}
      >
        <Icon as={ClockIcon} size={19} color={colors.textMuted} />
        <ReusableText
          variant="bodySmall"
          style={[styles.value, { color: displayText ? colors.text : colors.textMuted }]}
          numberOfLines={1}
        >
          {displayText ?? placeholder}
        </ReusableText>
      </TouchableOpacity>

      {hasError ? (
        <ReusableText variant="caption" themeColor="error" style={styles.subtext}>
          {errorText}
        </ReusableText>
      ) : null}

      {/* iOS bottom-sheet date spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showIOSModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSModal(false)}
        >
          <View style={styles.backdrop}>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={MAX_DATE}
                minimumDate={MIN_DATE}
                themeVariant="dark"
                onValueChange={handleSpinnerChange}
                style={styles.spinner}
                testID={testID ? `${testID}-picker` : undefined}
              />
              <View style={styles.actions}>
                <ReusableBtn
                  label="Anulo"
                  onPress={() => setShowIOSModal(false)}
                  variant="secondary"
                  size="medium"
                  style={styles.actionBtn}
                />
                <ReusableBtn
                  label="Konfirmo"
                  onPress={confirmIOS}
                  variant="primary"
                  size="medium"
                  style={styles.actionBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  subtext: {
    marginTop: 6,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.space_16,
    paddingHorizontal: SPACING.space_20,
    paddingBottom: SPACING.space_40,
  },
  spinner: {
    height: 200,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.space_12,
    marginTop: SPACING.space_16,
  },
  actionBtn: {
    flex: 1,
  },
});

export default DatePickerInput;
