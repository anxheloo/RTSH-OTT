import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }).toLowerCase(),
  password: z.string().min(6, { error: 'Password must be at least 6 characters' }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Invalid email address' }).toLowerCase(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/* ===========================================================================
 * Server-driven multi-step model (registration + password reset).
 *
 * Both flows are resumable, backend-driven wizards: every response carries the
 * COMPLETED step, and the client renders `completed + 1` (1 = start,
 * 2 = verify/OTP, 3 = completed). The step-1 form is always the entry point; on
 * re-entry the backend returns the real progress so the client jumps forward.
 * Step-3 registration returns the auth tokens → user is logged straight in.
 * =========================================================================== */

/** Completed-step codes returned by the backend. Client renders `completed + 1`. */
export const AUTH_STEP = { START: 1, VERIFY: 2, COMPLETED: 3 } as const;
export type AuthStep = (typeof AUTH_STEP)[keyof typeof AUTH_STEP];

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
    username: z.string({ error: 'auth.errors.username' }).trim().min(2, { error: 'auth.errors.username' }),
    password: z.string().min(8, { error: 'auth.errors.password_min' }),
    confirmPassword: z.string(),
    age: z
      .string()
      .min(1, { error: 'auth.errors.age_required' })
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 120;
      }, { error: 'auth.errors.age_invalid' }),
    location: z.string().trim().min(1, { error: 'auth.errors.location_required' }),
    gender: z.enum(REGISTER_GENDERS, { error: 'auth.errors.gender_required' }),
    acceptTerms: z.boolean().refine((v) => v === true, { error: 'auth.errors.terms_required' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: 'auth.errors.password_match',
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

/* ------------------------- Register · step 1 (start) ----------------------- */

export const registerCredentialsSchema = z
  .object({
    username: z.string().min(2, { error: 'Username must be at least 2 characters' }).trim(),
    email: z.email({ error: 'Invalid email address' }).toLowerCase(),
    password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterCredentialsData = z.infer<typeof registerCredentialsSchema>;

/* --------------------- OTP · step 2 (register + reset) --------------------- */

export const otpSchema = z.object({
  code: z.string().length(6, { error: 'Enter the 6-digit code' }),
});
export type OtpFormData = z.infer<typeof otpSchema>;

/* ----------------------- Register · step 3 (details) ----------------------- */

export const registerDetailsSchema = z.object({
  birthday: z.string().min(1, { error: 'Birthday is required' }), // ISO 'YYYY-MM-DD'
  gender: z.enum(GENDERS, { error: 'Select a gender' }),
  city: z.string().min(1, { error: 'City is required' }).trim(),
  country: z.string().min(1, { error: 'Country is required' }).trim(),
  education: z.string().trim().optional(),
});
export type RegisterDetailsData = z.infer<typeof registerDetailsSchema>;

/* ----------------------- Reset · step 3 (new password) --------------------- */

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, { error: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
