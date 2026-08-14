/**
 * Engine → store reconciliation for the radio player.
 *
 * `PlayerSlice.radioIsPlaying` is the app's *intent*, and `RadioAudioHost`
 * pushes it onto the engine. But the OS can move the engine WITHOUT going
 * through the store: the iOS lock-screen / Control Center buttons and the
 * Android media notification are wired natively inside expo-audio
 * (`MediaController.swift` → `player.ref.pause()`), so JS never hears about
 * them. Left unreconciled, the intent goes stale and the UI lies — it shows a
 * pause icon over silence, and because the intent never *changed* the host's
 * sync effect doesn't re-run either, so the user's next in-app tap only writes
 * the value the engine already has (a no-op) and playback needs two taps to
 * come back.
 *
 * This is the pure half of the fix: given a status frame and the current
 * intent, decide what the store should adopt. The hard part is that "not
 * playing" is ambiguous — a live stream is also "not playing" while it
 * buffers, and adopting `false` there would pause a stream that was merely
 * stalling. Both platforms let us tell the two apart, by different means:
 *
 * - **iOS** — `isBuffering` is true whenever the AVPlayer is
 *   `waitingToPlayAtSpecifiedRate` (or has no item / an empty buffer), which is
 *   exactly the load/stall window.
 * - **Android** — ExoPlayer reports `playing` as the *intended* state while
 *   `STATE_BUFFERING`, so a buffering frame never even looks paused; the
 *   `isBuffering` guard is redundant there but harmless.
 *
 * So a paused verdict is only trusted on a frame that is loaded, settled and
 * error-free. Anything else abstains rather than guessing.
 */
import type { AudioStatus } from 'expo-audio';

/** The status fields the verdict depends on — everything else is irrelevant. */
export type PlaybackStatusFrame = Pick<
  AudioStatus,
  'playing' | 'isBuffering' | 'isLoaded' | 'error'
>;

/**
 * The play state the store should adopt from an engine status frame, or `null`
 * when the frame carries no verdict (it already agrees with `intent`, or the
 * engine is loading / buffering / errored and its "not playing" means nothing).
 *
 * @param status Latest `playbackStatusUpdate` frame from the engine.
 * @param intent Current `radioIsPlaying` in the store.
 */
export const resolveExternalPlaybackChange = (
  status: PlaybackStatusFrame,
  intent: boolean,
): boolean | null => {
  // Playing is unambiguous — the engine cannot be playing by accident, so a
  // lock-screen play always wins.
  if (status.playing) return intent ? null : true;

  if (!intent) return null;

  // Not playing while we intended to: only a settled frame proves a real pause.
  if (!status.isLoaded || status.isBuffering || status.error) return null;

  return false;
};
