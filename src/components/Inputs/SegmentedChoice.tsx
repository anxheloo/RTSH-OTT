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
import { useHaptic } from '@/hooks/useHaptic';
import { tvFocusHighlight, useTVFocus } from '@/tv';

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

/**
 * One pill. Extracted so each can own a `useTVFocus` subscription (a hook can't
 * live inside the parent's `.map`). Off-TV `tvFocusHighlight` returns undefined,
 * so the rendered output is byte-identical to the pre-TV version.
 */
function Segment<T extends string>({
  option,
  isActive,
  onSelect,
  testID,
}: {
  option: SegmentedChoiceOption<T>;
  isActive: boolean;
  onSelect: (value: T) => void;
  testID?: string;
}) {
  const colors = useAppStore((s) => s.colors);
  const { focused, focusProps } = useTVFocus();

  return (
    <TouchableOpacity
      {...focusProps}
      onPress={() => onSelect(option.value)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={testID}
      style={[
        styles.option,
        {
          backgroundColor: isActive ? PRIMARY_TINT : colors.surface,
          borderColor: isActive ? colors.primary : colors.border,
        },
        // Last: the ring must win over the selected-state border, otherwise the
        // focused pill is indistinguishable from the selected one. `scale: false`
        // because the pills are `flex: 1` across the full row — a 1.05 pop on the
        // outer ones pushes past the screen edge.
        tvFocusHighlight(colors.focus, focused, { scale: false }),
      ]}
    >
      <ReusableText
        variant="label"
        themeColor={isActive ? 'text' : 'textMuted'}
        textAlign="center"
        numberOfLines={1}
      >
        {option.label}
      </ReusableText>
    </TouchableOpacity>
  );
}

function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedChoiceProps<T>) {
  const haptics = useHaptic();

  const handleSelect = (next: T) => {
    if (next === value) return;
    haptics.selection();
    onChange(next);
  };

  return (
    <View style={styles.row} testID={testID}>
      {options.map((opt) => (
        <Segment
          key={opt.value}
          option={opt}
          isActive={opt.value === value}
          onSelect={handleSelect}
          testID={testID ? `${testID}-${opt.value}` : undefined}
        />
      ))}
    </View>
  );
}

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

export default SegmentedChoice;
