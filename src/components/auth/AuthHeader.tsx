/**
 * Auth screen header (design `hdr`): a back button on the left, a centered
 * title, and a balancing spacer on the right. Handles its own top safe-area
 * inset. Used by register / forgot — login keeps the branded logo header.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ChevronLeftIcon } from '@/assets/icons';

const HIT_SLOT = 40;

export interface AuthHeaderProps {
  title: string;
  onBack: () => void;
  testID?: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ title, onBack, testID }) => {
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.space_8 }]} testID={testID}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={styles.side}
        accessibilityRole="button"
        testID={testID ? `${testID}-back` : 'auth-header-back'}
      >
        <Icon as={ChevronLeftIcon} size={24} color={colors.text} />
      </TouchableOpacity>

      <ReusableText variant="heading3" themeColor="text" textAlign="center">
        {title}
      </ReusableText>

      <View style={styles.side} />
    </View>
  );
};

export default AuthHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_12,
  },
  side: {
    width: HIT_SLOT,
    height: HIT_SLOT,
    justifyContent: 'center',
  },
});
