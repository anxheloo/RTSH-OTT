/**
 * Maps an axios auth error to an inline form message. Resolution order:
 *   1. backend `code` (stable error key, e.g. `auth.invalid_old_password`) via `codeMap`
 *   2. HTTP `status` via `statusMap`
 *   3. backend `error` / `message` field
 *   4. generic fallback
 *
 * Prefer `codeMap` — `code` is the stable contract (`{ status, code, message }`),
 * whereas a bare status (400) is ambiguous across distinct failures.
 *
 * Returns `undefined` for *unexpected* failures (5xx, network/timeout with no
 * `status`, non-axios) — those are not field-actionable, so the form renders
 * nothing and the global `apiError` modal owns them instead. This 4xx boundary
 * is the inline mirror of `client.ts → isClientError`; keep the two in lock-step
 * so a request never shows both an inline message and a modal.
 */
import axios from 'axios';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export function authErrorMessage(
  err: unknown,
  statusMap?: Record<number, string>,
  codeMap?: Record<string, string>,
): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;

  const status = err.response?.status;
  // Only client (4xx) errors render inline; 5xx/network → modal.
  if (status === undefined || status >= 500) return undefined;

  const data = err.response?.data as { error?: string; message?: string; code?: string } | undefined;

  if (data?.code && codeMap?.[data.code]) return codeMap[data.code];
  if (statusMap?.[status]) return statusMap[status];
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  return DEFAULT_MESSAGE;
}
