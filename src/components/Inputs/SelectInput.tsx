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
import { darkTheme } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { isTV } from '@/tv';

import ReusableText from './ReusableText';
import SegmentedChoice from './SegmentedChoice';

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
  // @expo/ui renders Picker as a native SwiftUI/Compose control — it ignores
  // our theme entirely unless the Host is explicitly told the scheme + tint,
  // so without this it always shows the OS-default (light/white) menu button.
  const resolvedScheme = colors.background === darkTheme.background ? 'dark' : 'light';

  return (
    <View>
      {label ? (
        <ReusableText variant="label" themeColor="textMuted" style={styles.label}>
          {label}
        </ReusableText>
      ) : null}

      {isTV ? (
        // `@expo/ui`'s Picker is a native Jetpack Compose view hosted inside the
        // RN tree. Compose owns its own focus system and does NOT hand the D-pad
        // back to React Native, so on Android TV focus enters the picker and can
        // never leave — on the register form that stranded the terms checkbox and
        // the submit button, making signup impossible (device-verified
        // 2026-08-17; pre-registered as a risk in plan.md 22.18-TV).
        // The pill row is plain RN, so focus traverses it normally, and this form
        // already uses it one field above for gender. Touch platforms keep the
        // native menu — this branch is inert off-TV.
        <SegmentedChoice
          options={options}
          value={value as T}
          onChange={onChange}
          testID={testID}
        />
      ) : (
        <View style={[styles.field, { backgroundColor: colors.inputBackground, borderColor }]}>
          <Host matchContents style={styles.host} colorScheme={resolvedScheme} seedColor={colors.primary}>
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
      )}

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
