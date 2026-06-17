/**
 * ListStateView — the shared centered block for a list's non-data states
 * (genuinely empty, or load failure): title + optional subtitle + optional
 * retry button. Presentational and domain-agnostic; callers pass the copy.
 * `ErrorState` and the domain `Empty*State` wrappers build on it so every
 * list placeholder looks identical. Drop into a FlashList's `ListEmptyComponent`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

import ReusableBtn from '../Buttons/ReusableBtn';
import ReusableText from '../Inputs/ReusableText';

export interface ListStateViewProps {
  title: string;
  subtitle?: string;
  /** Retry button label. The button renders only when both `onRetry` and a label are set. */
  retryLabel?: string;
  onRetry?: () => void;
  testID?: string;
}

const ListStateView: React.FC<ListStateViewProps> = ({
  title,
  subtitle,
  retryLabel,
  onRetry,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testID}>
      <ReusableText variant="heading3" themeColor="text" textAlign="center">
        {title}
      </ReusableText>

      {!!subtitle && (
        <ReusableText variant="body" themeColor="textMuted" textAlign="center" style={styles.subtitle}>
          {subtitle}
        </ReusableText>
      )}

      {!!onRetry && !!retryLabel && (
        <ReusableBtn
          label={retryLabel}
          variant="primary"
          size="medium"
          onPress={onRetry}
          style={styles.btn}
          testID={testID ? `${testID}-retry` : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_32,
  },
  subtitle: {
    marginTop: SPACING.space_8,
    marginBottom: SPACING.space_24,
  },
  btn: {
    minWidth: 160,
  },
});

export default ListStateView;