/**
 * Unit tests for the pure EPG time helpers — the "now playing" matcher that
 * drives the channel screen's play-icon row and the Guide's progress bar.
 */
import type { EpgItem } from '@/types/domain';

import { findPlayingProgram, programProgress } from '../epg';

const T0 = Date.parse('2026-07-03T12:00:00Z');
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

const mkProgram = (id: string, startMs: number, endMs: number): EpgItem => ({
  id,
  channelId: '1',
  channelName: 'RTSH 1',
  title: `Programme ${id}`,
  description: '',
  startTime: iso(startMs),
  endTime: iso(endMs),
  isAdult: false,
});

describe('findPlayingProgram', () => {
  const schedule = [
    mkProgram('a', T0, T0 + 30 * MIN),
    mkProgram('b', T0 + 30 * MIN, T0 + 60 * MIN),
  ];

  it('returns the programme whose [start, end) wraps now', () => {
    expect(findPlayingProgram(schedule, T0 + 10 * MIN)?.id).toBe('a');
    expect(findPlayingProgram(schedule, T0 + 45 * MIN)?.id).toBe('b');
  });

  it('is start-inclusive and end-exclusive at the boundary (no double match)', () => {
    expect(findPlayingProgram(schedule, T0 + 30 * MIN)?.id).toBe('b');
  });

  it('returns null outside the schedule or for an empty list', () => {
    expect(findPlayingProgram(schedule, T0 - MIN)).toBeNull();
    expect(findPlayingProgram(schedule, T0 + 60 * MIN)).toBeNull();
    expect(findPlayingProgram([], T0)).toBeNull();
  });
});

describe('programProgress', () => {
  it('returns the elapsed fraction inside the window', () => {
    expect(programProgress(iso(T0), iso(T0 + 60 * MIN), T0 + 15 * MIN)).toBeCloseTo(0.25);
  });

  it('clamps to [0, 1] outside the window', () => {
    expect(programProgress(iso(T0), iso(T0 + 60 * MIN), T0 - MIN)).toBe(0);
    expect(programProgress(iso(T0), iso(T0 + 60 * MIN), T0 + 90 * MIN)).toBe(1);
  });

  it('returns undefined for a non-positive duration (no divide-by-zero bar)', () => {
    expect(programProgress(iso(T0), iso(T0), T0)).toBeUndefined();
    expect(programProgress(iso(T0 + MIN), iso(T0), T0)).toBeUndefined();
  });
});
