import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'auth.errors.email' }).toLowerCase(),
  password: z.string().min(8, { error: 'auth.errors.password_min' }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'auth.errors.email' }).toLowerCase(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/* ===========================================================================
 * Multi-step flows (registration + password reset) — client-driven steps.
 *
 * Register: one form posts ALL profile data → OTP verify returns tokens
 * (auto-login). Reset: email → OTP verify (returns a one-time resetToken) →
 * new password. The backend responses carry no step field; each screen owns
 * its local step state.
 * =========================================================================== */

export const GENDERS = ['male', 'female', 'other', 'unspecified'] as const;
export type Gender = (typeof GENDERS)[number];

/** Gender options shown on the design's register form (omits `unspecified`). */
export const REGISTER_GENDERS = ['male', 'female', 'other'] as const;

/* -------------------- Register · single-page form (design) ----------------- *
 * The designer flow collapses credentials + profile details into ONE form
 * shown before OTP (decision 9). Field error messages are i18n keys, resolved
 * with `t()` at the call site (RTSH pattern). The wizard still posts everything
 * at step 1, then verifies via OTP — see `RegisterStartPayload`.
 * --------------------------------------------------------------------------- */

export const registerSchema = z
  .object({
    email: z.email({ error: 'auth.errors.email' }).toLowerCase(),
    username: z.string({ error: 'auth.errors.username' }).trim().min(3, { error: 'auth.errors.username' }),
    password: z
      .string()
      .min(8, { error: 'auth.errors.password_min' })
      .max(30, { error: 'auth.errors.password_max' }),
    confirmPassword: z.string(),
    // Backend-required ISO date; the input collects 'YYYY-MM-DD' as text.
    birthDate: z
      .string()
      .min(1, { error: 'auth.errors.birthday_required' })
      .refine((v) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
        const d = new Date(v);
        return !Number.isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900;
      }, { error: 'auth.errors.birthday_invalid' }),
    city: z.string().trim().min(1, { error: 'auth.errors.city_required' }),
    country: z.string().trim().min(1, { error: 'auth.errors.country_required' }),
    gender: z.enum(REGISTER_GENDERS, { error: 'auth.errors.gender_required' }),
    acceptTerms: z.boolean().refine((v) => v === true, { error: 'auth.errors.terms_required' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: 'auth.errors.password_match',
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

/* --------------------- OTP · step 2 (register + reset) --------------------- */

export const otpSchema = z.object({
  code: z.string().length(6, { error: 'auth.errors.otp_length' }),
});
export type OtpFormData = z.infer<typeof otpSchema>;

/* ----------------------- Reset · step 3 (new password) --------------------- */

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, { error: 'auth.errors.password_min' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    error: 'auth.errors.password_match',
    path: ['confirmPassword'],
  });
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

/* --------------------- Change password (authenticated) --------------------- *
 * `POST /users/me/change-password`. `oldPassword` is verified server-side;
 * `logoutOtherDevices` optionally kills other sessions in the same call.
 * --------------------------------------------------------------------------- */

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, { error: 'auth.errors.password_required' }),
    newPassword: z
      .string()
      .min(8, { error: 'auth.errors.password_min' })
      .max(30, { error: 'auth.errors.password_max' }),
    confirmPassword: z.string(),
    logoutOtherDevices: z.boolean(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    error: 'auth.errors.password_match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.oldPassword, {
    error: 'auth.errors.password_unchanged',
    path: ['newPassword'],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
