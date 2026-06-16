/**
 * Centered footer link shared by the auth screens — a muted prefix followed by
 * a bold primary link ("Don't have an account? Sign up", "Already have an
 * account? Sign in", "Back to Sign in"). Replaces the same inline markup that
 * was duplicated across login / register / forgot.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

export interface AuthFooterLinkProps {
  /** Muted text shown before the link. Optional. */
  prefix?: string;
  /** The tappable, primary-colored label. */
  linkLabel: string;
  onPress: () => void;
  testID?: string;
}

const AuthFooterLink: React.FC<AuthFooterLinkProps> = ({ prefix, linkLabel, onPress, testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} testID={testID}>
      <ReusableText fontSize={FONTSIZE.regular} themeColor="textMuted" textAlign="center">
        {prefix ? `${prefix} ` : ''}
        <ReusableText
          fontSize={FONTSIZE.regular}
          style={{ color: colors.primary, fontFamily: Fonts.bold }}
        >
          {linkLabel}
        </ReusableText>
      </ReusableText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
});

export default AuthFooterLink;
