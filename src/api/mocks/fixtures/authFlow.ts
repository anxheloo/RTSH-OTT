/**
 * Mock backend for the auth flows: single-shot register → OTP verify
 * (returns tokens — auto-login), and the 3-step password reset
 * (request → verify → resetToken → new password). In-memory per-email records
 * make both flows fully navigable without a real backend; resend = re-firing
 * the original request (matches the real contract, which has no reset-resend).
 *
 * OTP rule (mock): any 6-digit code is accepted EXCEPT `000000`, which returns
 * 401 so the error path is testable.
 */
import { mockTokens, mockUserDto } from './auth';

type MockResponse = { status?: number; data: unknown };

interface PendingRegistration {
  username: string;
  birthDate?: string;
  city?: string;
  country?: string;
  gender?: string;
}

const registerDb = new Map<string, PendingRegistration>();
/** Emails with a live reset code. */
const resetDb = new Set<string>();
/** One-time reset-session tokens → email. */
const resetTokens = new Map<string, string>();

const WRONG_CODE = '000000';
const isValidOtp = (code: string): boolean => /^\d{6}$/.test(code) && code !== WRONG_CODE;
const normalize = (email: unknown): string => String(email ?? '').trim().toLowerCase();

/** Wire-shaped `UserDTO` built from the register-time submission. */
const buildRegisteredUserDto = (email: string, record: PendingRegistration) => ({
  ...mockUserDto,
  id: 2,
  email,
  username: record.username || mockUserDto.username,
  birthDate: record.birthDate ?? mockUserDto.birthDate,
  city: record.city ?? mockUserDto.city,
  country: record.country ?? mockUserDto.country,
  gender: record.gender ?? mockUserDto.gender,
});

/* ----------------------------- Registration ------------------------------- */

export function mockRegister(body: {
  email?: string;
  username?: string;
  birthDate?: string;
  city?: string;
  country?: string;
  gender?: string;
}): MockResponse {
  const email = normalize(body.email);
  if (!email) return { status: 400, data: { message: 'Email is required' } };

  registerDb.set(email, {
    username: String(body.username ?? ''),
    birthDate: body.birthDate,
    city: body.city,
    country: body.country,
    gender: body.gender,
  });
  return { data: { message: 'Verification code sent' } };
}

export function mockRegisterVerify(body: { email?: string; code?: string }): MockResponse {
  const email = normalize(body.email);
  const record = registerDb.get(email);
  if (!record) return { status: 404, data: { message: 'No pending registration' } };
  if (!isValidOtp(String(body.code ?? ''))) return { status: 401, data: { message: 'Invalid code' } };

  // Activated → LoginResponseDTO (auto-login on the client).
  return { data: { ...mockTokens, user: buildRegisteredUserDto(email, record) } };
}

/* ---------------------------- Password reset ------------------------------ */

export function mockResetRequest(body: { email?: string }): MockResponse {
  const email = normalize(body.email);
  if (!email) return { status: 400, data: { message: 'Email is required' } };
  resetDb.add(email);
  // Real endpoint always answers 202 (no account-existence oracle).
  return { status: 202, data: {} };
}

export function mockResetVerify(body: { email?: string; code?: string }): MockResponse {
  const email = normalize(body.email);
  if (!resetDb.has(email)) return { status: 404, data: { message: 'No pending reset' } };
  if (!isValidOtp(String(body.code ?? ''))) return { status: 401, data: { message: 'Invalid code' } };

  const resetToken = `mock-reset-token-${email}`;
  resetTokens.set(resetToken, email);
  return { data: { resetToken } };
}

export function mockResetPassword(body: {
  resetToken?: string;
  newPassword?: string;
}): MockResponse {
  const token = String(body.resetToken ?? '');
  const email = resetTokens.get(token);
  if (!email) return { status: 401, data: { message: 'Invalid or expired reset token' } };
  if (String(body.newPassword ?? '').length < 8) {
    return { status: 400, data: { message: 'Password must be at least 8 characters' } };
  }

  resetTokens.delete(token); // one-time token
  resetDb.delete(email);
  return { data: { message: 'Password reset successfully' } };
}
