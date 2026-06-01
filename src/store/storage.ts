import { createMMKV } from 'react-native-mmkv';

import type { StateStorage } from 'zustand/middleware';

const mmkv = createMMKV();

export const storage = {
  set: (key: string, value: string) => mmkv.set(key, value),
  getString: (key: string) => mmkv.getString(key) ?? undefined,
  remove: (key: string) => mmkv.remove(key),
  getAllKeys: () => mmkv.getAllKeys(),
};

export const zustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.remove(name),
};

/**
 * Remove specific MMKV keys. Prefer this over `mmkv.clearAll()` so unrelated
 * caches (resume positions, query-cache shards) aren't destroyed by a logout
 * or partial reset.
 */
export function clearAppStorage(keys: readonly string[]): void {
  keys.forEach((k) => mmkv.remove(k));
}
