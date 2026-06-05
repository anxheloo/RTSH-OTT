/**
 * Password-reset wizard mutations (server-driven steps). Thin wrappers over the
 * auth service — each sub-form orchestrates `onSuccess` / `onError` at the call
 * site (lift the returned step, map errors).
 */
import { useMutation } from '@tanstack/react-query';

import {
  resetPassword,
  resetRequest,
  resetResendOtp,
  resetVerifyOtp,
} from '../services/auth';

export const useResetRequest = () => useMutation({ mutationFn: resetRequest });
export const useResetVerifyOtp = () => useMutation({ mutationFn: resetVerifyOtp });
export const useResetPassword = () => useMutation({ mutationFn: resetPassword });
export const useResetResendOtp = () => useMutation({ mutationFn: resetResendOtp });
