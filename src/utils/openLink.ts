/**
 * Opens an external page (Terms, Privacy) — the one door every legal link uses.
 *
 * Phones/tablets get the in-app browser (Custom Tabs / SFSafariViewController).
 * Android TV does NOT: Custom Tabs launches whatever app claims the browser role,
 * and on TV boxes that is often a video player whose web activity isn't exported.
 * The resulting SecurityException is thrown natively inside expo-web-browser's
 * `BrowserProxyActivity.onCreate`, so no JS catch can stop the crash
 * (REACT-NATIVE-RTSH-OTT-M). `Linking.openURL` resolves a plain VIEW intent and
 * rejects on failure instead, which we swallow — no browser on a TV is a no-op.
 */
import { Linking, Platform } from 'react-native';

import * as WebBrowser from 'expo-web-browser';

export const openLink = (url: string): void => {
  const opening = Platform.isTV ? Linking.openURL(url) : WebBrowser.openBrowserAsync(url);
  void opening.catch(() => {});
};
