/**
 * Shared display formatters. Albanian (sq-AL) is the app's default locale, so
 * relative-day strings are returned in Albanian. Keep all date/time/number
 * formatting here so screens stay declarative and formatting is consistent.
 */

/** ISO 8601 → "HH:MM" (24-hour, Albanian locale). */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sq-AL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Seconds → "X min" (rounded to the nearest minute). */
export function formatDurationMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** ISO 8601 → relative Albanian day: "Sot" / "Dje" / "N ditë më parë". */
export function formatRelativeDay(iso: string): string {
  const today = new Date();
  const date = new Date(iso);

  const toDayString = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = toDayString(today);
  const dateStr = toDayString(date);

  if (dateStr === todayStr) return 'Sot';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateStr === toDayString(yesterday)) return 'Dje';

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffDays} ditë më parë`;
}
