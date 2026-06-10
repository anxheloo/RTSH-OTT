/**
 * Backend route constants. Paths are placeholders — confirm against the API
 * contract (docs/API.md) when delivered.
 */

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',

  // Registration wizard (server-driven; each returns the completed `step`).
  REGISTER: '/auth/register', // step 1 — start (username/email/password)
  REGISTER_VERIFY: '/auth/register/verify', // step 2 — OTP
  REGISTER_DETAILS: '/auth/register/details', // step 3 — profile details
  REGISTER_RESEND: '/auth/register/resend', // resend OTP

  // Password-reset wizard (mirrors register).
  FORGOT_PASSWORD: '/auth/forgot-password', // step 1 — request (email)
  RESET_VERIFY: '/auth/reset/verify', // step 2 — OTP
  RESET_PASSWORD: '/auth/reset/password', // step 3 — new password
  RESET_RESEND: '/auth/reset/resend', // resend OTP
} as const;

export const USERS_ROUTES = {
  ME: '/users/me',
  UPDATE_PROFILE: '/users/me',
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
} as const;

export const ADS_ROUTES = {
  /** Ad creative for a slot (`launch` | `channelSwitch` | `scheduled`). */
  MANIFEST: (slot: string) => `/ads/${slot}`,
} as const;
