/**
 * 3-segment progress indicator for the multi-step auth wizards (register/reset).
 * Adapted from the RTSH `StepHeader`. `currentStep` is 1-based; every segment up
 * to and including the current step fills with the primary color.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';

export interface StepHeaderProps {
  /** 1-based index of the step currently shown. */
  currentStep: number;
  totalSteps?: number;
  testID?: string;
}

const StepHeader: React.FC<StepHeaderProps> = ({ currentStep, totalSteps = 3, testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={styles.container} testID={testID}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < currentStep ? colors.primary : colors.surface },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.space_8,
    paddingVertical: SPACING.space_16,
  },
  segment: {
    flex: 1,
    maxWidth: 74,
    height: 3,
    borderRadius: BORDERRADIUS.full,
  },
});

export default StepHeader;
