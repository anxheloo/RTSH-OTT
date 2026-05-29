/**
 * Zod-validated environment config. Throws at boot if any required var is missing or invalid.
 * All vars must be prefixed EXPO_PUBLIC_ to be available in the JS bundle.
 */
import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url({ message: 'EXPO_PUBLIC_API_BASE_URL must be a valid URL' }),
  EXPO_PUBLIC_API_MODE: z.enum(['mock', 'dev', 'staging', 'prod']),
  EXPO_PUBLIC_ENV: z.enum(['development', 'preview', 'production']),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Missing or invalid environment variables:\n${issues}`);
}

export const ENV = parsed.data;
