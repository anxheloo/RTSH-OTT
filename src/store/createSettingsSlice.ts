import { StateCreator } from 'zustand';

export type Locale = 'sq' | 'en';

export interface SettingsSlice {
  locale: Locale;
  tcAcceptedAt: number | null;

  setLocale: (locale: Locale) => void;
  acceptTC: () => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  locale: 'sq',
  tcAcceptedAt: null,

  setLocale: (locale) => set({ locale }),
  acceptTC: () => set({ tcAcceptedAt: Date.now() }),
});
