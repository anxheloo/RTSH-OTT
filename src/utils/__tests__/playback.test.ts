import { isAtPlaybackEnd } from '../playback';

describe('isAtPlaybackEnd', () => {
  it('is true at, or within a second of, the end', () => {
    expect(isAtPlaybackEnd(1620, 1620)).toBe(true);
    expect(isAtPlaybackEnd(1619.4, 1620)).toBe(true);
  });

  it('is false mid-recording', () => {
    expect(isAtPlaybackEnd(0, 1620)).toBe(false);
    expect(isAtPlaybackEnd(1618, 1620)).toBe(false);
  });

  it('is never true for a stream with no finite duration (live, or not loaded yet)', () => {
    expect(isAtPlaybackEnd(12, 0)).toBe(false);
    expect(isAtPlaybackEnd(12, Number.NaN)).toBe(false);
    expect(isAtPlaybackEnd(12, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
