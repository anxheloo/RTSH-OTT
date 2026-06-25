import { createMMKV } from 'react-native-mmkv';

import type { StateStorage } from 'zustand/middleware';

// TODO(anx 2026-06-25): TEMP boot diagnostics — remove after first-launch splash hang is found.
console.log('[BOOT] storage.ts: creating MMKV…');
const mmkv = createMMKV();
console.log('[BOOT] storage.ts: MMKV created OK');

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
