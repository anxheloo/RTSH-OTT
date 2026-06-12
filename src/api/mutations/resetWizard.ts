/**
 * Password-reset mutations (request code → verify code → set new password).
 * Thin wrappers over the auth service — the screen orchestrates `onSuccess` /
 * `onError` at the call site (advance step, carry the resetToken, map errors).
 * Resend has no dedicated endpoint: re-fire `useResetRequest` (replaces the
 * live code server-side).
 */
import { useMutation } from '@tanstack/react-query';

import { resetPassword, resetRequest, resetVerifyOtp } from '../services/auth';

export const useResetRequest = () => useMutation({ mutationFn: resetRequest });
export const useResetVerifyOtp = () => useMutation({ mutationFn: resetVerifyOtp });
export const useResetPassword = () => useMutation({ mutationFn: resetPassword });
