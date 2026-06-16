/**
 * Inline legal notice for the auth forms — "By continuing, you agree to our
 * Terms & Conditions and Privacy Policy". The two links open in an in-app
 * browser (expo-web-browser) so the user never leaves the app. Strings + URLs
 * are centralized (i18n `auth.terms` + `LINKS`), so this stays reusable.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import * as WebBrowser from 'expo-web-browser';

import { FONTSIZE } from '@/theme/fonts';
import ReusableText from '@/components/Inputs/ReusableText';
import { LINKS } from '@/config/links';

export interface TermsNoticeProps {
  testID?: string;
}

const TermsNotice: React.FC<TermsNoticeProps> = ({ testID }) => {
  const { t } = useTranslation();

  const open = (url: string) => {
    void WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.container} testID={testID}>
      <ReusableText variant="caption" themeColor="textMuted" textAlign="center">
        {t('auth.terms.agree_prefix')}{' '}
        <ReusableText
          variant="caption"
          themeColor="primary"
          fontSize={FONTSIZE.regular}
          style={styles.link}
          onPress={() => open(LINKS.TERMS)}
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
          onPress={() => open(LINKS.PRIVACY)}
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
