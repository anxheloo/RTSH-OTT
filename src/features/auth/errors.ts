/**
 * Maps an axios auth error to a user-facing message. Prefers the backend's
 * `error` field, then a per-status override, then a generic fallback. Plain
 * English for now — wrap with i18n once the auth copy lands.
 */
import axios from 'axios';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export function authErrorMessage(err: unknown, statusMap?: Record<number, string>): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status && statusMap?.[status]) return statusMap[status];
    const serverMessage = (err.response?.data as { error?: string } | undefined)?.error;
    if (serverMessage) return serverMessage;
  }
  return DEFAULT_MESSAGE;
}
