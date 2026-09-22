/**
 * Whether an on-demand recording has played to its end.
 *
 * Both native engines (AVPlayer, ExoPlayer) park a finished item AT its end, and
 * `play()` from there is a no-op — so a play control must restart it instead
 * (`replay()` / `seekTo(0)`). Players report a final position a hair short of
 * `duration`, hence the tolerance. A live stream has no finite duration and is
 * never "at the end".
 */
const END_TOLERANCE_SECONDS = 1;

export function isAtPlaybackEnd(currentTime: number, duration: number): boolean {
  return (
    Number.isFinite(duration) && duration > 0 && currentTime >= duration - END_TOLERANCE_SECONDS
  );
}
