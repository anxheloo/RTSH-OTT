/**
 * Backend route constants, matched to the end-user OpenAPI spec (2026-06-12).
 * Paths are relative — the `/api/v1` prefix lives on the axios `baseURL`
 * (`client.ts`), so mock handlers keep matching on the bare path.
 */

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',

  // Registration: single-shot submit (all profile data) → OTP verify (returns
  // tokens — auto-login). No separate details step on the backend.
  REGISTER: '/auth/register',
  REGISTER_VERIFY: '/auth/register/verify',
  REGISTER_RESEND: '/auth/register/resend-otp',

  // Password reset: request code → verify code (returns one-time resetToken)
  // → set new password. Resend = re-call FORGOT_PASSWORD (replaces live code).
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_VERIFY: '/auth/reset-password/verify',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

export const USERS_ROUTES = {
  ME: '/users/me',
  UPDATE_PROFILE: '/users/me',
  /** Idempotent upsert of this device for the logged-in account (PUT, bare `DeviceInfoDTO` body). */
  DEVICE: '/users/me/device',
  /** Per-account parental PIN — set (POST) / clear (DELETE). */
  PARENTAL_PIN: '/users/parental-pin',
  /** Verify an entered PIN against the backend (POST). */
  PARENTAL_PIN_VERIFY: '/users/parental-pin/verify',
} as const;

export const CHANNELS_ROUTES = {
  LIST: '/channels',
  BY_ID: (id: string) => `/channels/${id}`,
} as const;

export const HOME_ROUTES = {
  // Home feed: featured heroes + continue-watching rail.
  FEED: '/home',
} as const;

export const EPG_ROUTES = {
  // Pass `date` via axios `params`, not template-interpolated, so values are
  // properly URL-encoded.
  LIST: '/epg',
  PROGRAM: (id: string) => `/epg/program/${id}`,
} as const;

export const CATCHUP_ROUTES = {
  LIST: '/catchup',
  BY_ID: (id: string) => `/catchup/${id}`,
} as const;

export const RADIO_ROUTES = {
  LIST: '/radio',
  BY_ID: (id: string) => `/radio/${id}`,
} as const;

export const STREAMS_ROUTES = {
  CHANNEL: (id: string) => `/streams/channel/${id}`,
  CATCHUP: (id: string) => `/streams/catchup/${id}`,
  RADIO: (id: string) => `/streams/radio/${id}`,
} as const;

export const CONFIG_ROUTES = {
  APP_CONFIG: '/config',
  /** Version gate / STB self-update check. Unauthenticated; `platform` via params. */
  APP_VERSION: '/app/version',
} as const;

export const ADS_ROUTES = {
  /** Ad creative for a slot (`launch` | `channelSwitch` | `scheduled`). */
  MANIFEST: (slot: string) => `/ads/${slot}`,
} as const;
