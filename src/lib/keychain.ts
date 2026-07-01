/**
 * Thin wrapper over `expo-secure-store` with project-wide defaults.
 *
 * iOS accessibility is pinned to `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` so the
 * refresh token can be read by background tasks (radio playback) while the
 * device is locked, but never syncs to iCloud Keychain or restores to another
 * device. For secrets that should NEVER be read while locked (e.g. a parental
 * PIN hash check), pass `KeychainAccessibility.WhenUnlockedThisDeviceOnly` via
 * the `accessibility` option.
 */
import * as SecureStore from 'expo-secure-store';

export const KeychainAccessibility = {
  /** Readable after the user has unlocked the device once since boot. Best for background tasks. */
  AfterFirstUnlockThisDeviceOnly: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  /** Only readable while the device is unlocked. Best for secrets gated by user presence. */
  WhenUnlockedThisDeviceOnly: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

export type KeychainAccessibilityLevel =
  (typeof KeychainAccessibility)[keyof typeof KeychainAccessibility];

export interface KeychainOptions {
  /** iOS keychain accessibility class. Defaults to `AfterFirstUnlockThisDeviceOnly`. */
  accessibility?: KeychainAccessibilityLevel;
}

const defaultOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: KeychainAccessibility.AfterFirstUnlockThisDeviceOnly,
};

const resolveOptions = (opts?: KeychainOptions): SecureStore.SecureStoreOptions => ({
  keychainAccessible: opts?.accessibility ?? defaultOptions.keychainAccessible,
});

export async function storeOnKeychain(
  key: string,
  value: string,
  options?: KeychainOptions,
): Promise<void> {
  await SecureStore.setItemAsync(key, value, resolveOptions(options));
}

export async function getFromKeychain(
  key: string,
  options?: KeychainOptions,
): Promise<string | null> {
  return SecureStore.getItemAsync(key, resolveOptions(options));
}

export async function removeFromKeychain(
  key: string,
  options?: KeychainOptions,
): Promise<void> {
  await SecureStore.deleteItemAsync(key, resolveOptions(options));
}
