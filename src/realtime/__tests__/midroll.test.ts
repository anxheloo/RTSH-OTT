/**
 * Unit tests for the pure mid-roll scheduling core. The invariants under test
 * are the ones the hook relies on for correctness (see midroll.ts JSDoc): the
 * open-window due rule (`startTime` ≤ now while the window is open — including
 * a start that predates the visit), fired-set replay protection, fire-now
 * sentinel for missing timing, lapse rules, and boundary selection.
 */
import type { Ad } from '@/types/domain';
import { MIDROLL_MAX_STALENESS_MS } from '@/constants/ads';

import { midrollFireMs, midrollLapsed, nextMidrollBoundaryMs, selectDueMidroll } from '../midroll';

const T0 = Date.parse('2026-07-03T12:00:00Z');
const MIN = 60_000;

const mkAd = (id: number, over: Partial<Ad> = {}): Ad => ({
  id,
  type: 'IMAGE',
  mediaUrl: `https://cdn.example/ad-${id}.jpg`,
  durationSeconds: 10,
  skippable: true,
  skipAfterSeconds: 5,
  placement: 'MID_ROLL',
  ...over,
});

const iso = (ms: number) => new Date(ms).toISOString();

describe('midrollFireMs', () => {
  it('parses a valid ISO startTime to ms', () => {
    expect(midrollFireMs(mkAd(1, { startTime: iso(T0) }))).toBe(T0);
  });

  it('returns null (fire-now sentinel) for a missing startTime', () => {
    expect(midrollFireMs(mkAd(1))).toBeNull();
  });

  it('returns null for an unparseable startTime', () => {
    expect(midrollFireMs(mkAd(1, { startTime: 'not-a-date' }))).toBeNull();
  });
});

describe('midrollLapsed', () => {
  it('lapses once now passes a valid validUntil after the start', () => {
    const ad = mkAd(1, { startTime: iso(T0), validUntil: iso(T0 + 5 * MIN) });
    expect(midrollLapsed(ad, T0 + 4 * MIN)).toBe(false);
    expect(midrollLapsed(ad, T0 + 6 * MIN)).toBe(true);
  });

  // A valid validUntil is authoritative even well past the staleness fallback:
  // an in-window ad still shows however "late" the fallback alone would call it.
  it('a still-valid validUntil overrides the staleness fallback', () => {
    const ad = mkAd(1, { startTime: iso(T0), validUntil: iso(T0 + 100 * MIN) });
    expect(midrollLapsed(ad, T0 + MIDROLL_MAX_STALENESS_MS + 10 * MIN)).toBe(false);
  });

  describe('no usable validUntil → staleness fallback off startTime', () => {
    it('does not lapse within the staleness window', () => {
      expect(midrollLapsed(mkAd(1, { startTime: iso(T0) }), T0 + 2 * MIN)).toBe(false);
    });

    it('lapses once startTime is more than the staleness window in the past', () => {
      const now = T0 + MIDROLL_MAX_STALENESS_MS + MIN;
      expect(midrollLapsed(mkAd(1, { startTime: iso(T0) }), now)).toBe(true);
    });

    it('treats a zero-width validUntil (=== startTime) as absent → fallback governs', () => {
      const ad = mkAd(1, { startTime: iso(T0), validUntil: iso(T0) });
      expect(midrollLapsed(ad, T0 + 2 * MIN)).toBe(false); // still fires at its start
      expect(midrollLapsed(ad, T0 + MIDROLL_MAX_STALENESS_MS + MIN)).toBe(true);
    });

    it('treats an unparseable validUntil as absent → fallback governs', () => {
      const ad = mkAd(1, { startTime: iso(T0), validUntil: 'garbage' });
      expect(midrollLapsed(ad, T0 + MIDROLL_MAX_STALENESS_MS + MIN)).toBe(true);
    });

    it('never lapses a fire-now ad (no startTime → no reference instant)', () => {
      expect(midrollLapsed(mkAd(1), T0 + 100 * MIN)).toBe(false);
    });
  });
});

describe('selectDueMidroll', () => {
  const window = (over: Partial<{ nowMs: number; sessionStart: number; firedIds: Set<number> }> = {}) => ({
    nowMs: T0 + 10 * MIN,
    sessionStart: T0,
    firedIds: new Set<number>(),
    ...over,
  });

  it('fires an ad whose startTime has passed and window is open', () => {
    // validUntil keeps this about window membership, not the staleness fallback.
    const ad = mkAd(1, { startTime: iso(T0 + 5 * MIN), validUntil: iso(T0 + 100 * MIN) });
    expect(selectDueMidroll([ad], window())?.id).toBe(1);
  });

  // Backend contract §3: "startTime ≤ now → play now". A start that predates the
  // channel visit is still due while the window is open (join mid-window; also the
  // clock-skew case where the server's clamped "now" lands just before mount).
  it('fires a pre-session ad whose window is still open (join mid-window)', () => {
    const ad = mkAd(1, { startTime: iso(T0 - 30 * MIN), validUntil: iso(T0 + 100 * MIN) });
    expect(selectDueMidroll([ad], window())?.id).toBe(1);
  });

  it('skips a pre-session ad whose window has already closed', () => {
    const ad = mkAd(1, { startTime: iso(T0 - 60 * MIN), validUntil: iso(T0 + 5 * MIN) });
    expect(selectDueMidroll([ad], window())).toBeNull(); // nowMs = T0+10min > validUntil
  });

  it('fires a windowless pre-session ad within the staleness fallback (skew slack)', () => {
    // fire < sessionStart by 1min but only 2min in the past → inside the 5-min
    // fallback → due. The old session-window guard ate exactly this case.
    const ad = mkAd(1, { startTime: iso(T0 + 8 * MIN) });
    expect(selectDueMidroll([ad], window({ sessionStart: T0 + 9 * MIN }))?.id).toBe(1);
  });

  it('skips a windowless pre-session ad older than the staleness fallback', () => {
    const ad = mkAd(1, { startTime: iso(T0 - MIN) }); // 11min before nowMs, no window
    expect(selectDueMidroll([ad], window())).toBeNull();
  });

  it('does not fire a future ad early', () => {
    const ad = mkAd(1, { startTime: iso(T0 + 20 * MIN) });
    expect(selectDueMidroll([ad], window())).toBeNull();
  });

  it('treats a missing startTime as fire-now', () => {
    expect(selectDueMidroll([mkAd(1)], window())?.id).toBe(1);
  });

  it('skips already-fired ads', () => {
    const ad = mkAd(1, { startTime: iso(T0 + 5 * MIN) });
    expect(selectDueMidroll([ad], window({ firedIds: new Set([1]) }))).toBeNull();
  });

  it('skips lapsed ads', () => {
    const ad = mkAd(1, { startTime: iso(T0 + MIN), validUntil: iso(T0 + 2 * MIN) });
    expect(selectDueMidroll([ad], window())).toBeNull();
  });

  it('picks the earliest due ad when several are pending', () => {
    // validUntil on both → this tests ordering, independent of the staleness fallback.
    const later = mkAd(1, { startTime: iso(T0 + 8 * MIN), validUntil: iso(T0 + 100 * MIN) });
    const earlier = mkAd(2, { startTime: iso(T0 + 2 * MIN), validUntil: iso(T0 + 100 * MIN) });
    expect(selectDueMidroll([later, earlier], window())?.id).toBe(2);
  });

  it('ranks a fire-now ad at sessionStart, so it wins over later scheduled ads', () => {
    const scheduled = mkAd(1, { startTime: iso(T0 + 5 * MIN) });
    const fireNow = mkAd(2);
    expect(selectDueMidroll([scheduled, fireNow], window())?.id).toBe(2);
  });

  it('ignores non-MID_ROLL placements', () => {
    const preroll = mkAd(1, { placement: 'CHANNEL_CHANGE' });
    expect(selectDueMidroll([preroll], window())).toBeNull();
  });
});

describe('nextMidrollBoundaryMs', () => {
  it('returns the earliest FUTURE fire instant', () => {
    const ads = [
      mkAd(1, { startTime: iso(T0 + 30 * MIN) }),
      mkAd(2, { startTime: iso(T0 + 10 * MIN) }),
      mkAd(3, { startTime: iso(T0 - MIN) }), // past → no timer
    ];
    expect(nextMidrollBoundaryMs(ads, T0, new Set())).toBe(T0 + 10 * MIN);
  });

  it('skips fired ads and returns null when nothing is upcoming', () => {
    const ads = [mkAd(1, { startTime: iso(T0 + 10 * MIN) })];
    expect(nextMidrollBoundaryMs(ads, T0, new Set([1]))).toBeNull();
    expect(nextMidrollBoundaryMs([], T0, new Set())).toBeNull();
  });

  it('arms no timer for fire-now ads (they are already due)', () => {
    expect(nextMidrollBoundaryMs([mkAd(1)], T0, new Set())).toBeNull();
  });
});
