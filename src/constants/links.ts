/**
 * External web links (legal, support). Centralized so the URLs live in one
 * place — every consumer (register accept-terms checkbox, TermsNotice, the
 * Settings legal rows) reads from here.
 *
 * Both are PDFs served off rtsh.al. iOS (SFSafariViewController) renders them
 * inline; Android Chrome Custom Tabs may hand a PDF to a download/external
 * viewer depending on Chrome version — if that reads badly on device, switch
 * these two call sites to `Linking.openURL` (the URLs stay the same).
 *
 * PRIVACY is also the URL pasted into the App Store Connect / Play Console
 * privacy-policy listing field — keep them identical.
 */
export const LINKS = {
  TERMS: 'https://rtsh.al/rreth-rtsh/kushtet-e-perdorimit-rtsh-tani/',
  PRIVACY:
    'https://rtsh.al/rreth-rtsh/rtsh-tani-platforma-ott-e-radio-televizionit-shqiptar/',
} as const;
