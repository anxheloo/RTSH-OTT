/**
 * PIN hashing helpers using expo-crypto (SHA-256 + random UUID salt).
 * Salt is generated per PIN-set operation and stored alongside the hash
 * in keychain so rainbow tables are useless against the 10,000-entry space.
 */
import * as Crypto from 'expo-crypto';

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = Crypto.randomUUID();
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + salt,
  );
  return { hash, salt };
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const computed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + salt,
  );
  return computed === hash;
}
