/**
 * Full-screen loading overlay. Centers an `ActivityIndicator` with an
 * optional message below. Theme-aware background. Use as a top-level
 * `return` while a screen is loading critical data.
 */
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

import ReusableText from '../Inputs/ReusableText';

export type SpinnerSize = 'small' | 'large';

export type FullScreenLoaderProps = {
  message?: string;
  spinnerSize?: SpinnerSize;
  /** Theme background color token. Defaults to `'background'`. */
  backgroundColor?: keyof ThemeColors;
  /** Theme color for the spinner + message. Defaults to `'primary'`. */
  tintColor?: keyof ThemeColors;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  message,
  spinnerSize = 'large',
  backgroundColor = 'background',
  tintColor = 'primary',
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View
      style={[styles.container, { backgroundColor: colors[backgroundColor] }, style]}
      testID={testID}
    >
      <ActivityIndicator size={spinnerSize} color={colors[tintColor]} />
      {message ? (
        <ReusableText
          variant="bodySmall"
          themeColor="textMuted"
          textAlign="center"
          style={styles.message}
        >
          {message}
        </ReusableText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    marginTop: 12,
  },
});

export default FullScreenLoader;
