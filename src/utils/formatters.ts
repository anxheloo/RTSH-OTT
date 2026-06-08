/**
 * Non-temporal display formatters. All locale-aware date/time formatting lives
 * in `datetime.ts` (and the `useDateTime` hook) — keep this file for everything
 * else (text, numbers, sizes) as it grows.
 *
 * Re-exported here for a single `@/utils` import surface.
 */
export {
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  formatRelativeDay,
  formatTime,
  formatWeekday,
} from './datetime';
