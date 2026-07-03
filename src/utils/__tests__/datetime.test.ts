/**
 * Unit tests for the pure date/time helpers. The invariants that matter:
 * `toDateKey` is the device-LOCAL calendar day (never the UTC shift that
 * `toISOString` would give near midnight), the day-strip formats are
 * locale-independent, and clock rendering is pinned to 24-hour.
 */
import type { TFunction } from 'i18next';

import {
  formatDayMonth,
  formatDurationMinutes,
  formatRelativeDay,
  formatTime,
  toDateKey,
} from '../datetime';

describe('toDateKey', () => {
  it('formats the LOCAL calendar day as YYYY-MM-DD with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('uses the local day even moments before local midnight (no UTC shift)', () => {
    const lateNight = new Date(2026, 6, 3, 23, 59, 59);
    expect(toDateKey(lateNight)).toBe('2026-07-03');
  });
});

describe('formatDayMonth', () => {
  it('renders a fixed dd/MM regardless of locale ICU data', () => {
    expect(formatDayMonth(new Date(2026, 5, 30))).toBe('30/06');
    expect(formatDayMonth(new Date(2026, 0, 1))).toBe('01/01');
  });
});

describe('formatTime', () => {
  it('pins a 24-hour clock (h23) for every locale', () => {
    const iso = '2026-07-03T16:30:00Z';
    expect(formatTime(iso, 'sq-AL', 'UTC')).toBe('16:30');
    // en-US would render "4:30 PM" without the h23 pin — broadcast-incorrect.
    expect(formatTime(iso, 'en-US', 'UTC')).toBe('16:30');
  });

  it('renders midnight as 00:xx, never 24:xx', () => {
    expect(formatTime('2026-07-03T00:05:00Z', 'sq-AL', 'UTC')).toBe('00:05');
  });
});

describe('formatDurationMinutes', () => {
  it('rounds seconds to whole minutes', () => {
    expect(formatDurationMinutes(125)).toBe('2 min');
    expect(formatDurationMinutes(3600)).toBe('60 min');
  });
});

describe('formatRelativeDay', () => {
  const t = ((key: string) => key) as unknown as TFunction;

  it('labels the current local day via the i18n today key', () => {
    expect(formatRelativeDay(new Date().toISOString(), { locale: 'sq-AL', t })).toBe(
      'datetime.today',
    );
  });

  it('falls back to an absolute date beyond the threshold', () => {
    const farPast = new Date(Date.now() - 30 * 86_400_000).toISOString();
    expect(formatRelativeDay(farPast, { locale: 'en-US', t })).not.toContain('datetime.');
  });
});
