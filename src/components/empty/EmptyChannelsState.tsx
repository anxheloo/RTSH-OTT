import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

import ReusableBtn from '../Buttons/ReusableBtn';
import ReusableText from '../Inputs/ReusableText';

type EmptyChannelsStateProps = {
  onRetry?: () => void;
};

const EmptyChannelsState: React.FC<EmptyChannelsStateProps> = ({ onRetry }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReusableText variant="heading3" themeColor="text" textAlign="center">
        No channels available
      </ReusableText>
      <ReusableText
        variant="body"
        themeColor="textMuted"
        textAlign="center"
        style={styles.subtitle}
      >
        Channels could not be loaded. Check your connection and try again.
      </ReusableText>
      {!!onRetry && (
        <ReusableBtn
          label="Retry"
          variant="primary"
          size="medium"
          onPress={onRetry}
          style={styles.btn}
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

export default EmptyChannelsState;
