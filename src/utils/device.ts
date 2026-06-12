/**
 * Device identity — the single source for "what device is this" facts the
 * backend consumes: the `X-Device-Id` / `X-Device-Platform` / `X-App-Version`
 * request headers and the store-listing URL for the 426 force-update flow.
 *
 * Pure module (no React) so axios interceptors and services can reach it
 * outside the component tree. `useDeviceIdentity` is the one-shot boot wiring
 * point that resolves the async parts and stamps the headers onto `apiClient`.
 *
 * `X-Device-Id` lives in the keychain (not MMKV): on iOS it survives
 * reinstall, so a reinstalled device keeps its identity instead of leaving a
 * ghost entry in the backend's device registry.
 */
import { Linking, Platform } from 'react-native';

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import type { DevicePlatform, DeviceRegistration, DeviceType } from '@/types/domain';
import { getFromKeychain, storeOnKeychain } from '@/services/keychain';

const DEVICE_ID_KEY = 'rtsh.device_id';

export const DEVICE_HEADERS = {
  DEVICE_ID: 'X-Device-Id',
  DEVICE_PLATFORM: 'X-Device-Platform',
  APP_VERSION: 'X-App-Version',
} as const;

/**
 * An operator STB and a retail Android TV box are indistinguishable at
 * runtime, so STB builds pin their platform at build time via
 * `APP_PLATFORM=androidstb` → `extra.devicePlatform` (see app.config.ts).
 */
const buildTimePlatform = Constants.expoConfig?.extra?.devicePlatform as
  | DevicePlatform
  | undefined;

export function getDevicePlatform(): DevicePlatform {
  if (buildTimePlatform) return buildTimePlatform;
  if (Platform.OS === 'android') return Platform.isTV ? 'androidtv' : 'android';
  return 'ios';
}

let cachedDeviceId: string | null = null;

/** Stable per-device UUID. Generated once, then read from the keychain. */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const existing = await getFromKeychain(DEVICE_ID_KEY);
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }

  const id = Crypto.randomUUID();
  await storeOnKeychain(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}

/** Static identity headers sent on every API request. Resolved once at boot. */
export async function buildDeviceHeaders(): Promise<Record<string, string>> {
  return {
    [DEVICE_HEADERS.DEVICE_ID]: await getOrCreateDeviceId(),
    [DEVICE_HEADERS.DEVICE_PLATFORM]: getDevicePlatform(),
    [DEVICE_HEADERS.APP_VERSION]: Application.nativeApplicationVersion ?? '0.0.0',
  };
}

// TODO(anx 2026-06-12): replace with the real App Store ID once the listing
// exists (Phase 24 store readiness). Android resolves from the package name.
const IOS_APP_STORE_ID = '';

function getStoreUrl(): string | null {
  if (Platform.OS === 'android') {
    return `market://details?id=${Application.applicationId}`;
  }
  return IOS_APP_STORE_ID ? `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}` : null;
}

/** Opens the platform store listing — the 426 force-update modal's CTA. */
export async function openStoreListing(): Promise<void> {
  const url = getStoreUrl();
  if (url) await Linking.openURL(url);
}

/**
 * Backend `DeviceType` enum (form factor + OS, per `DeviceInfoDTO`). The STB
 * build-time override wins first for the same reason as `getDevicePlatform`:
 * an operator STB is runtime-identical to retail Android TV. The enum has no
 * UNKNOWN, so an unrecognized form factor falls back to the platform's phone
 * type — the registry cares about OS family more than exact form factor.
 */
export function getDeviceType(): DeviceType {
  if (buildTimePlatform === 'androidstb') return 'STB_ANDROID';
  if (Platform.isTV) return 'ANDROID_TV';

  if (Device.deviceType === Device.DeviceType.TABLET) {
    return Platform.OS === 'ios' ? 'TABLET_IPADOS' : 'TABLET_ANDROID';
  }
  return Platform.OS === 'ios' ? 'PHONE_IOS' : 'PHONE_ANDROID';
}

/**
 * `PUT /users/me/device` body. `deviceKey` is the same keychain UUID sent as
 * `X-Device-Id` — one identity everywhere, or the backend's device registry
 * and request-header identity drift apart.
 */
export async function buildDeviceRegistration(): Promise<DeviceRegistration> {
  return {
    deviceKey: await getOrCreateDeviceId(),
    type: getDeviceType(),
    model: Device.modelName ?? 'unknown',
    operatingSystem: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ''}`.trim(),
    appVersion: Application.nativeApplicationVersion ?? '0.0.0',
  };
}
