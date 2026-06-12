/**
 * Registration mutations (single-shot submit → OTP verify). Thin wrappers over
 * the auth service — the screen orchestrates `onSuccess` / `onError` at the
 * call site (advance step, persist tokens + log in on verify, map errors).
 */
import { useMutation } from '@tanstack/react-query';

import { register, registerResendOtp, registerVerifyOtp } from '../services/auth';

export const useRegister = () => useMutation({ mutationFn: register });
export const useRegisterVerifyOtp = () => useMutation({ mutationFn: registerVerifyOtp });
export const useRegisterResendOtp = () => useMutation({ mutationFn: registerResendOtp });
