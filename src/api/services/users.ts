import type { User } from '@/types';
import { userDtoSchema } from '@/types';

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

/**
 * Parental PIN — per-account, backend is the source of truth (plan 22.14b).
 * The raw PIN travels only over TLS to these endpoints; the backend stores it
 * with a slow KDF + per-user salt and enforces server-side attempt lockout.
 * Locally, the keychain holds a fast-hash cache for offline + live re-checks.
 */
export async function setParentalPin(pin: string): Promise<void> {
  await apiClient.post(USERS_ROUTES.PARENTAL_PIN, { pin });
}

export async function verifyParentalPin(pin: string): Promise<boolean> {
  const { data } = await apiClient.post<{ valid: boolean }>(USERS_ROUTES.PARENTAL_PIN_VERIFY, {
    pin,
  });
  return data.valid;
}

export async function clearParentalPin(): Promise<void> {
  await apiClient.delete(USERS_ROUTES.PARENTAL_PIN);
}
