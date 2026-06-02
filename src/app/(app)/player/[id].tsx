/**
 * Player modal — full-screen live/VOD player.
 * Scaffold only — full implementation in Phase 9 (Player).
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

const PlayerScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
        testID="player-back-btn"
      >
        <ReusableText fontSize={FONTSIZE.md} themeColor="text">
          ← Back
        </ReusableText>
      </TouchableOpacity>

      <ReusableText
        variant="heading3"
        themeColor="textMuted"
        textAlign="center"
        style={styles.placeholder}
      >
        Player — Phase 9{'\n'}Channel: {id}
      </ReusableText>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.space_56,
    left: SPACING.space_15,
  },
  placeholder: {
    paddingHorizontal: SPACING.space_24,
  },
});

export default PlayerScreen;
