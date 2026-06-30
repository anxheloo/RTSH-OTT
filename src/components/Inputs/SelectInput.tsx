/**
 * SelectInput — a native single-select dropdown (`@expo/ui` universal `Picker`,
 * `appearance="menu"`: a compact button that opens the platform's native popup —
 * SwiftUI menu on iOS, Compose dropdown on Android). Styled with a label above
 * and an error below to match the other form inputs (CountryPicker/DatePicker).
 * Controlled + generic over the string value. Use for short option sets where a
 * real OS select is wanted over the SegmentedChoice pill row.
 */
import { StyleSheet, View } from 'react-native';

import { Host, Picker } from '@expo/ui';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';

import ReusableText from './ReusableText';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

export interface SelectInputProps<T extends string> {
  /** Current selection; `''` renders the (unselected) placeholder option. */
  value: T | '';
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  /** Leading "unselected" option — shown while `value` is `''`. */
  placeholder?: string;
  errorText?: string;
  testID?: string;
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder,
  errorText,
  testID,
}: SelectInputProps<T>) {
  const colors = useAppStore((s) => s.colors);

  const hasError = Boolean(errorText);
  const borderColor = hasError ? colors.error : colors.border;

  return (
    <View>
      {label ? (
        <ReusableText variant="label" themeColor="textMuted" style={styles.label}>
          {label}
        </ReusableText>
      ) : null}

      <View style={[styles.field, { borderColor }]}>
        <Host matchContents style={styles.host}>
          <Picker
            selectedValue={value}
            onValueChange={(next) => onChange(next as T)}
            appearance="menu"
            testID={testID}
          >
            {placeholder !== undefined ? <Picker.Item label={placeholder} value="" /> : null}
            {options.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </Host>
      </View>

      {hasError ? (
        <ReusableText variant="caption" themeColor="error" style={styles.subtext}>
          {errorText}
        </ReusableText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  field: {
    minHeight: 52,
    paddingHorizontal: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  host: {
    alignSelf: 'stretch',
  },
  subtext: {
    marginTop: 6,
  },
});

export default SelectInput;
