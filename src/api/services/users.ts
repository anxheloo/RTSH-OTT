import type { User } from '@/types';

import { apiClient } from '../client';
import { USERS_ROUTES } from '../endpoints';

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>(USERS_ROUTES.ME);
  return data;
}

export async function updateProfile(payload: Partial<User>): Promise<User> {
  const { data } = await apiClient.patch<User>(USERS_ROUTES.UPDATE_PROFILE, payload);
  return data;
}
