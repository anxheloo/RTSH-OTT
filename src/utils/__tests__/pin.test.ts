/**
 * Unit tests for the parental-PIN hashing helpers. expo-crypto is a native
 * module, so its digest is emulated with Node's crypto — same SHA-256
 * semantics, which is what verifyPin's contract depends on.
 */
import { hashPin, verifyPin } from '../pin';

jest.mock('expo-crypto', () => {
  // Required lazily inside the factory — jest.mock hoists above imports, so an
  // out-of-scope binding isn't allowed here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('crypto') as typeof import('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, data: string) =>
      createHash('sha256').update(data).digest('hex'),
  };
});

describe('hashPin / verifyPin', () => {
  it('round-trips: a stored hash verifies against the same PIN', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('1234', hash)).resolves.toBe(true);
  });

  it('rejects a wrong PIN', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('4321', hash)).resolves.toBe(false);
  });

  it('never stores the raw digits (hash ≠ input, hex-shaped)', async () => {
    const hash = await hashPin('123456');
    expect(hash).not.toContain('123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
