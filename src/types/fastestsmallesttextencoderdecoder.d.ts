/**
 * Minimal ambient types for `fastestsmallesttextencoderdecoder` (ships no `.d.ts`).
 * Only the named `TextEncoder` / `TextDecoder` constructors are used (see
 * `src/polyfills.ts`); they match the standard Web API shapes.
 */
declare module 'fastestsmallesttextencoderdecoder' {
  export const TextEncoder: { new (): TextEncoder };
  export const TextDecoder: { new (label?: string): TextDecoder };
  export function encode(input?: string): Uint8Array;
  export function decode(input?: ArrayBufferView | ArrayBuffer): string;
}
