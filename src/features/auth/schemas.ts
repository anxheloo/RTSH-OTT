import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }).toLowerCase(),
  password: z.string().min(6, { error: 'Password must be at least 6 characters' }),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(2, { error: 'Name must be at least 2 characters' }).trim(),
    email: z.email({ error: 'Invalid email address' }).toLowerCase(),
    password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Invalid email address' }).toLowerCase(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
