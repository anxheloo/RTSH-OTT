/**
 * Registration mutations (single-shot submit → OTP verify). Thin wrappers over
 * the auth service — the screen orchestrates `onSuccess` / `onError` at the
 * call site (advance step, persist tokens + log in on verify, map errors).
 */
import { useMutation } from '@tanstack/react-query';

import { INLINE_CLIENT_ERROR } from '../client';
import { register, registerResendOtp, registerVerifyOtp } from '../services/auth';

// 4xx errors render inline on the form / OTP screen; 5xx/network → global modal.
export const useRegister = () => useMutation({ mutationFn: register, meta: INLINE_CLIENT_ERROR });
export const useRegisterVerifyOtp = () =>
  useMutation({ mutationFn: registerVerifyOtp, meta: INLINE_CLIENT_ERROR });
export const useRegisterResendOtp = () =>
  useMutation({ mutationFn: registerResendOtp, meta: INLINE_CLIENT_ERROR });
