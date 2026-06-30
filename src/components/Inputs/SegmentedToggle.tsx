/**
 * SegmentedToggle — 2-up (or n-up) pill switch in a rounded track (design
 * `toggle2`): used for Televizion/Radio on Home and TV/Radio in Guide. Generic
 * over the option value. Active segment gets the raised surface + white text;
 * inactive is transparent + muted. Theme-tokened, controlled.
 */
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useHaptic } from '@/hooks/useHaptic';

import ReusableText from './ReusableText';

export interface SegmentedToggleOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedToggleProps<T extends string> {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedToggleProps<T>) {
  const colors = useAppStore((s) => s.colors);
  const haptics = useHaptic();

  const handleSelect = (next: T) => {
    if (next === value) return;
    haptics.selection();
    onChange(next);
  };

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={testID}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => handleSelect(opt.value)}
            activeOpacity={0.8}
            style={[styles.segment, isActive && { backgroundColor: colors.surfaceHigh }]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            <ReusableText
              variant="label"
              themeColor={isActive ? 'text' : 'textMuted'}
              numberOfLines={1}
            >
              {opt.label}
            </ReusableText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: BORDERRADIUS.pill_input,
    padding: SPACING.space_4,
  },
  segment: {
    paddingVertical: 9,
    paddingHorizontal: SPACING.space_18,
    borderRadius: BORDERRADIUS.pill_input - SPACING.space_4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SegmentedToggle;
