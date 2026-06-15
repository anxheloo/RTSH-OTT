/**
 * Maps an axios auth error to a user-facing message. Resolution order:
 *   1. backend `code` (stable error key, e.g. `auth.invalid_old_password`) via `codeMap`
 *   2. HTTP `status` via `statusMap`
 *   3. backend `error` / `message` field
 *   4. generic fallback
 *
 * Prefer `codeMap` — `code` is the stable contract (`{ status, code, message }`),
 * whereas a bare status (400) is ambiguous across distinct failures.
 */
import axios from 'axios';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export function authErrorMessage(
  err: unknown,
  statusMap?: Record<number, string>,
  codeMap?: Record<string, string>,
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string; code?: string } | undefined;
    const status = err.response?.status;

    if (data?.code && codeMap?.[data.code]) return codeMap[data.code];
    if (status && statusMap?.[status]) return statusMap[status];
    if (data?.error) return data.error;
    if (data?.message) return data.message;
  }
  return DEFAULT_MESSAGE;
}
