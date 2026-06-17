/**
 * i18next setup. Default `sq` (Albanian), fallback `en`. The active locale
 * is sourced from the persisted store on init, then re-applied via
 * `setI18nLocale` when the user changes it in settings.
 *
 * `_layout.tsx` calls `initI18n()` once at module scope so screens can use
 * `useTranslation` from first render.
 */
import { initReactI18next } from 'react-i18next';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';

import { useAppStore } from '@/store/useAppStore';

import en from './locales/en.json';
import sq from './locales/sq.json';

export const SUPPORTED_LOCALES = ['sq', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  sq: { translation: sq },
  en: { translation: en },
} as const;

const resolveInitialLocale = (): Locale => {
  const persisted = useAppStore.getState().locale;
  if (SUPPORTED_LOCALES.includes(persisted)) return persisted;

  const device = getLocales()[0]?.languageCode;
  if (device && SUPPORTED_LOCALES.includes(device as Locale)) return device as Locale;

  return 'sq';
};

let isInitialized = false;

export function initI18n(): void {
  if (isInitialized) return;
  isInitialized = true;

  i18n.use(initReactI18next).init({
    resources,
    lng: resolveInitialLocale(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

export function setI18nLocale(locale: Locale): void {
  i18n.changeLanguage(locale);
}

export default i18n;
