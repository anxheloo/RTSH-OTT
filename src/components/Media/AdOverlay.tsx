/**
 * AdOverlay — full-screen ad creative. Renders the backend-served `mediaUrl`
 * by `creative.type`: an IMAGE goes through `ReusableImage`, a VIDEO through the
 * base `VideoPlayer` (autoplay, no native controls). A "REKLAMË" label is always
 * overlaid. The ad is shown for `durationSeconds` and then **auto-dismisses by
 * itself** (a video's natural end fires the same path). The skip control is
 * shown **only when `creative.skippable`** — a labelled countdown until
 * `skipAfterSeconds` elapses, then a tappable skip that ends the ad early; a
 * non-skippable creative shows no skip control and simply runs its full
 * duration. `onComplete` fires on every path (skip, duration timer, or — for
 * video — natural end) and is the single dismissal callback (the parent owns
 * visibility). The overlay **reports its own impression** on that same completion
 * (VAST/IMA convention — the ad unit beacons itself) via `reportAdImpression`,
 * exactly once, carrying the seconds actually watched (clamped to the ad
 * duration) — firing at completion (not mount) is what gives the backend a real
 * watched-time for its avg-view-rate tile. Callers pass `placement` (+ `channelId`
 * for channel ads) so the beacon is fully attributed without re-wiring per site.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { BlurView } from 'expo-blur';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { reportAdImpression } from '@/api/services/ads';
import { useCountdown } from '@/hooks';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { AnimatedView } from '@/components/Layout';
import ReusableImage from '@/components/Media/ReusableImage';
import VideoPlayer from '@/components/Media/VideoPlayer';
import type { AdCreative, AdPlacement } from '@/types/domain';
import { ChevronRightIcon } from '@/assets/icons';
import { useResponsive } from '@/responsive';

const SCRIM = 'rgba(0,0,0,0.85)';
const CREATIVE_FALLBACK = '#2A0C14';
// Failsafe bounds for creative timing — the backend has shipped mid-rolls with a
// missing / 0 / NaN `durationSeconds`, which froze the auto-dismiss countdown
// (deadline → NaN → never done) on a NON-skippable creative = a hard app lock with
// no way out. We clamp every duration so the ad ALWAYS dismisses itself within a
// bounded window regardless of what the backend sends.
const DEFAULT_AD_DURATION_S = 15; // when duration is absent/invalid
const MAX_AD_DURATION_S = 60; // hard ceiling so a bad value can't trap the viewer
const DEFAULT_SKIP_AFTER_S = 5; // when a skippable creative omits skipAfterSeconds

/** A finite, positive seconds value clamped to `max`, else `fallback`. */
const safeDuration = (value: number, fallback: number, max: number): number =>
  Number.isFinite(value) && value > 0 ? Math.min(value, max) : fallback;
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
  /** Slot this creative fills — attributes the self-reported impression beacon. */
  placement: AdPlacement;
  /** Channel the ad played on (channel-change / mid-roll); omitted for app-open. */
  channelId?: number;
  onComplete: () => void;
  testID?: string;
}

const AdOverlay: React.FC<AdOverlayProps> = ({
  creative,
  placement,
  channelId,
  onComplete,
  testID,
}) => {
  const { t } = useTranslation();

  // Landscape = the player is fullscreen (the only landscape surface in the app).
  // The card flips from a portrait 3:4 to a wider 16:9 so the creative fills the
  // landscape screen instead of floating as a small portrait card in the middle.
  const { isLandscape } = useResponsive();

  // Clamp the creative's timing up-front so a missing/0/NaN value can never freeze
  // the auto-dismiss (the app-lock bug). `durationSeconds` is the guaranteed dismiss
  // deadline; `skipAfterSeconds` (skippable only) is bounded to ≤ duration.
  const durationSeconds = safeDuration(
    creative.durationSeconds,
    DEFAULT_AD_DURATION_S,
    MAX_AD_DURATION_S,
  );
  const skipAfterSeconds = Math.min(
    safeDuration(creative.skipAfterSeconds, DEFAULT_SKIP_AFTER_S, MAX_AD_DURATION_S),
    durationSeconds,
  );

  // Wall-clock at first paint + a once-guard, so the impression carries the real
  // watched-time and fires exactly once across every completion path.
  const startedAtRef = useRef(0);
  const reportedRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // Single completion path (skip / duration timer / video end). Computes
  // watched-time, beacons the impression once, then dismisses — fully idempotent
  // so every path is safe to call. Date.now() in a handler is fine (the impurity
  // ban is render-only); the ref guard collapses repeat calls.
  const handleComplete = useCallback(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
    const watched = Math.min(Math.max(elapsed, 0), durationSeconds);
    reportAdImpression(creative.id, {
      watchedSeconds: watched,
      durationSeconds,
      channelId,
      placement,
    });
    onComplete();
  }, [creative.id, durationSeconds, channelId, placement, onComplete]);

  // Duration timer — the ad ALWAYS auto-dismisses durationSeconds after it appears.
  // Wall-clock (`proceedInBackground: true`) so the dismiss is guaranteed even if
  // the app is backgrounded: the ad's display lifetime is durationSeconds, period.
  // (The skip gate below stays pause-on-background — that one must reflect actual
  // viewing.) A skip, when offered, can end it sooner; for VIDEO the natural end
  // fires the same handler; all paths are idempotent.
  const { isDone: durationDone } = useCountdown(durationSeconds, {
    proceedInBackground: true,
    tickMs: 500,
  });

  useEffect(() => {
    if (durationDone) handleComplete();
  }, [durationDone, handleComplete]);

  // Skip control (skippable creatives only) — a labelled countdown until
  // skipAfterSeconds elapses, then a tappable skip. The hook runs unconditionally
  // (rules of hooks); the button below is what's gated on `creative.skippable`.
  const { remaining, isDone: canSkip } = useCountdown(skipAfterSeconds, {
    proceedInBackground: false,
    tickMs: 500,
  });

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      // iOS: a Modal only follows the device when its orientation is whitelisted —
      // without this it stays portrait while the player is locked landscape.
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={creative.skippable && canSkip ? handleComplete : undefined}
      testID={testID}
    >
      <View style={styles.scrim}>
        <AnimatedView
          style={[styles.card, isLandscape && styles.cardLandscape]}
          entering={ZOOM_IN}
          exiting={ZOOM_OUT}
        >
          <View style={[styles.creative, isLandscape && styles.creativeLandscape]}>
            {creative.type === 'VIDEO' ? (
              // expo-video's VideoView defaults to contentFit="contain", so the clip
              // is letterboxed (never cropped). A transparent player container lets the
              // frosted BlurView fill the letterbox gaps behind it.
              <>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <VideoPlayer
                  source={creative.mediaUrl}
                  autoPlay
                  onPlayEnd={handleComplete}
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

            {/* Skip / countdown — skippable creatives only; tappable once the timer elapses */}
            {creative.skippable ? (
              <Pressable
                style={[styles.skip, canSkip && styles.skipReady]}
                onPress={canSkip ? handleComplete : undefined}
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
            ) : null}
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
  // Fullscreen player (landscape): a wider card so the creative fills the screen
  // horizontally rather than floating as a small portrait card centred in it.
  cardLandscape: {
    maxWidth: 560,
  },
  creative: {
    aspectRatio: 3 / 4,
    backgroundColor: CREATIVE_FALLBACK,
  },
  creativeLandscape: {
    aspectRatio: 16 / 9,
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
