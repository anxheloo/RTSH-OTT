/**
 * Mock backend for the server-driven multi-step auth wizards (register + reset).
 *
 * Tracks per-email progress in memory so the flow is fully navigable without a
 * real backend: every step returns the COMPLETED step (`step`), and the client
 * renders `step + 1`. Resume works — re-submitting step 1 returns the real
 * progress, so the client jumps forward.
 *
 * OTP rule (mock): any 6-digit code is accepted EXCEPT `000000`, which returns
 * 401 so the error path is testable.
 *
 * Swapped out for the real endpoints later (see plan 11.X.9).
 */
import { mockAuthResponse, mockUser } from './auth';

type MockResponse = { status?: number; data: unknown };
type CompletedStep = 0 | 1 | 2 | 3;

interface RegisterRecord {
  username: string;
  completedStep: CompletedStep;
}

const registerDb = new Map<string, RegisterRecord>();
const resetDb = new Map<string, { completedStep: CompletedStep }>();

const WRONG_CODE = '000000';
const isValidOtp = (code: string): boolean => /^\d{6}$/.test(code) && code !== WRONG_CODE;
const normalize = (email: unknown): string => String(email ?? '').trim().toLowerCase();

const tokens = {
  accessToken: mockAuthResponse.accessToken,
  refreshToken: mockAuthResponse.refreshToken,
};

/* ----------------------------- Registration ------------------------------- */

export function mockRegisterStart(body: { email?: string; username?: string }): MockResponse {
  const email = normalize(body.email);
  if (!email) return { status: 400, data: { error: 'Email is required' } };

  const existing = registerDb.get(email);

  // Fully registered already → return tokens so the client logs straight in.
  if (existing?.completedStep === 3) {
    const user = { ...mockUser, id: `user-${email}`, email, displayName: existing.username };
    return { data: { step: 3, email, username: existing.username, user, ...tokens } };
  }

  // OTP already verified → jump the client to step 3 (details).
  if (existing?.completedStep === 2) {
    return { data: { step: 2, email, username: existing.username } };
  }

  // New or awaiting OTP → (re)send OTP, mark step 1 completed.
  const username = String(body.username ?? existing?.username ?? '');
  registerDb.set(email, { username, completedStep: 1 });
  return { data: { step: 1, email } };
}

export function mockRegisterVerify(body: { email?: string; code?: string }): MockResponse {
  const email = normalize(body.email);
  const record = registerDb.get(email);
  if (!record) return { status: 404, data: { error: 'No pending registration' } };
  if (!isValidOtp(String(body.code ?? ''))) return { status: 401, data: { error: 'Invalid code' } };

  record.completedStep = 2;
  return { data: { step: 2, email, username: record.username } };
}

export function mockRegisterDetails(body: { email?: string }): MockResponse {
  const email = normalize(body.email);
  const record = registerDb.get(email);
  if (!record) return { status: 404, data: { error: 'No pending registration' } };

  record.completedStep = 3;
  const user = { ...mockUser, id: `user-${email}`, email, displayName: record.username };
  return { data: { step: 3, email, username: record.username, user, ...tokens } };
}

/* ---------------------------- Password reset ------------------------------ */

export function mockResetRequest(body: { email?: string }): MockResponse {
  const email = normalize(body.email);
  if (!email) return { status: 400, data: { error: 'Email is required' } };
  resetDb.set(email, { completedStep: 1 });
  return { data: { step: 1, email } };
}

export function mockResetVerify(body: { email?: string; code?: string }): MockResponse {
  const email = normalize(body.email);
  const record = resetDb.get(email);
  if (!record) return { status: 404, data: { error: 'No pending reset' } };
  if (!isValidOtp(String(body.code ?? ''))) return { status: 401, data: { error: 'Invalid code' } };

  record.completedStep = 2;
  return { data: { step: 2, email } };
}

export function mockResetPassword(body: { email?: string }): MockResponse {
  const email = normalize(body.email);
  const record = resetDb.get(email);
  if (!record) return { status: 404, data: { error: 'No pending reset' } };

  record.completedStep = 3;
  return { data: { step: 3, email, success: true } };
}
