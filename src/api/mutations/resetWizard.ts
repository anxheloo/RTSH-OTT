/**
 * Password-reset mutations (request code → verify code → set new password).
 * Thin wrappers over the auth service — the screen orchestrates `onSuccess` /
 * `onError` at the call site (advance step, carry the resetToken, map errors).
 * Resend has no dedicated endpoint: re-fire `useResetRequest` (replaces the
 * live code server-side).
 */
import { useMutation } from '@tanstack/react-query';

import { INLINE_CLIENT_ERROR } from '../client';
import { resetPassword, resetRequest, resetVerifyOtp } from '../services/auth';

// 4xx errors render inline on each wizard step; 5xx/network → global modal.
export const useResetRequest = () => useMutation({ mutationFn: resetRequest, meta: INLINE_CLIENT_ERROR });
export const useResetVerifyOtp = () =>
  useMutation({ mutationFn: resetVerifyOtp, meta: INLINE_CLIENT_ERROR });
export const useResetPassword = () => useMutation({ mutationFn: resetPassword, meta: INLINE_CLIENT_ERROR });
