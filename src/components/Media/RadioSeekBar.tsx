/**
 * RadioSeekBar — elapsed / total + a scrubbable track for a radio catch-up
 * recording. The radio counterpart of `PlayerControls`' seek bar, same
 * behaviour: tap to jump, drag to scrub, and on release the bar HOLDS the
 * released position until playback reaches it (otherwise it snaps back to the
 * stale position for one status tick before the seek lands).
 *
 * Reads the single engine through `useRadioAudioPlayer` — status + `seekTo`
 * only; source and play/pause stay store-driven (see `RadioAudioHost`). Mount it
 * only while a recording is loaded: live radio is deliberately not seekable.
 *
 * Unlike the video scrubber this runs the gesture on the JS thread
 * (`runOnJS(true)`): audio has no frame to keep in sync with the finger, so
 * plain state is enough and avoids worklet ↔ JS bookkeeping.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useAudioPlayerStatus } from 'expo-audio';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { useRadioAudioPlayer } from '@/components/Media/RadioAudioHost';
import { formatPlaybackTime } from '@/utils/datetime';

const KNOB = 14;
/** Screen-reader increment / decrement step. */
const A11Y_STEP_SECONDS = 15;
/** How close playback must come to a held release point before the bar lets go. */
const HOLD_TOLERANCE = 0.02;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

const RadioSeekBar: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const player = useRadioAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const [trackWidth, setTrackWidth] = useState(0);
  // Finger position while dragging (0..1), else null.
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  // Released position, held until playback catches up with it.
  const [heldRatio, setHeldRatio] = useState<number | null>(null);

  const duration = status.duration;
  const seekable = status.isLoaded && duration > 0;
  const progress = seekable ? clamp01(status.currentTime / duration) : 0;

  // Release the hold once playback has reached it (adjust-during-render, no effect).
  if (heldRatio !== null && Math.abs(progress - heldRatio) < HOLD_TOLERANCE) setHeldRatio(null);

  const shown = scrubRatio ?? heldRatio ?? progress;

  const seekTo = (seconds: number) => {
    const target = Math.min(Math.max(seconds, 0), duration);
    setHeldRatio(target / duration);
    // A failed seek must not leave the bar frozen at a position that never came.
    player.seekTo(target).catch(() => setHeldRatio(null));
  };

  const ratioAt = (x: number) => (trackWidth > 0 ? clamp01(x / trackWidth) : 0);

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(seekable)
    .onBegin((e) => setScrubRatio(ratioAt(e.x)))
    .onUpdate((e) => setScrubRatio(ratioAt(e.x)))
    // Read the release point off the event itself — the last `onUpdate`'s state
    // may not have re-rendered yet. Fires for a plain tap too.
    .onFinalize((e) => {
      setScrubRatio(null);
      seekTo(ratioAt(e.x) * duration);
    });

  const handleA11yAction = (e: { nativeEvent: { actionName: string } }) => {
    const step = e.nativeEvent.actionName === 'increment' ? A11Y_STEP_SECONDS : -A11Y_STEP_SECONDS;
    seekTo(status.currentTime + step);
  };

  return (
    <View style={styles.container} testID="radio-seek-bar">
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hitArea}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: Math.round(duration),
            now: Math.round(shown * duration),
            text: `${formatPlaybackTime(shown * duration)} / ${formatPlaybackTime(duration)}`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={handleA11yAction}
          testID="radio-seek-track"
        >
          <View style={[styles.track, { backgroundColor: colors.surfaceHigh }]}>
            <View
              style={[styles.fill, { width: trackWidth * shown, backgroundColor: colors.primary }]}
            />
            <View
              style={[
                styles.knob,
                {
                  transform: [{ translateX: trackWidth * shown }],
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <ReusableText variant="caption" themeColor="textMuted" testID="radio-seek-elapsed">
          {formatPlaybackTime(shown * duration)}
        </ReusableText>
        <ReusableText variant="caption" themeColor="textMuted" testID="radio-seek-duration">
          {formatPlaybackTime(duration)}
        </ReusableText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.space_24,
  },
  // Taller than the visual track so it's easy to grab; vertical padding only, so
  // its width equals the track width (gesture x and fill share one coordinate space).
  hitArea: {
    justifyContent: 'center',
    paddingVertical: SPACING.space_12,
  },
  track: {
    height: 4,
    borderRadius: 2,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    marginLeft: -KNOB / 2,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default RadioSeekBar;
