/**
 * Stateful mock for the per-account parental PIN (plan 22.14b). Mirrors the
 * backend's role as source of truth: holds the PIN in memory (resets on
 * reload), verifies a candidate, and clears it. The real backend KDF-hashes
 * the PIN + enforces server-side attempt lockout — this is a dev/test stand-in.
 */
let pin: string | null = null;

export function setMockParentalPin(next: string | undefined): void {
  pin = next ?? null;
}

export function verifyMockParentalPin(candidate: string | undefined): boolean {
  return !!candidate && candidate === pin;
}

export function clearMockParentalPin(): void {
  pin = null;
}

export function isMockParentalPinSet(): boolean {
  return pin !== null;
}
