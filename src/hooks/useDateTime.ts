/**
 * useDateTime — the app-facing date/time formatting API.
 *
 * Binds the pure `utils/datetime` formatters to the active *display locale*
 * (app UI language + device region) and the i18next `t` for relative labels,
 * so components call `formatTime(iso)` without threading locale everywhere.
 *
 * Display locale = `${uiLanguage}-${deviceRegion}` (e.g. an English UI on a
 * German device → `en-DE`: English month names but 24-hour clock + D.M.Y
 * ordering). This is the worldwide-correct split — words follow the chosen app
 * language, format conventions follow the user's region. Falls back to the bare
 * language tag when the device exposes no region.
 *
 * Re-derives only when the UI language changes (region is read once per language
 * resolution); the returned object is memoized so it's stable across renders.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocales } from 'expo-localization';

import {
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  formatRelativeDay,
  formatTime,
  formatWeekday,
} from '@/utils/datetime';

/** Combine the chosen UI language with the device region into a BCP-47 tag. */
function resolveDisplayLocale(uiLanguage: string): string {
  const region = getLocales()[0]?.regionCode;
  return region ? `${uiLanguage}-${region}` : uiLanguage;
}

export function useDateTime() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(() => resolveDisplayLocale(i18n.language), [i18n.language]);

  return useMemo(
    () => ({
      /** Resolved BCP-47 display locale (e.g. "sq-AL", "en-DE"). */
      locale,
      formatTime: (iso: string, timeZone?: string) => formatTime(iso, locale, timeZone),
      formatDate: (iso: string, options?: Intl.DateTimeFormatOptions, timeZone?: string) =>
        formatDate(iso, locale, options, timeZone),
      formatDateTime: (iso: string, timeZone?: string) => formatDateTime(iso, locale, timeZone),
      formatWeekday: (iso: string, weekday?: 'long' | 'short' | 'narrow', timeZone?: string) =>
        formatWeekday(iso, locale, weekday, timeZone),
      formatDuration: (seconds: number) => formatDurationMinutes(seconds, locale),
      formatRelativeDay: (iso: string, timeZone?: string) =>
        formatRelativeDay(iso, { locale, t, timeZone }),
    }),
    [locale, t],
  );
}

export default useDateTime;
