import axios from 'axios';

import type { User } from '@/types';
import { ENV } from '@/config/env';

import { apiClient } from '../client';
import { AUTH_ROUTES } from '../endpoints';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Bare axios instance for the refresh endpoint only. Bypasses the 401
 * interceptor in `apiClient` to avoid a refresh-loop deadlock when the
 * refresh request itself returns 401.
 */
const refreshClient = axios.create({
  baseURL: ENV.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ROUTES.LOGIN, payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ROUTES.REGISTER, payload);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await refreshClient.post<AuthResponse>(AUTH_ROUTES.REFRESH, { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post(AUTH_ROUTES.LOGOUT);
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.FORGOT_PASSWORD, { email });
}
