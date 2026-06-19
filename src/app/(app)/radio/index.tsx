import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/Layout';

const RadioListScreen: React.FC = () => (
  <ScreenLayout>
    <View style={styles.fill} />
  </ScreenLayout>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

export default RadioListScreen;