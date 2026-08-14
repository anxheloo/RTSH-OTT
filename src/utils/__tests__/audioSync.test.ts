/**
 * Unit tests for the radio engine→store reconciliation verdict.
 *
 * The regression these lock down is the lock-screen pause: expo-audio's native
 * MediaController pauses the player directly, so the store's intent goes stale
 * and the UI shows a pause icon over silence. The subtle half is the ABSTAIN
 * cases — a live stream is "not playing" while it buffers too, and adopting
 * `false` there would pause a stream that was only stalling.
 */
import { resolveExternalPlaybackChange } from '../audioSync';

/** A settled, playing frame — each test overrides only what it's about. */
const frame = (over: Partial<Parameters<typeof resolveExternalPlaybackChange>[0]> = {}) => ({
  playing: true,
  isBuffering: false,
  isLoaded: true,
  error: null,
  ...over,
});

describe('resolveExternalPlaybackChange', () => {
  it('adopts false when the engine is paused while we intended to play (lock-screen pause)', () => {
    expect(resolveExternalPlaybackChange(frame({ playing: false }), true)).toBe(false);
  });

  it('adopts true when the engine is playing while we intended pause (lock-screen play)', () => {
    expect(resolveExternalPlaybackChange(frame(), false)).toBe(true);
  });

  it('abstains when the engine already agrees with the intent', () => {
    expect(resolveExternalPlaybackChange(frame(), true)).toBeNull();
    expect(resolveExternalPlaybackChange(frame({ playing: false }), false)).toBeNull();
  });

  it('abstains while buffering — a stalling live stream is not a pause', () => {
    expect(
      resolveExternalPlaybackChange(frame({ playing: false, isBuffering: true }), true),
    ).toBeNull();
  });

  it('abstains before the source has loaded — covers the station-switch replace() gap', () => {
    expect(
      resolveExternalPlaybackChange(frame({ playing: false, isLoaded: false }), true),
    ).toBeNull();
  });

  it('abstains on an errored frame — a failed stream must not read as a user pause', () => {
    expect(
      resolveExternalPlaybackChange(frame({ playing: false, error: 'network' }), true),
    ).toBeNull();
  });

  it('trusts a playing frame even when it is otherwise unsettled', () => {
    // The engine cannot be playing by accident, so `playing` short-circuits the
    // settled-frame guards — a lock-screen play always wins.
    expect(
      resolveExternalPlaybackChange(frame({ isBuffering: true, isLoaded: false }), false),
    ).toBe(true);
  });
});
