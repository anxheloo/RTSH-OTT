/**
 * Unit tests for the pure mid-roll scheduling core. The invariants under test
 * are the ones the hook relies on for correctness (see midroll.ts JSDoc):
 * session-window gating (no firing into the past / no replay on re-entry),
 * fire-now sentinel for missing timing, lapse rules, and boundary selection.
 */
import type { Ad } from '@/types/domain';

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
  it('never lapses without a validUntil', () => {
    expect(midrollLapsed(mkAd(1, { startTime: iso(T0) }), T0 + 10 * MIN)).toBe(false);
  });

  it('lapses once now passes a valid validUntil after the start', () => {
    const ad = mkAd(1, { startTime: iso(T0), validUntil: iso(T0 + 5 * MIN) });
    expect(midrollLapsed(ad, T0 + 4 * MIN)).toBe(false);
    expect(midrollLapsed(ad, T0 + 6 * MIN)).toBe(true);
  });

  it('ignores a zero-width window (validUntil === startTime — backend Swagger quirk)', () => {
    const ad = mkAd(1, { startTime: iso(T0), validUntil: iso(T0) });
    expect(midrollLapsed(ad, T0 + 10 * MIN)).toBe(false);
  });

  it('ignores an unparseable validUntil', () => {
    const ad = mkAd(1, { startTime: iso(T0), validUntil: 'garbage' });
    expect(midrollLapsed(ad, T0 + 10 * MIN)).toBe(false);
  });
});

describe('selectDueMidroll', () => {
  const window = (over: Partial<{ nowMs: number; sessionStart: number; firedIds: Set<number> }> = {}) => ({
    nowMs: T0 + 10 * MIN,
    sessionStart: T0,
    firedIds: new Set<number>(),
    ...over,
  });

  it('fires an ad whose startTime falls inside [sessionStart, now]', () => {
    const ad = mkAd(1, { startTime: iso(T0 + 5 * MIN) });
    expect(selectDueMidroll([ad], window())?.id).toBe(1);
  });

  it('never fires an ad scheduled before the session began (no replay on re-entry)', () => {
    const ad = mkAd(1, { startTime: iso(T0 - MIN) });
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
    const later = mkAd(1, { startTime: iso(T0 + 8 * MIN) });
    const earlier = mkAd(2, { startTime: iso(T0 + 2 * MIN) });
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
