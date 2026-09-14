/**
 * Inline legal notice for the auth forms — "By continuing, you agree to our
 * Terms & Conditions and Privacy Policy". The two links open in an in-app
 * browser (`openLink`) so the user never leaves the app. Strings + URLs
 * are centralized (i18n `auth.terms` + `LINKS`), so this stays reusable.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONTSIZE } from '@/theme/fonts';
import ReusableText from '@/components/Inputs/ReusableText';
import { openLink } from '@/utils/openLink';
import { LINKS } from '@/constants/links';

export interface TermsNoticeProps {
  testID?: string;
}

const TermsNotice: React.FC<TermsNoticeProps> = ({ testID }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID={testID}>
      <ReusableText variant="caption" themeColor="textMuted" textAlign="center">
        {t('auth.terms.agree_prefix')}{' '}
        <ReusableText
          variant="caption"
          themeColor="primary"
          fontSize={FONTSIZE.regular}
          style={styles.link}
          onPress={() => openLink(LINKS.TERMS)}
          testID={testID ? `${testID}-terms` : undefined}
        >
          {t('auth.terms.terms_link')}
        </ReusableText>{' '}
        {t('auth.terms.and')}{' '}
        <ReusableText
          variant="caption"
          themeColor="primary"
          fontSize={FONTSIZE.regular}
          style={styles.link}
          onPress={() => openLink(LINKS.PRIVACY)}
          testID={testID ? `${testID}-privacy` : undefined}
        >
          {t('auth.terms.privacy_link')}
        </ReusableText>
      </ReusableText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  link: {
    textDecorationLine: 'underline',
  },
});

export default TermsNotice;
