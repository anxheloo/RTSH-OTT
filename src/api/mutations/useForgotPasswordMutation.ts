import { useMutation } from '@tanstack/react-query';

import * as authService from '../services/auth';

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authService.forgotPassword,
  });
}
