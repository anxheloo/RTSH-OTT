import axios from 'axios';

import type { User } from '@/types';
import { ENV } from '@/config/env';
import type { AuthStep, Gender } from '@/features/auth/schemas';

import { apiClient } from '../client';
import { AUTH_ROUTES } from '../endpoints';

export interface LoginPayload {
  email: string;
  password: string;
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

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await refreshClient.post<AuthResponse>(AUTH_ROUTES.REFRESH, { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post(AUTH_ROUTES.LOGOUT);
}

/* ===========================================================================
 * Server-driven multi-step wizards (registration + password reset).
 * Each step returns the COMPLETED step; the client renders `step + 1`.
 * =========================================================================== */

/** Response from any wizard step. `user` + tokens are present only on step-3 registration. */
export interface AuthStepResponse {
  step: AuthStep;
  email?: string;
  username?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterStartPayload {
  username: string;
  email: string;
  password: string;
  /**
   * Profile fields collected on the same (design) form as the credentials and
   * posted together at step 1 (decision 9). Optional on the type so a future
   * backend that splits creds → details still typechecks. `location` is the
   * design's combined "City / Country" field; reconcile to split city/country
   * when the real `/auth/register` contract lands.
   */
  age?: number;
  location?: string;
  gender?: Gender;
}

export interface OtpPayload {
  email: string;
  code: string;
}

export interface RegisterDetailsPayload {
  email: string;
  birthday: string;
  gender: Gender;
  city: string;
  country: string;
  education?: string;
}

export interface ResetPasswordPayload {
  email: string;
  newPassword: string;
}

/* ----------------------------- Registration ------------------------------- */

export async function registerStart(payload: RegisterStartPayload): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.REGISTER, payload);
  return data;
}

export async function registerVerifyOtp(payload: OtpPayload): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.REGISTER_VERIFY, payload);
  return data;
}

export async function registerDetails(payload: RegisterDetailsPayload): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.REGISTER_DETAILS, payload);
  return data;
}

export async function registerResendOtp(email: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.REGISTER_RESEND, { email });
}

/* ---------------------------- Password reset ------------------------------ */

export async function resetRequest(email: string): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.FORGOT_PASSWORD, { email });
  return data;
}

export async function resetVerifyOtp(payload: OtpPayload): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.RESET_VERIFY, payload);
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<AuthStepResponse> {
  const { data } = await apiClient.post<AuthStepResponse>(AUTH_ROUTES.RESET_PASSWORD, payload);
  return data;
}

export async function resetResendOtp(email: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.RESET_RESEND, { email });
}
