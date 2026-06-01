/**
 * Backend route constants. Paths are placeholders — confirm against the API
 * contract (docs/API.md) when delivered.
 */

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
} as const;

export const USERS_ROUTES = {
  ME: '/users/me',
  UPDATE_PROFILE: '/users/me',
} as const;

export const CHANNELS_ROUTES = {
  LIST: '/channels',
  BY_ID: (id: string) => `/channels/${id}`,
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
