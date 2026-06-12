/**
 * Auth services — matched to the end-user OpenAPI contract (2026-06-12).
 *
 * Flows:
 *   login            → POST /auth/login {email, password} → {user, accessToken, refreshToken}
 *   refresh          → POST /auth/refresh {refreshToken} → {accessToken} (no user, no rotation)
 *   logout           → POST /auth/logout {refreshToken} (revokes that session's token)
 *   register         → POST /auth/register (single-shot, ALL profile data) → 200 message
 *   register verify  → POST /auth/register/verify {email, code} → tokens (auto-login)
 *   reset            → forgot-password → reset-password/verify → {resetToken} → reset-password
 *
 * Responses that feed the session are Zod-parsed at this boundary (5.X.2);
 * `confirmPassword` never leaves the client.
 */
import axios from 'axios';

import type { User } from '@/types';
import {
  authResponseSchema,
  refreshResponseSchema,
  resetVerifyResponseSchema,
  toGenderDto,
} from '@/types';
import type { Gender } from '@/features/auth/schemas';

import { API_BASE_URL, apiClient } from '../client';
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
export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post(AUTH_ROUTES.LOGIN, payload);
  // Validate before the caller persists the refresh token / logs in (5.X.2).
  return authResponseSchema.parse(data);
}

/** Exchanges the (static) refresh token for a fresh access token. */
export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const { data } = await refreshClient.post(AUTH_ROUTES.REFRESH, { refreshToken });
  // A malformed refresh response throws here → treated as a transient failure
  // by `refreshAccessToken` (no keychain wipe), so the session survives.
  return refreshResponseSchema.parse(data);
}

/** Revokes this session's refresh token server-side. Local wipe is the caller's job. */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.LOGOUT, { refreshToken });
}

/* ----------------------------- Registration ------------------------------- */

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  birthDate: string; // ISO 'YYYY-MM-DD' (backend-required)
  city: string;
  country: string;
  gender: Gender;
  acceptTerms: boolean;
}

export interface OtpPayload {
  email: string;
  code: string;
}

/** Single-shot register — saves a pending account and emails the OTP. */
export async function register(payload: RegisterPayload): Promise<void> {
  // Wire mapping (RegisterRequestDTO): gender → UPPERCASE enum, acceptTerms → termsAccepted.
  const { acceptTerms, ...rest } = payload;
  await apiClient.post(AUTH_ROUTES.REGISTER, {
    ...rest,
    gender: toGenderDto(payload.gender),
    termsAccepted: acceptTerms,
  });
}

/** Verifies the emailed code — activates the account and returns tokens (auto-login). */
export async function registerVerifyOtp(payload: OtpPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post(AUTH_ROUTES.REGISTER_VERIFY, payload);
  return authResponseSchema.parse(data);
}

export async function registerResendOtp(email: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.REGISTER_RESEND, { email });
}

/* ---------------------------- Password reset ------------------------------ */

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

/** Emails a one-time reset code (always 202). Re-call to resend — replaces the live code. */
export async function resetRequest(email: string): Promise<void> {
  await apiClient.post(AUTH_ROUTES.FORGOT_PASSWORD, { email });
}

/** Verifies the reset code → one-time reset-session token for the final step. */
export async function resetVerifyOtp(payload: OtpPayload): Promise<{ resetToken: string }> {
  const { data } = await apiClient.post(AUTH_ROUTES.RESET_VERIFY, payload);
  return resetVerifyResponseSchema.parse(data);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiClient.post(AUTH_ROUTES.RESET_PASSWORD, payload);
}
