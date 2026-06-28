/**
 * AdOverlay — full-screen ad creative. Renders the backend-served `mediaUrl`
 * by `creative.type`: an IMAGE goes through `ReusableImage`, a VIDEO through the
 * base `VideoPlayer` (autoplay, no native controls). A "REKLAMË" label and a
 * skip control are overlaid on either, driven by the creative's `skippable` +
 * `skipAfterSeconds` fields. When not skippable the overlay auto-dismisses after
 * `durationSeconds`. `onComplete` fires on every path (skip, timer, or — for
 * video — natural end) and is the single dismissal callback.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { BlurView } from 'expo-blur';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useCountdown } from '@/hooks';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { AnimatedView } from '@/components/Layout';
import ReusableImage from '@/components/Media/ReusableImage';
import VideoPlayer from '@/components/Media/VideoPlayer';
import type { AdCreative } from '@/types/domain';
import { ChevronRightIcon } from '@/assets/icons';

const SCRIM = 'rgba(0,0,0,0.85)';
const CREATIVE_FALLBACK = '#2A0C14';
// Blur applied to the cover copy that fills the letterbox gaps behind a contained image.
const CREATIVE_BLUR_RADIUS = 24;
// Zoom enter/exit for the whole ad card. Enter springs in with a bounce;
// exit zooms straight out (faster, no overshoot on the way off-screen).
const ZOOM_IN = ZoomIn.springify().damping(11).mass(0.7).stiffness(140);
const ZOOM_OUT = ZoomOut.duration(220);

// Creative-surface colours — fixed, theme-independent (card is always over dark art).
const AD = {
  white: '#FFFFFF',
  label: 'rgba(0,0,0,0.55)',
} as const;

export interface AdOverlayProps {
  creative: AdCreative;
  onComplete: () => void;
  /** Fired ONCE when the overlay mounts — used to report the ad impression. */
  onShown?: () => void;
  testID?: string;
}

const AdOverlay: React.FC<AdOverlayProps> = ({ creative, onComplete, onShown, testID }) => {
  const { t } = useTranslation();

  // One mount = one impression. Report it once when the overlay appears.
  useEffect(() => {
    onShown?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown runs for skipAfterSeconds (skippable) or durationSeconds (non-skippable).
  // Either way, when the timer finishes the user can always dismiss the ad.
  const skipAfter = creative.skippable ? creative.skipAfterSeconds : creative.durationSeconds;
  const { remaining, isDone: canSkip } = useCountdown(skipAfter, {
    proceedInBackground: false,
    tickMs: 500,
  });

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={canSkip ? onComplete : undefined}
      testID={testID}
    >
      <View style={styles.scrim}>
        <AnimatedView
          style={styles.card}
          entering={ZOOM_IN}
          exiting={ZOOM_OUT}
        >
          <View style={styles.creative}>
            {creative.type === 'VIDEO' ? (
              // expo-video's VideoView defaults to contentFit="contain", so the clip
              // is letterboxed (never cropped). A transparent player container lets the
              // frosted BlurView fill the letterbox gaps behind it.
              <>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <VideoPlayer
                  source={creative.mediaUrl}
                  autoPlay
                  onPlayEnd={onComplete}
                  style={[StyleSheet.absoluteFill, styles.transparentFill]}
                />
              </>
            ) : (
              <>
                {/* Blurred cover copy fills the letterbox gaps behind the contained image. */}
                <ReusableImage
                  source={creative.mediaUrl}
                  width="100%"
                  height="100%"
                  contentFit="cover"
                  blurRadius={CREATIVE_BLUR_RADIUS}
                  containerStyle={StyleSheet.absoluteFill}
                />
                {/* Contained foreground — never cropped. Transparent container so the blur shows through. */}
                <ReusableImage
                  source={creative.mediaUrl}
                  width="100%"
                  height="100%"
                  contentFit="contain"
                  containerStyle={[StyleSheet.absoluteFill, styles.transparentFill]}
                />
              </>
            )}

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

            {/* Skip / countdown — always shown; tappable only when timer has elapsed */}
            <Pressable
              style={[styles.skip, canSkip && styles.skipReady]}
              onPress={canSkip ? onComplete : undefined}
              disabled={!canSkip}
              testID="ad-skip"
            >
              <ReusableText
                fontSize={FONTSIZE.sm}
                lineHeight={FONTSIZE.sm}
                fontWeight="bold"
                style={{ color: AD.white }}
              >
                {canSkip ? t('ads.skip') : t('ads.skip_in', { seconds: remaining })}
              </ReusableText>
              {canSkip ? <Icon as={ChevronRightIcon} size={14} color={AD.white} /> : null}
            </Pressable>
          </View>
        </AnimatedView>
      </View>
    </Modal>
  );
};

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
  transparentFill: {
    backgroundColor: 'transparent',
  },
  label: {
    position: 'absolute',
    top: SPACING.space_12,
    right: SPACING.space_12,
    backgroundColor: AD.label,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
  },
  labelText: {
    letterSpacing: 1.2,
  },
  skip: {
    position: 'absolute',
    bottom: SPACING.space_20,
    right: SPACING.space_20,
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

export default AdOverlay;
