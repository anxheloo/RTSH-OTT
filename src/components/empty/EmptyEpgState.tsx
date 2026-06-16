import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

import ReusableBtn from '../Buttons/ReusableBtn';
import ReusableText from '../Inputs/ReusableText';

type EmptyEpgStateProps = {
  onRetry?: () => void;
};

const EmptyEpgState: React.FC<EmptyEpgStateProps> = ({ onRetry }) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReusableText variant="heading3" themeColor="text" textAlign="center">
        {t('empty.epg_title')}
      </ReusableText>
      <ReusableText
        variant="body"
        themeColor="textMuted"
        textAlign="center"
        style={styles.subtitle}
      >
        {t('empty.epg_subtitle')}
      </ReusableText>
      {!!onRetry && (
        <ReusableBtn
          label={t('empty.retry')}
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

export default EmptyEpgState;
