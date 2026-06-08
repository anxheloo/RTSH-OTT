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

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { BrandHeader } from '@/components/Brand';

export interface AuthScreenProps {
  children: React.ReactNode;
  /**
   * Header override. Defaults to the branded logo header (login). Pass an
   * `AuthHeader` (back + title) for register / forgot.
   */
  header?: React.ReactNode;
  /** Rendered between the header and the form (e.g. the wizard step indicator). */
  topSlot?: React.ReactNode;
  /** Vertical gap between children. Defaults to 16. */
  contentGap?: number;
  testID?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  children,
  header,
  topSlot,
  contentGap = SPACING.space_16,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      {header ?? <BrandHeader testID={testID ? `${testID}-header` : 'auth-header'} />}

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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.space_15,
    paddingTop: SPACING.space_32,
    paddingBottom: SPACING.space_40,
  },
});
