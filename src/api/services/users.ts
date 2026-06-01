import type { User } from '@/types';

import { apiClient } from '../client';
import { USERS_ROUTES } from '../endpoints';

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>(USERS_ROUTES.ME);
  return data;
}

/**
 * Caller-modifiable fields on the user profile. Excludes server-owned fields
 * (`id`, `email`) so a stray spread can't accidentally PATCH them.
 */
export type UpdateProfilePayload = Partial<Pick<User, 'displayName' | 'avatarUrl'>>;

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<User>(USERS_ROUTES.UPDATE_PROFILE, payload);
  return data;
}
