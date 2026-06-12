/**
 * AdOverlay — full-screen ad creative (design `adpop`). A centered card with a
 * 3:4 creative (brand row + headline + CTA over the creative art or a brand
 * surface), a "REKLAMË" label, and a skip control that counts down before it
 * becomes tappable. v1 creatives are static; video is a later capability.
 *
 * This component is presentational + self-timed — the slot orchestration
 * (launch / channel-switch / scheduled, frequency cap) is Phase 16. It's mounted
 * only while shown (the parent renders it conditionally), so the skip countdown
 * starts on mount. `onComplete` fires when the user skips (the single dismissal
 * path in v1); `onClickthrough` (or the default in-app browser) opens the CTA.
 *
 * The creative is its own brand surface — text colours are fixed (white / brand)
 * and theme-independent, since the card always sits over dark art.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import * as WebBrowser from 'expo-web-browser';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useCountdown } from '@/hooks';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import ReusableImage from '@/components/Media/ReusableImage';
import type { AdCreative } from '@/types/domain';
import { ChevronRightIcon } from '@/assets/icons';

const SCRIM = 'rgba(0,0,0,0.85)';
/** Brand-dark stand-in for the design's creative gradient (kept dep-free — no gradient lib). */
const CREATIVE_FALLBACK = '#2A0C14';
const DEFAULT_SKIP_AFTER = 5;

// Creative-surface colours (design `adpop`). Fixed, theme-independent — the card
// is always over dark art, so these never swap with light/dark mode.
const AD = {
  white: '#FFFFFF',
  brand: '#EB122F',
  tag: '#FFD2D8',
  sub: '#F0D6DA',
  ctaText: '#111111',
} as const;

export interface AdOverlayProps {
  creative: AdCreative;
  /** Seconds before the ad can be skipped (design ~5s). */
  skipAfter?: number;
  /** Fired when the user skips (the v1 dismissal path) — continue the app flow. */
  onComplete: () => void;
  /** CTA tap. Defaults to opening `creative.ctaUrl` in the in-app browser. */
  onClickthrough?: (creative: AdCreative) => void;
  testID?: string;
}

const AdOverlay: React.FC<AdOverlayProps> = ({
  creative,
  skipAfter = DEFAULT_SKIP_AFTER,
  onComplete,
  onClickthrough,
  testID,
}) => {
  const { t } = useTranslation();
  // Paused while backgrounded: the skip delay means "seconds actually viewed",
  // so flipping to the home screen must not burn the countdown.
  const { remaining, isDone: canSkip } = useCountdown(skipAfter, {
    proceedInBackground: false,
    tickMs: 500,
  });

  const handleCta = () => {
    if (onClickthrough) {
      onClickthrough(creative);
      return;
    }
    if (creative.ctaUrl) WebBrowser.openBrowserAsync(creative.ctaUrl).catch(() => {});
  };

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={canSkip ? onComplete : undefined}
      testID={testID}
    >
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.creative}>
            {creative.imageUrl ? (
              <ReusableImage
                source={creative.imageUrl}
                width="100%"
                height="100%"
                contentFit="cover"
                containerStyle={StyleSheet.absoluteFill}
              />
            ) : null}

            {/* Brand row */}
            <View style={styles.brandRow}>
              <View style={styles.brandLogo}>
                <ReusableText
                  fontSize={FONTSIZE.regular}
                  fontWeight="extraBold"
                  style={{ color: AD.brand }}
                >
                  {creative.brandMonogram ?? creative.brand.charAt(0)}
                </ReusableText>
              </View>
              <ReusableText fontSize={FONTSIZE.regular} fontWeight="extraBold" style={{ color: AD.white }}>
                {creative.brand}
              </ReusableText>
            </View>

            {/* REKLAMË label */}
            <View style={styles.label}>
              <ReusableText
                fontSize={FONTSIZE.xs}
                fontWeight="extraBold"
                style={[styles.labelText, { color: AD.white }]}
              >
                {t('ads.label')}
              </ReusableText>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <ReusableText
                fontSize={FONTSIZE.xs}
                fontWeight="bold"
                style={[styles.tag, { color: AD.tag }]}
              >
                {creative.tag}
              </ReusableText>
              <ReusableText
                fontSize={FONTSIZE.title}
                fontWeight="extraBold"
                lineHeight={30}
                style={[styles.headline, { color: AD.white }]}
              >
                {creative.headline}
              </ReusableText>
              {creative.subtitle ? (
                <ReusableText fontSize={FONTSIZE.sm} style={[styles.sub, { color: AD.sub }]}>
                  {creative.subtitle}
                </ReusableText>
              ) : null}
              <Pressable style={styles.cta} onPress={handleCta} testID="ad-cta">
                <ReusableText
                  fontSize={FONTSIZE.regular}
                  fontWeight="extraBold"
                  style={{ color: AD.ctaText }}
                >
                  {creative.ctaLabel}
                </ReusableText>
                <Icon as={ChevronRightIcon} size={15} color={AD.ctaText} />
              </Pressable>
            </View>

            {/* Skip / countdown */}
            <Pressable
              style={[styles.skip, canSkip && styles.skipReady]}
              onPress={canSkip ? onComplete : undefined}
              disabled={!canSkip}
              testID="ad-skip"
            >
              <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" style={{ color: AD.white }}>
                {canSkip ? t('ads.skip') : t('ads.skip_in', { seconds: remaining })}
              </ReusableText>
              {canSkip ? <Icon as={ChevronRightIcon} size={14} color={AD.white} /> : null}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdOverlay;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: SCRIM,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.space_18,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
  },
  creative: {
    aspectRatio: 3 / 4,
    backgroundColor: CREATIVE_FALLBACK,
  },
  brandRow: {
    position: 'absolute',
    top: SPACING.space_18,
    left: SPACING.space_18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: BORDERRADIUS.radius_8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: SPACING.space_12,
    right: SPACING.space_12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
  },
  labelText: {
    letterSpacing: 1.2,
  },
  body: {
    position: 'absolute',
    left: SPACING.space_20,
    right: SPACING.space_20,
    bottom: SPACING.space_20,
  },
  tag: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headline: {
    marginTop: SPACING.space_8,
    marginBottom: SPACING.space_8,
  },
  sub: {
    marginBottom: SPACING.space_16,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.space_18,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.pill_input,
  },
  skip: {
    position: 'absolute',
    bottom: SPACING.space_12,
    right: SPACING.space_12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.pill_input,
  },
  skipReady: {
    backgroundColor: '#EB122F',
    borderColor: '#EB122F',
  },
});
