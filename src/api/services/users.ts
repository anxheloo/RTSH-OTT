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

/**
 * Permanently delete the authenticated account. `DELETE /users/me` — the access
 * token (injected by the interceptor) identifies the account; no body. Resolves
 * on 200; the caller then wipes the local session (see `useDeleteAccountMutation`).
 */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete(USERS_ROUTES.ME);
}

/*
 * No parental endpoints: the gate is device-level (client-only) as of
 * 2026-06-16 — the PIN never touches the backend. See `ParentalSlice`.
 */
