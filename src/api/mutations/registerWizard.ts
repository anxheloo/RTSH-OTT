/**
 * Registration wizard mutations (server-driven steps). Thin wrappers over the
 * auth service — each sub-form orchestrates `onSuccess` / `onError` at the call
 * site (lift the returned step, log in on completion, map errors), since the
 * behavior differs per step.
 */
import { useMutation } from '@tanstack/react-query';

import {
  registerDetails,
  registerResendOtp,
  registerStart,
  registerVerifyOtp,
} from '../services/auth';

export const useRegisterStart = () => useMutation({ mutationFn: registerStart });
export const useRegisterVerifyOtp = () => useMutation({ mutationFn: registerVerifyOtp });
export const useRegisterDetails = () => useMutation({ mutationFn: registerDetails });
export const useRegisterResendOtp = () => useMutation({ mutationFn: registerResendOtp });
