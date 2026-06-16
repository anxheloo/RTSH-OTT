/**
 * FilterChipRow — horizontally scrollable single-select chips (design
 * `chiprow`/`chip`): the Home package filter (Të gjitha / Bazë / Sport …).
 * Selected chip is solid brand red; others are surface + hairline. Theme-tokened,
 * controlled, generic over the value.
 */
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useHaptic } from '@/hooks/useHaptic';

import ReusableText from './ReusableText';

export interface FilterChip<T extends string> {
  label: string;
  value: T;
}

export interface FilterChipRowProps<T extends string> {
  chips: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

function FilterChipRow<T extends string>({
  chips,
  value,
  onChange,
  testID,
}: FilterChipRowProps<T>) {
  const colors = useAppStore((s) => s.colors);
  const haptics = useHaptic();

  const handleSelect = (next: T) => {
    if (next === value) return;
    haptics.selection();
    onChange(next);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      testID={testID}
    >
      {chips.map((chip) => {
        const isActive = chip.value === value;
        return (
          <TouchableOpacity
            key={chip.value}
            onPress={() => handleSelect(chip.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            testID={testID ? `${testID}-${chip.value}` : undefined}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <ReusableText variant="label" themeColor={isActive ? 'onPrimary' : 'textMuted'}>
              {chip.label}
            </ReusableText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.space_8,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_4,
  },
  chip: {
    paddingVertical: SPACING.space_8,
    paddingHorizontal: SPACING.space_15,
    borderWidth: 1,
    borderRadius: BORDERRADIUS.radius_20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FilterChipRow;
