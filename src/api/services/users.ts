import type { TokenPair, User } from '@/types';
import { tokenPairSchema, userDtoSchema } from '@/types';

import { apiClient } from '../client';
import { USERS_ROUTES } from '../endpoints';

/** `/users/me` returns a bare `UserDTO` (no envelope); validate + map at the boundary (5.X.2). */
export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<unknown>(USERS_ROUTES.ME);
  return userDtoSchema.parse(data);
}

/**
 * Caller-modifiable fields per `UpdateProfileRequestDTO`. Excludes server-owned
 * fields (`id`, `email`, `birthDate`) so a stray spread can't PATCH them.
 */
export interface UpdateProfilePayload {
  username?: string;
  city?: string;
  country?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  educationLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<unknown>(USERS_ROUTES.UPDATE_PROFILE, payload);
  return userDtoSchema.parse(data);
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  /** Also revoke this account's other sessions. Defaults false. */
  logoutOtherDevices?: boolean;
}

/**
 * Change own password. Returns FRESH `{ accessToken, refreshToken }` (the
 * refresh token rotates here, unlike `/auth/refresh`), so the caller MUST
 * rewrite the keychain copy — see `useChangePasswordMutation`. `oldPassword` is
 * verified server-side; `logoutOtherDevices` optionally kills other sessions.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<TokenPair> {
  const { data } = await apiClient.post<unknown>(USERS_ROUTES.CHANGE_PASSWORD, {
    logoutOtherDevices: false,
    ...payload,
  });
  return tokenPairSchema.parse(data);
}

/* ------------------------------- Parental --------------------------------- *
 * Per-account, backend source of truth. The PIN rides on the user object
 * (`user.parentalPin = { enabled, pin }`) — content gating, not a credential
 * (2026-06-15) — so verification is a LOCAL compare; there's no GET/verify-pin.
 * `POST` = first-time setup, `PATCH` = enable/disable (and later change-PIN).
 * Both return 204; the client mirrors the new state onto `user.parentalPin`.
 * See `rules/ARCHITECTURE.md → Parental control`.
 * -------------------------------------------------------------------------- */

/** First-time setup: create + enable the gate with a new PIN. 204. */
export async function setParentalPin(pin: string): Promise<void> {
  await apiClient.post(USERS_ROUTES.PARENTAL, { enabled: true, pin });
}

export interface UpdateParentalPayload {
  enabled: boolean;
  /** Future change-PIN — sent only when rotating the PIN. */
  newPin?: string;
}

/**
 * Toggle the gate on/off (and later change the PIN via `newPin`). No
 * `currentPin` — re-entry is verified locally before this is called. 204.
 */
export async function updateParental(payload: UpdateParentalPayload): Promise<void> {
  await apiClient.patch(USERS_ROUTES.PARENTAL, payload);
}
