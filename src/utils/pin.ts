/**
 * Device parental PIN utilities. The PIN is content gating (not a credential)
 * but we still store a SHA-256 hash so the raw digit string never touches MMKV.
 * Verification is always local — no network, no hashing-per-request overhead.
 */
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

/** Hash a raw PIN string → hex SHA-256. Store the result, not the raw PIN. */
export async function hashPin(pin: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, pin);
}

/** Compare a raw candidate PIN against a stored hash. */
export async function verifyPin(candidate: string, storedHash: string): Promise<boolean> {
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, candidate);
  return hash === storedHash;
}