/**
 * Device identity — the single source for "what device is this" facts the
 * backend consumes: the `deviceKey` UUID for the device registry
 * (`PUT /users/me/device`) and the store-listing URL for the 426 force-update
 * flow.
 *
 * Pure module (no React) so services and modals can reach it outside the
 * component tree. `useDeviceIdentity` is the one-shot wiring point that
 * resolves the async parts and fires the registration upsert.
 *
 * The `deviceKey` lives in the keychain (not MMKV): on iOS it survives
 * reinstall, so a reinstalled device keeps its identity instead of leaving a
 * ghost entry in the backend's device registry.
 */
import { Linking, Platform } from 'react-native';

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import type {
  DeviceClass,
  DevicePlatform,
  DeviceRegistration,
  DeviceType,
} from '@/types/domain';
import { getFromKeychain, storeOnKeychain } from '@/services/keychain';

const DEVICE_ID_KEY = 'rtsh.device_id';

/**
 * An operator STB and a retail Android TV box are indistinguishable at
 * runtime, so STB builds pin their platform at build time via
 * `APP_PLATFORM=androidstb` → `extra.devicePlatform` (see app.config.ts).
 */
const buildTimePlatform = Constants.expoConfig?.extra?.devicePlatform as
  | DevicePlatform
  | undefined;

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
 * build-time override (`buildTimePlatform`) wins first because an operator STB
 * is runtime-identical to retail Android TV. The enum has no
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
 * Coarse platform class the backend uses to choose the player URL, sent as a
 * query param on the playback requests. Derived from `getDeviceType()` so the
 * two never diverge (the `Record` is exhaustive over `DeviceType`). Distinct
 * from `@/responsive`'s window-size class.
 */
const DEVICE_CLASS_BY_TYPE: Record<DeviceType, DeviceClass> = {
  PHONE_IOS: 'MOBILE',
  PHONE_ANDROID: 'MOBILE',
  TABLET_IPADOS: 'MOBILE',
  TABLET_ANDROID: 'MOBILE',
  ANDROID_TV: 'TV',
  TIZEN_TV: 'TV',
  WEBOS_TV: 'TV',
  STB_ANDROID: 'STB',
};

export function getDeviceClass(): DeviceClass {
  return DEVICE_CLASS_BY_TYPE[getDeviceType()];
}

/**
 * Per-platform stream `User-Agent` label, keyed off `getDeviceType()` so it never
 * diverges from the device registry (the `Record` is exhaustive over `DeviceType`).
 * Sent as the `User-Agent` header on every media request (expo-video + expo-audio)
 * so the origin/CDN can recognize "this came from our app" and reject foreign
 * requests (e.g. a manifest URL pasted into a browser, which carries the browser's
 * own UA). It's a spoofable speed-bump, NOT real access control — pair it with
 * signed/expiring/IP-bound URLs.
 *
 * `TIZEN_TV` / `WEBOS_TV` never resolve from this RN app (those are separate native
 * apps), but are mapped here as the canonical labels their teams should mirror via
 * their own platform UA APIs (`tizen.websetting.setUserAgentString` / webOS
 * `appinfo.json` `vendorExtension.userAgent`).
 */
const STREAM_UA_LABEL: Record<DeviceType, string> = {
  PHONE_IOS: 'iOS',
  PHONE_ANDROID: 'Android',
  TABLET_IPADOS: 'iPadOS',
  TABLET_ANDROID: 'AndroidTablet',
  ANDROID_TV: 'AndroidTV',
  TIZEN_TV: 'Tizen',
  WEBOS_TV: 'webOS',
  STB_ANDROID: 'AndroidSTB',
};

/** Product token shared by every platform UA so the backend can gate on a substring. */
const STREAM_UA_PRODUCT = 'RTSHTani';

/**
 * Which request header carries the app/platform identifier — the **single switch**
 * for the whole feature. Every call site (`getStreamHeaders()`) is unchanged when
 * you flip this; only the header *name* changes.
 *
 * - `'User-Agent'` (default) — overrides the OS UA. The origin logs it for free
 *   (nginx access log), but the iOS override is flaky (rides the private asset key).
 * - `'X-Client-Platform'` — a custom header. More reliable on iOS (a pure add, no
 *   reserved-header fight), works the same on every native target, but the backend
 *   must add its own log/gate rule (it isn't logged by default).
 *
 * Both are equally spoofable — a speed-bump, not access control.
 */
const STREAM_ID_HEADER: 'User-Agent' | 'X-Client-Platform' = 'User-Agent';

/**
 * The per-device identifier value, e.g. `RTSHTani-AndroidTV`. The backend matches the
 * `RTSHTani` substring to allow and reads the platform from the rest. No version —
 * gating doesn't need it, and the app version already reaches the backend in the
 * device-registration body (`PUT /users/me/device`). (Same value whichever header
 * name `STREAM_ID_HEADER` selects.)
 */
export function getStreamUserAgent(): string {
  return `${STREAM_UA_PRODUCT}-${STREAM_UA_LABEL[getDeviceType()]}`;
}

let cachedStreamHeaders: Record<string, string> | null = null;

/**
 * Custom headers for the media engines (expo-video live/recorded + expo-audio
 * radio). The header *name* comes from `STREAM_ID_HEADER` (one-line switch between
 * `User-Agent` and `X-Client-Platform`); the value is `getStreamUserAgent()`.
 * Cached for a stable reference so passing it as a player prop / source field
 * doesn't trigger needless re-renders or source re-replaces. Device identity is
 * static at runtime, so one resolve at first use is correct.
 */
export function getStreamHeaders(): Record<string, string> {
  if (!cachedStreamHeaders) {
    cachedStreamHeaders = { [STREAM_ID_HEADER]: getStreamUserAgent() };
  }
  return cachedStreamHeaders;
}

/**
 * `PUT /users/me/device` body. `deviceKey` is the stable keychain UUID — one
 * identity everywhere, or the backend's device registry drifts from the device.
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
