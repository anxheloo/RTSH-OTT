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
  // DEVICE ('/users/me/device', PUT) removed 2026-07-14 — the endpoint was
  // deleted backend-side; device identity now rides the login/register-verify
  // body instead (see services/auth.ts, utils/device.ts).
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

// EPG_ROUTES ('/epg', '/epg/program/{id}') removed 2026-07-03 — the global EPG
// endpoints had no consumers: per-channel EPG rides CHANNELS_ROUTES.EPG, the
// Guide tab rides GUIDE_ROUTES, recorded playback rides CATCHUP_PLAYBACK.

export const CONFIG_ROUTES = {
  APP_CONFIG: '/config',
  /** Version gate / STB self-update check. Unauthenticated; `platform` via params. */
  APP_VERSION: '/app/version',
} as const;

export const ADS_ROUTES = {
  /**
   * Merged ads array. `GET /ads?channelId=N` → the channel's CHANNEL_CHANGE
   * preroll + all MID_ROLLs; `GET /ads` → the APP_OPEN ad. Each element tagged
   * with its `placement` (see `Ad`).
   */
  AD: '/ads',
  /** `POST /ads/{id}/impression` — FE-reported impression beacon (Ads = Option A). */
  IMPRESSION: (id: number) => `/ads/${id}/impression`,
} as const;

export const ANALYTICS_ROUTES = {
  /** Fire-and-forget telemetry ingestion — `POST { events: AnalyticsEventPayload[] }`. */
  EVENTS: '/analytics/events',
} as const;
