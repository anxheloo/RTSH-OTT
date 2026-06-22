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
  /**
   * Change own password; returns FRESH tokens (refresh rotates here). The
   * optional `logoutOtherDevices` flag also kills other sessions in the same
   * call — so there's no separate logout-others endpoint.
   */
  CHANGE_PASSWORD: '/users/me/change-password',
  /** Idempotent upsert of this device for the logged-in account (PUT, bare `DeviceInfoDTO` body). */
  DEVICE: '/users/me/device',
} as const;

export const CHANNELS_ROUTES = {
  LIST: '/channels',
  BY_ID: (id: string) => `/channels/${id}`,
  /** Programme guide for a single channel. Pass `date` via axios `params` (YYYY-MM-DD). */
  EPG: (id: string) => `/channels/${id}/epg`,
  /** Catch-up playback decision for a recorded programme — returns `PlaybackDecisionDTO`. */
  CATCHUP_PLAYBACK: (channelId: string, programId: string) => `/channels/${channelId}/epg/${programId}`,
} as const;

export const HOME_ROUTES = {
  // Home feed: featured heroes + continue-watching rail.
  FEED: '/home',
} as const;

export const GUIDE_ROUTES = {
  // "Now on TV" guide: one entry per channel with its currently-airing programme.
  LIST: '/guide',
} as const;

export const EPG_ROUTES = {
  // Pass `date` via axios `params`, not template-interpolated, so values are
  // properly URL-encoded.
  LIST: '/epg',
  PROGRAM: (id: string) => `/epg/program/${id}`,
} as const;


export const CONFIG_ROUTES = {
  APP_CONFIG: '/config',
  /** Version gate / STB self-update check. Unauthenticated; `platform` via params. */
  APP_VERSION: '/app/version',
} as const;

export const ADS_ROUTES = {
  /** `GET /ads?placement=APP_OPEN` or `?placement=CHANNEL_CHANGE&channelId=N`. */
  AD: '/ads',
} as const;
