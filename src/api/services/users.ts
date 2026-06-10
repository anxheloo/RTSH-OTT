import type { User } from '@/types';
import { userSchema } from '@/types';

import { apiClient } from '../client';
import { USERS_ROUTES } from '../endpoints';

/** Users endpoints wrap the profile under `{ user }`; unwrap + validate at the boundary (5.X.2). */
export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: unknown }>(USERS_ROUTES.ME);
  return userSchema.parse(data.user) as User;
}

/**
 * Caller-modifiable fields on the user profile. Excludes server-owned fields
 * (`id`, `email`) so a stray spread can't accidentally PATCH them.
 */
export type UpdateProfilePayload = Partial<Pick<User, 'displayName' | 'avatarUrl'>>;

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<{ user: unknown }>(USERS_ROUTES.UPDATE_PROFILE, payload);
  return userSchema.parse(data.user) as User;
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
