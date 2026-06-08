/**
 * Localized date/time formatting.
 *
 * Built on the platform `Intl` APIs — Hermes ships ICU, so we get correct
 * 12/24-hour clocks, localized month/day names, and per-region date ordering
 * without bundling a date library (dayjs/date-fns). Formatter instances are
 * cached per locale+options because constructing `Intl.DateTimeFormat` is the
 * expensive part and these run for every list row.
 *
 * Functions are pure: they take an explicit BCP-47 `locale` and an optional
 * IANA `timeZone`. The React-facing `useDateTime` hook binds the active app
 * locale (UI language + device region) and i18next `t` so call sites stay
 * declarative — components should prefer the hook over these directly.
 *
 * Relative-day labels (Today / Yesterday / …) are localized through i18next,
 * not a date-library locale, so the app keeps a single translation system.
 *
 * Timezone policy: by default the absolute ISO instant is rendered in the
 * device's local zone — a viewer abroad sees broadcast times in *their* time,
 * which is what an OTT audience expects ("when does it air for me"). Pass an
 * explicit `timeZone` (e.g. 'Europe/Tirane') to pin broadcast-local time when
 * that product choice lands. NOTE: correct conversion requires the backend to
 * emit timezone-aware ISO 8601 (trailing `Z` or `+02:00`); the current mock
 * emits tz-naive local strings, so device-local is the only meaningful view.
 */
import type { TFunction } from 'i18next';

/** Cache of constructed formatters, keyed by locale + serialized options. */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Local-midnight epoch for day-bucket comparisons (ignores time-of-day). */
function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const MS_PER_DAY = 86_400_000;

/**
 * Clock time, e.g. "20:00" (sq/de) or "8:00 PM" (en-US). Hour cycle follows the
 * locale — never force 12/24h, that's the whole point of going locale-aware.
 */
export function formatTime(iso: string, locale: string, timeZone?: string): string {
  return getFormatter(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** Calendar date, default medium style: "15 Jan 2026" / "Jan 15, 2026" per locale. */
export function formatDate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  timeZone?: string,
): string {
  return getFormatter(locale, { ...options, timeZone }).format(new Date(iso));
}

/** Date + time on one line, localized ordering and clock. */
export function formatDateTime(iso: string, locale: string, timeZone?: string): string {
  return getFormatter(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** Weekday label for the catch-up day strip — "E Hënë" / "Mon" (short by default). */
export function formatWeekday(
  iso: string,
  locale: string,
  weekday: 'long' | 'short' | 'narrow' = 'short',
  timeZone?: string,
): string {
  return getFormatter(locale, { weekday, timeZone }).format(new Date(iso));
}

/** Seconds → localized "X min" using locale digit grouping/separators. */
export function formatDurationMinutes(seconds: number, locale?: string): string {
  const minutes = Math.round(seconds / 60);
  const value = locale ? new Intl.NumberFormat(locale).format(minutes) : String(minutes);
  return `${value} min`;
}

export interface RelativeDayOptions {
  locale: string;
  t: TFunction;
  /** Falls back to an absolute date beyond ±this many days. Default 6. */
  thresholdDays?: number;
  timeZone?: string;
}

/**
 * Localized relative day: "Sot"/"Dje"/"Nesër"/"3 ditë më parë", falling back to
 * an absolute date past the threshold. Bucketed on the device-local calendar
 * day. Words come from i18next (`datetime.*`) so they match the app language.
 */
export function formatRelativeDay(iso: string, options: RelativeDayOptions): string {
  const { locale, t, thresholdDays = 6, timeZone } = options;
  const date = new Date(iso);
  const diffDays = Math.round((startOfLocalDay(new Date()) - startOfLocalDay(date)) / MS_PER_DAY);

  if (diffDays === 0) return t('datetime.today');
  if (diffDays === 1) return t('datetime.yesterday');
  if (diffDays === -1) return t('datetime.tomorrow');
  if (diffDays > 1 && diffDays <= thresholdDays) return t('datetime.days_ago', { count: diffDays });
  if (diffDays < -1 && diffDays >= -thresholdDays)
    return t('datetime.in_days', { count: -diffDays });

  return formatDate(iso, locale, { year: 'numeric', month: 'short', day: 'numeric' }, timeZone);
}
