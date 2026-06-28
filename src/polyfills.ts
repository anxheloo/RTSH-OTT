/**
 * Runtime polyfills — imported FIRST, at the top of the root `app/_layout.tsx`,
 * before any module that might need them.
 *
 * `TextEncoder` / `TextDecoder` — required by `@stomp/stompjs` (STOMP frame
 * encode/decode). Hermes on RN 0.85 ships them as native engine globals, so this
 * is **guarded insurance**: the pure-JS fallback is installed only when a global
 * is actually missing (a no-op on Hermes). Pure JS — no native code, no
 * autolinking, EAS-safe.
 */
import { TextDecoder, TextEncoder } from 'fastestsmallesttextencoderdecoder';

const g = globalThis as unknown as { TextEncoder?: unknown; TextDecoder?: unknown };

if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
