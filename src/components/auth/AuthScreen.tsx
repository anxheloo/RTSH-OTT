/**
 * Shared chrome for every auth screen: keyboard-avoiding container, branded
 * header logo, and a scroll area with the standard padding. Screens drop their
 * fields as children (auto-spaced by `contentGap`) and optionally a `topSlot`
 * rendered just under the header (e.g. the wizard `StepHeader`).
 *
 * Extracted so login / register / forgot stop re-declaring the same chrome.
 */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableImage from '@/components/Media/ReusableImage';

export interface AuthScreenProps {
  children: React.ReactNode;
  /** Rendered between the header and the form (e.g. the wizard step indicator). */
  topSlot?: React.ReactNode;
  /** Vertical gap between children. Defaults to 16. */
  contentGap?: number;
  testID?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  children,
  topSlot,
  contentGap = SPACING.space_16,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      <View
        style={[
          styles.header,
          {
            height: 78 + insets.top,
            paddingTop: insets.top,
            backgroundColor: colors.headerBackground,
          },
        ]}
      >
        <ReusableImage
          source={require('../../../assets/images/logo-glow.png')}
          width={86}
          height={38}
          contentFit="contain"
          testID={testID ? `${testID}-logo` : 'auth-header-logo'}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {topSlot}
        <View style={{ gap: contentGap }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.space_15,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.space_15,
    paddingTop: SPACING.space_32,
    paddingBottom: SPACING.space_40,
  },
});
