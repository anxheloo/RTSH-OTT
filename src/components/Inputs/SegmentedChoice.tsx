/**
 * SegmentedChoice — n-up full-width single-select (design `seg-choice`): gender
 * (Mashkull/Femër/Tjetër), parental min-age (7+/12+/16+/18+). Each option is an
 * equal-width pill; the selected one gets the brand tint + red border + white
 * text. Theme-tokened, controlled, generic over the value.
 */
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';

import ReusableText from './ReusableText';

/** Brand-red @14% — selected-segment tint (mark color is fixed brand red). */
const PRIMARY_TINT = 'rgba(235,18,47,0.14)';

export interface SegmentedChoiceOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedChoiceProps<T extends string> {
  options: SegmentedChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedChoiceProps<T>) {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={styles.row} testID={testID}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            testID={testID ? `${testID}-${opt.value}` : undefined}
            style={[
              styles.option,
              {
                backgroundColor: isActive ? PRIMARY_TINT : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <ReusableText variant="label" themeColor={isActive ? 'text' : 'textMuted'}>
              {opt.label}
            </ReusableText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default SegmentedChoice;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.space_10,
  },
  option: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: BORDERRADIUS.radius_14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
