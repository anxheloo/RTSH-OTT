/**
 * CenteredMessage — vertically-centered empty/blocking state (design
 * `center-pad` + `big-ic`): a large rounded icon tile, a title, optional body
 * copy, and an optional action button. Used by the geo-block and parental
 * gates. Portable: the screen owns the header; this owns only the centered block.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableText from '@/components/Inputs/ReusableText';

export interface CenteredMessageProps {
  /** Large glyph rendered inside the rounded tile (e.g. `<Icon as={GlobeIcon} .../>`). */
  icon: React.ReactNode;
  title: string;
  body?: string;
  /** Optional ghost action button (e.g. "Back to home"). */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

const CenteredMessage: React.FC<CenteredMessageProps> = ({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.iconTile, { backgroundColor: colors.surfaceElevated }]}>{icon}</View>

      <ReusableText variant="heading2" themeColor="text" textAlign="center" style={styles.title}>
        {title}
      </ReusableText>

      {body ? (
        <ReusableText variant="body" themeColor="textMuted" textAlign="center" style={styles.body}>
          {body}
        </ReusableText>
      ) : null}

      {actionLabel && onAction ? (
        <ReusableBtn
          label={actionLabel}
          onPress={onAction}
          variant="ghost"
          style={styles.action}
          testID={testID ? `${testID}-action` : undefined}
        />
      ) : null}
    </View>
  );
};

export default CenteredMessage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.space_24,
  },
  iconTile: {
    width: 80,
    height: 80,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_20,
  },
  title: {
    marginBottom: SPACING.space_8,
  },
  body: {
    maxWidth: 300,
  },
  action: {
    marginTop: SPACING.space_24,
    minWidth: 200,
  },
});
