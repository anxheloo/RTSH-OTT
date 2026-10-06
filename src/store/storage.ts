import { createMMKV } from 'react-native-mmkv';

import type { StateStorage } from 'zustand/middleware';

const mmkv = createMMKV();

/**
 * Writes are best-effort: a failed write (a box with a full disk) must not abort
 * the caller. zustand's persist writes inside every `set()`, after the state is
 * applied, so a throw here used to escape from unrelated actions — `setRememberMe`
 * threw before the login request was sent (REACT-NATIVE-RTSH-OTT-2M).
 */
const safeSet = (key: string, value: string) => {
  try {
    mmkv.set(key, value);
  } catch {
    // State stays correct in memory; only persistence is lost.
  }
};

export const storage = {
  set: safeSet,
  getString: (key: string) => mmkv.getString(key) ?? undefined,
  remove: (key: string) => mmkv.remove(key),
  getAllKeys: () => mmkv.getAllKeys(),
};

export const zustandStorage: StateStorage = {
  setItem: safeSet,
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.remove(name),
};
